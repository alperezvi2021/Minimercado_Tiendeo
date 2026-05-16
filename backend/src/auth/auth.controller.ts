import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UseGuards, Request } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('login')
  async login(@Body() loginDto: Record<string, any>) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Post('register')
  async register(@Body() registerDto: Record<string, any>) {
    try {
      return await this.authService.register(registerDto);
    } catch (error: any) {
      throw new UnauthorizedException(error.message);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('switch')
  async switchTenant(@Request() req, @Body() body: { tenantId: string }) {
    const user = await this.authService.validateSwitch(req.user.email, body.tenantId);
    if (!user) {
      throw new UnauthorizedException('Access to business denied');
    }
    return this.authService.login(user);
  }
}
