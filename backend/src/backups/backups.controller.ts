import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { BackupsService } from './backups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

@Controller('backups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Get()
  findAll() {
    return this.backupsService.listBackups();
  }

  @Post()
  create() {
    return this.backupsService.createBackup();
  }

  @Get(':filename/download')
  async getDownloadUrl(@Param('filename') filename: string) {
    const url = await this.backupsService.getDownloadUrl(filename);
    return { url };
  }

  @Delete(':filename')
  remove(@Param('filename') filename: string) {
    return this.backupsService.deleteBackup(filename);
  }
}
