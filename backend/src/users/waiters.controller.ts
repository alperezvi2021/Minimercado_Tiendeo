import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { WaitersService } from './waiters.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('waiters')
@UseGuards(JwtAuthGuard)
export class WaitersController {
  constructor(private readonly waitersService: WaitersService) {}

  @Get()
  async findAll(@Request() req) {
    return this.waitersService.findAll(req.user.tenantId);
  }

  @Post()
  async create(@Request() req, @Body() body: { name: string; pin: string }) {
    return this.waitersService.create(req.user.tenantId, body.name, body.pin);
  }

  @Post('validate-pin')
  async validatePin(@Request() req, @Body() body: { pin: string }) {
    return this.waitersService.validatePin(req.user.tenantId, body.pin);
  }

  @Post(':id/pin')
  async updatePin(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { pin: string },
  ) {
    return this.waitersService.updatePin(req.user.tenantId, id, body.pin);
  }

  @Patch(':id')
  async update(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { name?: string; pin?: string },
  ) {
    return this.waitersService.update(req.user.tenantId, id, body);
  }

  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    return this.waitersService.delete(req.user.tenantId, id);
  }
}
