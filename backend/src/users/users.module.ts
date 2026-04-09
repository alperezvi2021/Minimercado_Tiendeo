import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { WaitersController } from './waiters.controller';
import { WaitersService } from './waiters.service';
import { User } from './entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [UsersController, WaitersController],
  providers: [UsersService, WaitersService],
  exports: [UsersService, WaitersService],
})
export class UsersModule {}
