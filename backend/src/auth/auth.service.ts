import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { TenantsService } from '../tenants/tenants.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private tenantsService: TenantsService,
    private jwtService: JwtService
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (user && await bcrypt.compare(pass, user.passwordHash)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { email: user.email, sub: user.id, tenantId: user.tenantId, role: user.role, name: user.name };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        tenant_modules: user.tenant?.modules || []
      }
    };
  }

  async register(registerDto: Record<string, any>) {
    const existing = await this.usersService.findByEmail(registerDto.email);
    if (existing) {
      throw new Error('El correo electrónico ya está registrado');
    }
    // 1. Create Tenant
    const tenant = await this.tenantsService.create(registerDto.storeName, registerDto.modules);
    
    // 2. Hash Password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    // 3. Create User linked to Tenant
    const user = await this.usersService.create({
      tenantId: tenant.id,
      name: registerDto.userName,
      email: registerDto.email,
      passwordHash,
      role: 'OWNER'
    });

    // 4. Return Login Token
    return this.login(user);
  }
}
