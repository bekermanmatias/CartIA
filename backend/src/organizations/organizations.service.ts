import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrganizationRole, LocationRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { AccessService } from '../access/access.service';
import { PrismaService } from '../prisma/prisma.service';
import { publicLocationUrl, reservedLocationSlugs, slugify } from '../common/security';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService, private readonly access: AccessService) {}

  private locationSlug(value: string | undefined, fallback: string) {
    const raw = value?.trim().toLowerCase();
    const slug = raw || slugify(fallback);
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 80 || reservedLocationSlugs.has(slug)) {
      throw new BadRequestException('El subdominio debe usar letras, números y guiones, y no puede estar reservado.');
    }
    return slug;
  }

  private async audit(data: { organizationId: string; locationId?: string; userId: string; action: 'CREATE' | 'UPDATE' | 'ARCHIVE'; entityType: string; entityId?: string; metadata?: object }) {
    await this.prisma.auditLog.create({ data: { ...data, action: data.action } });
  }

  async list(userId: string) {
    const actor = await this.access.actor(userId);
    const organizations = await this.prisma.organization.findMany({
      where: actor.platformAdmin ? undefined : { memberships: { some: { userId } } },
      include: { locations: { orderBy: { name: 'asc' } } }, orderBy: { name: 'asc' },
    });
    return { ok: true, organizations: organizations.map((organization) => ({ ...organization, locations: organization.locations.map(this.locationSummary) })) };
  }

  async create(userId: string, input: { name?: string; slug?: string; locationName?: string; locationSlug?: string; ownerName?: string; ownerEmail?: string; ownerPassword?: string }) {
    const actor = await this.access.actor(userId);
    if (!actor.platformAdmin) throw new ForbiddenException('Solo CartIA puede crear empresas.');
    const name = input.name?.trim(); const ownerEmail = input.ownerEmail?.trim().toLowerCase();
    if (!name || !ownerEmail || !input.ownerPassword || input.ownerPassword.length < 10) throw new BadRequestException('Completa empresa, responsable, email y una contraseña de al menos 10 caracteres.');
    const slug = slugify(input.slug || name);
    const locationName = input.locationName?.trim() || name;
    const locationSlug = this.locationSlug(input.locationSlug, `${slug}-principal`);
    const passwordHash = await bcrypt.hash(input.ownerPassword, 12);
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({ data: { name, slug } });
        const owner = await tx.user.create({ data: { name: input.ownerName?.trim() || 'Propietario', email: ownerEmail, passwordHash, createdById: userId } });
        await tx.organizationMembership.create({ data: { userId: owner.id, organizationId: organization.id, role: 'OWNER' } });
        const location = await tx.location.create({ data: { organizationId: organization.id, name: locationName, slug: locationSlug } });
        await tx.locationMembership.create({ data: { userId: owner.id, locationId: location.id, role: 'MANAGER' } });
        await tx.menu.create({ data: { locationId: location.id, name: 'Carta principal' } });
        await tx.auditLog.create({ data: { organizationId: organization.id, userId, action: 'CREATE', entityType: 'Organization', entityId: organization.id, metadata: { ownerId: owner.id } } });
        return { organization, location, owner: { id: owner.id, name: owner.name, email: owner.email } };
      });
      return { ok: true, ...result, publicUrl: publicLocationUrl(result.location.slug) };
    } catch (error: any) {
      if (error?.code === 'P2002') throw new BadRequestException('El slug o email ya está en uso.');
      throw error;
    }
  }

  async detail(userId: string, organizationId: string) {
    await this.access.requireOrganization(userId, organizationId, 'organization.read');
    const organization = await this.prisma.organization.findUnique({ where: { id: organizationId }, include: { locations: { include: { memberships: { include: { user: true } } } } } });
    if (!organization) throw new NotFoundException('Empresa no encontrada.');
    return { ok: true, organization: { ...organization, locations: organization.locations.map((location) => ({ ...this.locationSummary(location), users: location.memberships.map((membership) => ({ id: membership.user.id, name: membership.user.name, email: membership.user.email, role: membership.role })) })) } };
  }

  async addLocation(userId: string, organizationId: string, input: { name?: string; slug?: string; address?: string }) {
    await this.access.requireOrganization(userId, organizationId, 'organization.update');
    if (!input.name?.trim()) throw new BadRequestException('El local necesita un nombre.');
    try {
      const location = await this.prisma.location.create({ data: { organizationId, name: input.name.trim(), slug: this.locationSlug(input.slug, input.name), address: input.address?.trim() || '' }, });
      await this.prisma.menu.create({ data: { locationId: location.id, name: 'Carta principal' } });
      await this.audit({ organizationId, locationId: location.id, userId, action: 'CREATE', entityType: 'Location', entityId: location.id });
      return { ok: true, location: this.locationSummary(location) };
    } catch (error: any) { if (error?.code === 'P2002') throw new BadRequestException('El slug o nombre del local ya existe.'); throw error; }
  }

  async updateLocation(userId: string, locationId: string, input: { name?: string; address?: string; status?: 'ACTIVE' | 'PAUSED' }) {
    const location = await this.access.requireLocation(userId, locationId, 'location.manage');
    const updated = await this.prisma.location.update({ where: { id: location.id }, data: { name: input.name?.trim() || undefined, address: input.address?.trim(), status: input.status } });
    await this.audit({ organizationId: location.organizationId, locationId, userId, action: 'UPDATE', entityType: 'Location', entityId: locationId });
    return { ok: true, location: this.locationSummary(updated) };
  }

  async users(userId: string, organizationId: string) {
    await this.access.requireOrganization(userId, organizationId, 'organization.users.read');
    const users = await this.prisma.user.findMany({ where: { organizationMemberships: { some: { organizationId } } }, include: { organizationMemberships: { where: { organizationId } }, locationMemberships: { include: { location: true } } }, orderBy: { name: 'asc' } });
    return { ok: true, users: users.map((user) => ({ id: user.id, name: user.name, email: user.email, status: user.status, organizationRole: user.organizationMemberships[0]?.role ?? null, locations: user.locationMemberships.filter((item) => item.location.organizationId === organizationId).map((item) => ({ id: item.locationId, name: item.location.name, role: item.role })) })) };
  }

  async createUser(actorId: string, organizationId: string, input: { name?: string; email?: string; password?: string; organizationRole?: OrganizationRole; locations?: { locationId: string; role?: LocationRole }[] }) {
    const actor = await this.access.actor(actorId);
    await this.access.requireOrganization(actorId, organizationId, 'organization.users.manage');
    const name = input.name?.trim(); const email = input.email?.trim().toLowerCase();
    if (!name || !email || !input.password || input.password.length < 10) throw new BadRequestException('Nombre, email y contraseña de al menos 10 caracteres son obligatorios.');
    const organizationRole = input.organizationRole && ['OWNER', 'ADMIN', 'ANALYST'].includes(input.organizationRole) ? input.organizationRole : undefined;
    if (organizationRole === 'OWNER' && !actor.platformAdmin) throw new ForbiddenException('Solo CartIA puede asignar propietarios.');
    const locations = input.locations ?? [];
    const validLocations = await this.prisma.location.findMany({ where: { id: { in: locations.map((item) => item.locationId) }, organizationId } });
    if (validLocations.length !== locations.length) throw new BadRequestException('Una sucursal no pertenece a esta empresa.');
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({ data: { name, email, passwordHash: await bcrypt.hash(input.password!, 12), createdById: actorId } });
      if (organizationRole) await tx.organizationMembership.create({ data: { userId: created.id, organizationId, role: organizationRole } });
      await tx.locationMembership.createMany({ data: locations.map((item) => ({ userId: created.id, locationId: item.locationId, role: item.role ?? 'STAFF' })) });
      await tx.auditLog.create({ data: { organizationId, userId: actorId, action: 'CREATE', entityType: 'User', entityId: created.id, metadata: { locations: locations.map((item) => item.locationId) } } });
      return created;
    });
    return { ok: true, user: { id: user.id, name: user.name, email: user.email, status: user.status } };
  }

  async updateUser(actorId: string, userId: string, input: { name?: string; password?: string; status?: UserStatus; organizationId?: string; organizationRole?: OrganizationRole; locations?: { locationId: string; role?: LocationRole }[] }) {
    const actor = await this.access.actor(actorId); const organizationId = input.organizationId;
    if (!organizationId) throw new ForbiddenException('La organización es obligatoria.');
    await this.access.requireOrganization(actorId, organizationId, 'organization.users.manage');
    const existing = await this.prisma.user.findFirst({ where: { id: userId, organizationMemberships: { some: { organizationId } } } });
    if (!existing) throw new NotFoundException('Usuario no encontrado.');
    if (input.organizationRole === 'OWNER' && !actor.platformAdmin) throw new ForbiddenException('Solo CartIA puede asignar propietarios.');
    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({ where: { id: userId }, data: { name: input.name?.trim() || undefined, status: input.status, passwordHash: input.password ? await bcrypt.hash(input.password, 12) : undefined, passwordChangedAt: input.password ? new Date() : undefined } });
      if (input.organizationRole) await tx.organizationMembership.updateMany({ where: { userId, organizationId }, data: { role: input.organizationRole } });
      if (input.locations) { await tx.locationMembership.deleteMany({ where: { userId, location: { organizationId } } }); await tx.locationMembership.createMany({ data: input.locations.map((item) => ({ userId, locationId: item.locationId, role: item.role ?? 'STAFF' })) }); }
      await tx.auditLog.create({ data: { organizationId, userId: actorId, action: 'UPDATE', entityType: 'User', entityId: userId } }); return user;
    });
    return { ok: true, user: { id: updated.id, name: updated.name, email: updated.email, status: updated.status } };
  }

  async disableUser(actorId: string, userId: string, organizationId: string) { return this.updateUser(actorId, userId, { organizationId, status: UserStatus.DISABLED }); }

  private locationSummary(location: { id: string; organizationId: string; name: string; slug: string; address: string; status: any }) { return { id: location.id, organizationId: location.organizationId, name: location.name, slug: location.slug, publicUrl: publicLocationUrl(location.slug), address: location.address, status: location.status }; }
}
