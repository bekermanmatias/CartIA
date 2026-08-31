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

  async payload(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { locationMemberships: { include: { location: true }, take: 1 } },
    });
    if (!user || user.status !== 'ACTIVE') throw new UnauthorizedException('Debes iniciar sesión.');
    const membership = user.locationMemberships[0];
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.platformAdmin ? 'superadmin' : 'location_admin',
      locationId: membership?.locationId ?? null,
      restaurant_name: membership?.location.name ?? null,
      restaurant_slug: membership?.location.slug ?? null,
    };
  }
}
