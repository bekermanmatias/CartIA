import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsEventType, OrderStatus, Prisma, ServiceRequestType } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { Subject } from 'rxjs';
import { slugify } from '../common/security';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService, Permission } from '../access/access.service';

type PublicContext = { location: { id: string; slug: string; name: string; tagline: string | null; logoPath: string | null; themePrimary: string; themeAccent: string; themePaper: string; themeName: string; serviceWaiter: boolean; serviceBill: boolean }; table: { id: string; label: string } };

@Injectable()
export class CartiaService {
  readonly events = new Subject<{ type: string; locationId: string; data: Record<string, unknown> }>();
  constructor(private readonly prisma: PrismaService, private readonly access: AccessService) {}

  private imagePath(dish: { media: { path: string; kind: string }[] }) {
    return dish.media.find((item) => item.kind === 'IMAGE')?.path ?? null;
  }

  private video(dish: { media: { path: string; kind: string; originalName: string; bytes: bigint; mimeType: string; durationSeconds: Prisma.Decimal | null; width: number | null; height: number | null; published: boolean }[] }) {
    const media = dish.media.find((item) => item.kind === 'VIDEO' && item.published);
    return media ? { url: media.path, fileName: media.originalName, size: Number(media.bytes), type: media.mimeType, duration: media.durationSeconds ? Number(media.durationSeconds) : null, width: media.width, height: media.height, published: media.published } : null;
  }

  private formatDish(dish: { id: string; publicId: string; name: string; description: string; priceCents: number; badge: string | null; available: boolean; category: { name: string } | null; media: { path: string; kind: string; originalName: string; bytes: bigint; mimeType: string; durationSeconds: Prisma.Decimal | null; width: number | null; height: number | null; published: boolean }[] }) {
    return { databaseId: dish.id, id: dish.publicId, name: dish.name, detail: dish.description, priceCents: dish.priceCents, price: `$${Math.round(dish.priceCents / 100).toLocaleString('es-AR')}`, image: this.imagePath(dish), badge: dish.badge ?? '', category: dish.category?.name ?? 'Principales', available: dish.available, video: this.video(dish) };
  }

  private async locationForUser(userId: string, locationId?: string, permission: Permission = 'location.read') {
    const actor = await this.access.actor(userId);
    const selected = locationId ?? actor.locationMemberships[0]?.locationId;
    if (!selected) throw new ForbiddenException('No tienes una sucursal activa asignada.');
    return this.access.requireLocation(userId, selected, permission);
  }

  private async context(slug: string, token: string): Promise<PublicContext> {
    const table = await this.prisma.table.findUnique({ where: { publicToken: token }, include: { location: true } });
    if (!table || !table.active || table.location.slug !== slug || table.location.status !== 'ACTIVE') throw new NotFoundException('Este QR no corresponde a una mesa activa.');
    return { location: table.location, table };
  }

  async health() { await this.prisma.$queryRaw`SELECT 1`; return { ok: true, database: true, service: 'cartia-api' }; }

  async bootstrap(userId: string, locationId?: string) {
    const location = await this.locationForUser(userId, locationId, 'location.read');
    const menu = await this.prisma.menu.findFirst({ where: { locationId: location.id, active: true }, include: { dishes: { include: { category: true, media: true }, orderBy: { sortOrder: 'asc' } } } });
    const tables = await this.prisma.table.findMany({ where: { locationId: location.id }, orderBy: { createdAt: 'asc' } });
    return { ok: true, restaurant: { id: location.id, name: location.name, slug: location.slug, tagline: location.tagline, logo: location.logoPath }, dishes: (menu?.dishes ?? []).map((dish) => this.formatDish(dish)), tables: tables.map((table) => ({ id: table.id, label: table.label, token: table.publicToken, active: table.active, menuUrl: `/?r=${location.slug}&t=${table.publicToken}#menu` })), serviceOptions: { waiter: location.serviceWaiter, bill: location.serviceBill }, visualTheme: { primary: location.themePrimary, accent: location.themeAccent, paper: location.themePaper, name: location.themeName } };
  }

