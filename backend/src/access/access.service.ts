import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationRole, LocationRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const organizationRoles: OrganizationRole[] = ['OWNER', 'ADMIN', 'ANALYST'];
const locationRoles: LocationRole[] = ['MANAGER', 'STAFF', 'VIEWER'];
export type Permission =
  | 'organization.read' | 'organization.update' | 'organization.users.read' | 'organization.users.manage'
  | 'location.read' | 'location.manage' | 'menu.read' | 'menu.manage' | 'tables.manage'
  | 'requests.read' | 'requests.resolve' | 'analytics.read';

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

  async requireOrganization(userId: string, organizationId: string, permission: Permission) {
    const actor = await this.actor(userId);
    if (!actor.platformAdmin && !this.can(actor, 'organization', permission, organizationId)) throw new ForbiddenException('No tienes permisos sobre esta empresa.');
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId } });
    if (!organization) throw new NotFoundException('Empresa no encontrada.');
    return organization;
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

  async requireLocation(userId: string, locationId: string, permission: Permission) {
    const actor = await this.actor(userId);
    const location = await this.prisma.location.findUnique({ where: { id: locationId } });
    if (!location) throw new NotFoundException('Sucursal no encontrada.');
    if (location.status !== 'ACTIVE' && permission !== 'location.read') throw new ForbiddenException('La sucursal no está activa.');
    const organizationMembership = actor.organizationMemberships.find((item) => item.organizationId === location.organizationId);
    const organizationWide = organizationMembership && ['OWNER', 'ADMIN'].includes(organizationMembership.role);
    if (!actor.platformAdmin && !organizationWide && !this.can(actor, 'location', permission, locationId)) throw new ForbiddenException('No tienes permisos sobre esta sucursal.');
    return location;
  }

  async activeLocation(userId: string, requestedId?: string) {
    const actor = await this.actor(userId);
    const id = requestedId ?? undefined;
    if (id) return this.requireLocation(userId, id, 'location.read');
    const first = actor.locationMemberships[0];
    if (first) return this.requireLocation(userId, first.locationId, 'location.read');
    const firstOrg = actor.organizationMemberships[0];
    if (firstOrg) {
      const location = await this.prisma.location.findFirst({ where: { organizationId: firstOrg.organizationId } });
      if (!location) throw new NotFoundException('La empresa no tiene sucursales.');
      return this.requireLocation(userId, location.id, 'location.read');
    }
    throw new ForbiddenException('El usuario no tiene sucursales asignadas.');
  }

  can(actor: { platformAdmin: boolean; organizationMemberships: { organizationId: string; role: OrganizationRole }[]; locationMemberships: { locationId: string; role: LocationRole }[] }, resource: 'organization' | 'location', permission: Permission, resourceId: string) {
    if (actor.platformAdmin) return true;
    if (resource === 'organization') {
      const membership = actor.organizationMemberships.find((item) => item.organizationId === resourceId);
      if (!membership) return false;
      if (membership.role === 'OWNER') return true;
      if (membership.role === 'ADMIN') return true;
      return permission === 'organization.read' || permission === 'analytics.read';
    }
    const membership = actor.locationMemberships.find((item) => item.locationId === resourceId);
    if (!membership) {
      // Organization owners/admins are checked by the caller after resolving the location.
      return false;
    }
    if (membership.role === 'MANAGER') return ['location.read', 'location.manage', 'menu.read', 'menu.manage', 'tables.manage', 'requests.read', 'requests.resolve', 'analytics.read'].includes(permission);
    if (membership.role === 'STAFF') return ['location.read', 'menu.read', 'requests.read', 'requests.resolve'].includes(permission);
    return ['location.read', 'menu.read', 'requests.read', 'analytics.read'].includes(permission);
  }

  canManageUsers(actor: { platformAdmin: boolean; organizationMemberships: { organizationId: string; role: OrganizationRole }[] }, organizationId: string) {
    return actor.platformAdmin || actor.organizationMemberships.some((item) => item.organizationId === organizationId && ['OWNER', 'ADMIN'].includes(item.role));
  }
}
