import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async validate(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (!user || user.status !== 'ACTIVE' || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Email o contraseña incorrectos.');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return user;
  }

  async payload(userId: string, activeLocationId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { locationMemberships: { include: { location: true } }, organizationMemberships: { include: { organization: true } } },
    });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Debes iniciar sesión.');
    const locationMembership = user.locationMemberships.find((item) => item.locationId === activeLocationId) ?? user.locationMemberships[0];
    const organizationMembership = user.organizationMemberships.find((item) => item.role === 'OWNER') ?? user.organizationMemberships[0];
    const role = user.platformAdmin ? 'superadmin' : organizationMembership?.role === 'OWNER' ? 'owner' : organizationMembership?.role === 'ADMIN' ? 'organization_admin' : locationMembership?.role?.toLowerCase() ?? 'viewer';
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
      organizations: user.organizationMemberships.map((item) => ({ id: item.organizationId, name: item.organization.name, role: item.role })),
      locations: user.locationMemberships.map((item) => ({ id: item.locationId, name: item.location.name, slug: item.location.slug, role: item.role, organizationId: item.location.organizationId })),
      locationId: locationMembership?.locationId ?? null,
      restaurant_name: locationMembership?.location.name ?? null,
      restaurant_slug: locationMembership?.location.slug ?? null,
    };
  }
}
