import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationRole, LocationRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const organizationRoles: OrganizationRole[] = ['OWNER', 'ADMIN', 'ANALYST'];
const locationRoles: LocationRole[] = ['MANAGER', 'STAFF', 'VIEWER'];

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async actor(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { organizationMemberships: true, locationMemberships: true } });
    if (!user || user.status !== UserStatus.ACTIVE) throw new ForbiddenException('El usuario no está activo.');
    return user;
  }

  async organization(userId: string, organizationId: string, minimum: OrganizationRole[] = organizationRoles) {
    const actor = await this.actor(userId);
    if (actor.platformAdmin) return this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId } });
    const membership = actor.organizationMemberships.find((item) => item.organizationId === organizationId);
    if (!membership || !minimum.includes(membership.role)) throw new ForbiddenException('No tienes permisos sobre esta empresa.');
    return this.prisma.organization.findUnique({ where: { id: organizationId } }).then((organization) => organization ?? Promise.reject(new NotFoundException('Empresa no encontrada.')));
  }

  async location(userId: string, locationId: string, minimum: LocationRole[] = locationRoles) {
    const actor = await this.actor(userId);
    const location = await this.prisma.location.findUnique({ where: { id: locationId } });
    if (!location) throw new NotFoundException('Sucursal no encontrada.');
    if (actor.platformAdmin) return location;
    const orgMembership = actor.organizationMemberships.find((item) => item.organizationId === location.organizationId);
    const locationMembership = actor.locationMemberships.find((item) => item.locationId === locationId);
    if (!orgMembership && !locationMembership) throw new ForbiddenException('No tienes acceso a esta sucursal.');
    if (orgMembership?.role === 'OWNER' || orgMembership?.role === 'ADMIN') return location;
    if (!locationMembership || !minimum.includes(locationMembership.role)) throw new ForbiddenException('No tienes permisos sobre esta sucursal.');
    return location;
  }

  async activeLocation(userId: string, requestedId?: string) {
    const actor = await this.actor(userId);
    const id = requestedId ?? undefined;
    if (id) return this.location(userId, id);
    const first = actor.locationMemberships[0];
    if (first) return this.location(userId, first.locationId);
    const firstOrg = actor.organizationMemberships[0];
    if (firstOrg) return this.prisma.location.findFirstOrThrow({ where: { organizationId: firstOrg.organizationId } });
    throw new ForbiddenException('El usuario no tiene sucursales asignadas.');
  }

  canManageUsers(actor: { platformAdmin: boolean; organizationMemberships: { organizationId: string; role: OrganizationRole }[] }, organizationId: string) {
    return actor.platformAdmin || actor.organizationMemberships.some((item) => item.organizationId === organizationId && ['OWNER', 'ADMIN'].includes(item.role));
  }
}