  async publicMenu(slug: string, token: string, visitor?: string) {
    const ctx = await this.context(slug, token);
    const menu = await this.prisma.menu.findFirstOrThrow({ where: { locationId: ctx.location.id, active: true }, include: { dishes: { where: { available: true }, include: { category: true, media: true }, orderBy: { sortOrder: 'asc' } } } });
    await this.prisma.analyticsEvent.create({ data: { locationId: ctx.location.id, tableId: ctx.table.id, visitorSession: visitor?.slice(0, 64), type: 'QR_SCAN' } });
    return { ok: true, restaurant: { id: ctx.location.id, name: ctx.location.name, slug: ctx.location.slug, tagline: ctx.location.tagline, logo: ctx.location.logoPath }, table: { id: ctx.table.id, label: ctx.table.label }, dishes: menu.dishes.map((dish) => this.formatDish(dish)), serviceOptions: { waiter: ctx.location.serviceWaiter, bill: ctx.location.serviceBill }, visualTheme: { primary: ctx.location.themePrimary, accent: ctx.location.themeAccent, paper: ctx.location.themePaper, name: ctx.location.themeName } };
  }

  async createTable(userId: string, label: string, locationId?: string) {
    const location = await this.locationForUser(userId, locationId, 'tables.manage');
    if (!label.trim() || label.length > 60) throw new BadRequestException('Escribe un nombre de mesa válido.');
    const table = await this.prisma.table.create({ data: { locationId: location.id, label: label.trim(), publicToken: randomBytes(32).toString('hex') } });
    return { ok: true, table: { id: table.id, label: table.label, token: table.publicToken, active: table.active, menuUrl: `/?r=${location.slug}&t=${table.publicToken}#menu` } };
  }

  async archiveTable(userId: string, id: string, locationId?: string) {
    const location = await this.locationForUser(userId, locationId, 'tables.manage');
    await this.prisma.table.updateMany({ where: { id, locationId: location.id }, data: { active: false, archivedAt: new Date() } });
    return { ok: true };
  }

  async requests(userId: string, locationId?: string) {
    const location = await this.locationForUser(userId, locationId, 'requests.read');
    const [service, orders] = await Promise.all([
      this.prisma.serviceRequest.findMany({ where: { locationId: location.id, status: 'PENDING' }, include: { table: true }, orderBy: { createdAt: 'asc' } }),
      this.prisma.order.findMany({ where: { locationId: location.id, status: 'NEW' }, include: { table: true, items: true }, orderBy: { createdAt: 'asc' } }),
    ]);
    return { ok: true, requests: [...service.map((item) => ({ id: item.id, kind: 'service', requestType: item.type.toLowerCase(), table: item.table.label, type: item.type === 'WAITER' ? 'Llama al mozo' : 'Pidió la cuenta', createdAt: item.createdAt.toISOString() })), ...orders.map((item) => ({ id: item.id, kind: 'order', requestType: 'order', table: item.table.label, type: 'Nuevo pedido', summary: item.items.map((line) => `${line.quantity}× ${line.dishName}`).join(' · '), total: `$${Math.round(item.totalCents / 100).toLocaleString('es-AR')}`, createdAt: item.createdAt.toISOString() }))] };
  }

