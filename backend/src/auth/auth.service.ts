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
    private jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const users = await this.usersService.findManyByEmail(email);
    if (users.length === 0) return null;

    let authenticatedUser = null;
    for (const u of users) {
      if (await bcrypt.compare(pass, u.passwordHash)) {
        authenticatedUser = u;
        break;
      }
    }

    if (authenticatedUser) {
      if (authenticatedUser.tenant && authenticatedUser.tenant.isActive === false) {
        throw new UnauthorizedException(
          'Lo sentimos, su cuenta ha sido suspendida. Contacte al administrador',
        );
      }
      const { passwordHash, ...result } = authenticatedUser;
      // Add all associated tenants to the result
      return { 
        ...result, 
        availableTenants: users.map(u => ({ 
          userId: u.id, 
          tenantId: u.tenantId, 
          tenantName: u.tenant?.name, 
          role: u.role 
        })) 
      };
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      tenantId: user.tenantId,
      role: user.role,
      name: user.name,
    };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        availableTenants: user.availableTenants || [],
        tenant_modules:
          user.modules && user.modules.length > 0
            ? user.modules
            : user.tenant?.modules && user.tenant.modules.length > 0
            ? user.tenant.modules
            : [
                'POS',
                'CLOSURE',
                'INVENTORY',
                'REPORTS',
                'SUPPLIERS',
                'CUSTOMERS',
                'CREDITS',
                'REFUNDS',
                'ACCOUNTING',
              ],
      },
    };
  }

  async register(registerDto: Record<string, any>) {
    // If existing, we just continue to create a new Tenant and link the same email to it.
    // This supports the multi-tenant switching feature.
    // 1. Create Tenant
    const tenant = await this.tenantsService.create(
      registerDto.storeName,
      registerDto.modules,
    );

    // 2. Hash Password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(registerDto.password, saltRounds);

    // 3. Create User linked to Tenant
    const user = await this.usersService.create({
      tenantId: tenant.id,
      name: registerDto.userName,
      email: registerDto.email,
      passwordHash,
      role: 'OWNER',
    });

    // 4. Return Login Token
    return this.login(user);
  }

  async validateSwitch(email: string, tenantId: string): Promise<any> {
    const users = await this.usersService.findManyByEmail(email);
    const user = users.find((u) => u.tenantId === tenantId);

    if (user) {
      if (user.tenant && user.tenant.isActive === false) {
        throw new UnauthorizedException(
          'Lo sentimos, este negocio ha sido suspendido.',
        );
      }
      const { passwordHash, ...result } = user;
      return {
        ...result,
        availableTenants: users.map((u) => ({
          userId: u.id,
          tenantId: u.tenantId,
          tenantName: u.tenant?.name,
          role: u.role,
        })),
      };
    }
    return null;
  }
}
