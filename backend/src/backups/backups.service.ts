import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as Minio from 'minio';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execPromise = promisify(exec);

@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);
  private minioClient: Minio.Client;
  private readonly bucketName = 'database-backups';

  constructor(private configService: ConfigService) {
    this.minioClient = new Minio.Client({
      endPoint: this.configService.get('MINIO_ENDPOINT', 'minio'),
      port: parseInt(this.configService.get('MINIO_PORT', '9000')),
      useSSL: false,
      accessKey: this.configService.get('MINIO_ACCESS_KEY', 'minioadmin'),
      secretKey: this.configService.get('MINIO_SECRET_KEY', 'minioadmin123'),
    });
    this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    try {
      const exists = await this.minioClient.bucketExists(this.bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(this.bucketName);
        this.logger.log(`Bucket ${this.bucketName} created.`);
      }
    } catch (error) {
      this.logger.error('Error ensuring bucket exists:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleCron() {
    this.logger.log('Starting scheduled daily backup...');
    await this.createBackup();
  }

  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.sql`;
    const tempPath = path.join('/tmp', fileName);

    const dbUser = this.configService.get('DB_USER', 'postgres');
    const dbPass = this.configService.get('DB_PASSWORD', 'password123');
    const dbHost = this.configService.get('DB_HOST', 'db');
    const dbName = this.configService.get('DB_NAME', 'tiendeo');

    try {
      this.logger.log(`Generating dump: ${fileName}`);
      // PGPASSWORD is used to avoid interactive prompt
      await execPromise(
        `PGPASSWORD="${dbPass}" pg_dump -h ${dbHost} -U ${dbUser} -d ${dbName} -f ${tempPath}`,
      );

      this.logger.log(`Uploading to Minio: ${fileName}`);
      await this.minioClient.fPutObject(this.bucketName, fileName, tempPath);

      // Clean up temp file
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }

      this.logger.log('Backup completed successfully.');
      return fileName;
    } catch (error) {
      this.logger.error('Backup failed:', error);
      throw error;
    }
  }

  async listBackups() {
    return new Promise((resolve, reject) => {
      const backups: any[] = [];
      const stream = this.minioClient.listObjectsV2(this.bucketName, '', true);
      stream.on('data', (obj) => backups.push(obj));
      stream.on('error', (err) => reject(err));
      stream.on('end', () =>
        resolve(
          backups.sort(
            (a, b) => b.lastModified.getTime() - a.lastModified.getTime(),
          ),
        ),
      );
    });
  }

  async getDownloadUrl(fileName: string): Promise<string> {
    return await this.minioClient.presignedGetObject(
      this.bucketName,
      fileName,
      24 * 60 * 60,
    ); // 24h
  }

  async deleteBackup(fileName: string): Promise<void> {
    await this.minioClient.removeObject(this.bucketName, fileName);
  }
}