  async resolveRequest(userId: string, id: string, kind: string, locationId?: string) {
    const location = await this.locationForUser(userId, locationId, 'requests.resolve');
    if (kind === 'order') {
      await this.prisma.order.updateMany({ where: { id, locationId: location.id, status: 'NEW' }, data: { status: 'ACCEPTED' } });
      this.events.next({ type: 'order.updated', locationId: location.id, data: { id, status: 'ACCEPTED' } });
    } else {
      await this.prisma.serviceRequest.updateMany({ where: { id, locationId: location.id, status: 'PENDING' }, data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedById: userId } });
      this.events.next({ type: 'service-request.updated', locationId: location.id, data: { id, status: 'RESOLVED' } });
    }
    return { ok: true };
  }

  async saveSettings(userId: string, input: { serviceOptions?: { waiter?: boolean; bill?: boolean }; visualTheme?: { primary?: string; accent?: string; paper?: string; name?: string } }, locationId?: string) {
    const location = await this.locationForUser(userId, locationId, 'location.manage');
    const color = (value: string | undefined, fallback: string) => /^#[0-9a-f]{6}$/i.test(value ?? '') ? value!.toLowerCase() : fallback;
    await this.prisma.location.update({ where: { id: location.id }, data: { serviceWaiter: Boolean(input.serviceOptions?.waiter), serviceBill: Boolean(input.serviceOptions?.bill), themePrimary: color(input.visualTheme?.primary, location.themePrimary), themeAccent: color(input.visualTheme?.accent, location.themeAccent), themePaper: color(input.visualTheme?.paper, location.themePaper), themeName: input.visualTheme?.name?.trim().slice(0, 80) || location.themeName } });
    return { ok: true };
  }

  async saveDish(userId: string, input: { databaseId?: string; id?: string; name?: string; detail?: string; priceCents?: number; price?: string; badge?: string; category?: string; available?: boolean }, locationId?: string) {
    const location = await this.locationForUser(userId, locationId, 'menu.manage');
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('El plato necesita un nombre.');
    const menu = await this.prisma.menu.findFirstOrThrow({ where: { locationId: location.id, active: true } });
    const category = await this.prisma.category.upsert({ where: { menuId_name: { menuId: menu.id, name: input.category?.trim() || 'Principales' } }, update: {}, create: { menuId: menu.id, name: input.category?.trim() || 'Principales' } });
    const priceCents = Number.isFinite(input.priceCents) ? Math.max(0, Math.trunc(input.priceCents!)) : Math.max(0, Number((input.price ?? '0').replace(/\D/g, '')) * 100);
    const data = { name, description: input.detail?.trim() ?? '', priceCents, badge: input.badge?.trim() || null, categoryId: category.id, available: input.available !== false };
    if (input.databaseId) {
      const existing = await this.prisma.dish.findFirst({ where: { id: input.databaseId, menuId: menu.id } });
      if (!existing) throw new NotFoundException('El plato no pertenece a esta sucursal.');
    }
    const dish = input.databaseId ? await this.prisma.dish.update({ where: { id: input.databaseId }, data }) : await this.prisma.dish.create({ data: { ...data, menuId: menu.id, publicId: `${slugify(name, 'dish')}-${randomBytes(4).toString('hex')}`, sortOrder: await this.prisma.dish.count({ where: { menuId: menu.id } }) } });
    return { ok: true, dish: { databaseId: dish.id, id: dish.publicId } };
  }

  async publicServiceRequest(input: { restaurant?: string; tableToken?: string; type?: string; visitorSession?: string }) {
    const ctx = await this.context(input.restaurant ?? '', input.tableToken ?? '');
    const type = input.type === 'waiter' ? 'WAITER' : input.type === 'bill' ? 'BILL' : null;
    if (!type || (type === 'WAITER' && !ctx.location.serviceWaiter) || (type === 'BILL' && !ctx.location.serviceBill)) throw new BadRequestException('Esta opción no está activa.');
    const recent = await this.prisma.serviceRequest.findFirst({ where: { locationId: ctx.location.id, tableId: ctx.table.id, type, status: 'PENDING', createdAt: { gte: new Date(Date.now() - 90_000) } } });
    if (recent) return { ok: true, duplicate: true };
    const request = await this.prisma.serviceRequest.create({ data: { locationId: ctx.location.id, tableId: ctx.table.id, type: type as ServiceRequestType, visitorSession: input.visitorSession?.slice(0, 64) } });
    await this.prisma.analyticsEvent.create({ data: { locationId: ctx.location.id, tableId: ctx.table.id, visitorSession: input.visitorSession?.slice(0, 64), type: type === 'WAITER' ? 'WAITER_CALL' : 'BILL_REQUEST' } });
    this.events.next({ type: 'service-request.created', locationId: ctx.location.id, data: { id: request.id, table: ctx.table.label, type } });
    return { ok: true, requestId: request.id };
  }

  async publicOrder(input: { restaurant?: string; tableToken?: string; visitorSession?: string; items?: { dishId?: string; quantity?: number }[]; notes?: string }) {
    const ctx = await this.context(input.restaurant ?? '', input.tableToken ?? '');
    const items = (input.items ?? []).filter((item) => item.dishId && Number(item.quantity) > 0).slice(0, 30);
    if (!items.length) throw new BadRequestException('El pedido no contiene platos válidos.');
    const menu = await this.prisma.menu.findFirstOrThrow({ where: { locationId: ctx.location.id, active: true } });
    const ids = [...new Set(items.map((item) => item.dishId!))];
    const dishes = await this.prisma.dish.findMany({ where: { menuId: menu.id, publicId: { in: ids }, available: true } });
    if (dishes.length !== ids.length) throw new BadRequestException('Uno de los platos ya no está disponible.');
    const byPublicId = new Map(dishes.map((dish) => [dish.publicId, dish]));
    const lines = items.map((item) => ({ dish: byPublicId.get(item.dishId!)!, quantity: Math.min(20, Math.max(1, Math.trunc(Number(item.quantity)))) }));
    const totalCents = lines.reduce((total, line) => total + line.dish.priceCents * line.quantity, 0);
    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({ data: { locationId: ctx.location.id, tableId: ctx.table.id, visitorSession: input.visitorSession?.slice(0, 64), totalCents, notes: input.notes?.trim().slice(0, 500) || null } });
      await tx.orderItem.createMany({ data: lines.map((line) => ({ orderId: created.id, dishId: line.dish.id, dishName: line.dish.name, unitPriceCents: line.dish.priceCents, quantity: line.quantity })) });
      await tx.analyticsEvent.create({ data: { locationId: ctx.location.id, tableId: ctx.table.id, visitorSession: input.visitorSession?.slice(0, 64), type: 'ORDER_SENT' } });
      return created;
    });
    this.events.next({ type: 'order.created', locationId: ctx.location.id, data: { id: order.id, table: ctx.table.label, totalCents } });
    return { ok: true, orderId: order.id, totalCents };
  }

  async publicEvent(input: { restaurant?: string; tableToken?: string; visitorSession?: string; type?: string; dishId?: string; durationMs?: number; metadata?: Prisma.InputJsonValue }) {
    const ctx = await this.context(input.restaurant ?? '', input.tableToken ?? '');
    const eventType = { dish_view: 'DISH_VIEW', dish_click: 'DISH_CLICK', add_dish: 'ADD_DISH' }[input.type ?? ''] as AnalyticsEventType | undefined;
    if (!eventType) throw new BadRequestException('Evento inválido.');
    const dish = input.dishId ? await this.prisma.dish.findFirst({ where: { publicId: input.dishId, menu: { locationId: ctx.location.id } } }) : null;
    await this.prisma.analyticsEvent.create({ data: { locationId: ctx.location.id, tableId: ctx.table.id, dishId: dish?.id, visitorSession: input.visitorSession?.slice(0, 64), type: eventType, durationMs: input.durationMs ? Math.max(0, Math.min(input.durationMs, 3_600_000)) : null, metadata: input.metadata } });
    return { ok: true };
  }

  async analytics(userId: string, days = 7, locationId?: string) {
    const location = await this.locationForUser(userId, locationId, 'analytics.read');
    const since = new Date(Date.now() - ([1, 7, 30].includes(days) ? days : 7) * 86_400_000);
    const events = await this.prisma.analyticsEvent.groupBy({ by: ['type'], where: { locationId: location.id, createdAt: { gte: since } }, _count: true });
    const count = (type: AnalyticsEventType) => events.find((event) => event.type === type)?._count ?? 0;
    return { ok: true, days, kpis: { scans: count('QR_SCAN'), views: count('DISH_VIEW'), clicks: count('DISH_CLICK'), adds: count('ADD_DISH'), orders: count('ORDER_SENT') }, dishes: [] };
  }

  async streamFor(userId: string, locationId?: string) {
    const location = await this.locationForUser(userId, locationId, 'requests.read');
    return { locationId: location.id, stream: this.events.asObservable() };
  }

  ipHash(ip: string) { return createHash('sha256').update(ip).digest('hex'); }
}
