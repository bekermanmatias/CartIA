import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsEventType, OrderStatus, Prisma, ServiceRequestType } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { Subject } from 'rxjs';
import { publicLocationUrl, slugify } from '../common/security';
import { PrismaService } from '../prisma/prisma.service';
import { AccessService, Permission } from '../access/access.service';

type PublicContext = { location: { id: string; slug: string; name: string; tagline: string | null; logoPath: string | null; themePrimary: string; themeAccent: string; themePaper: string; themeName: string; themeFont: string; serviceWaiter: boolean; serviceBill: boolean }; table: { id: string; label: string } };

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

  private formatDish(dish: { id: string; publicId: string; name: string; description: string; priceCents: number; badge: string | null; available: boolean; sortOrder: number; archivedAt: Date | null; category: { id: string; name: string } | null; media: { path: string; kind: string; originalName: string; bytes: bigint; mimeType: string; durationSeconds: Prisma.Decimal | null; width: number | null; height: number | null; published: boolean }[] }) {
    return { databaseId: dish.id, id: dish.publicId, name: dish.name, detail: dish.description, priceCents: dish.priceCents, price: `$${Math.round(dish.priceCents / 100).toLocaleString('es-AR')}`, image: this.imagePath(dish), badge: dish.badge ?? '', category: dish.category?.name ?? 'Sin categoría', categoryId: dish.category?.id ?? null, available: dish.available, sortOrder: dish.sortOrder, archived: Boolean(dish.archivedAt), video: this.video(dish) };
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
    const menu = await this.prisma.menu.findFirst({ where: { locationId: location.id, active: true }, include: { categories: { orderBy: { sortOrder: 'asc' } }, dishes: { include: { category: true, media: true }, orderBy: { sortOrder: 'asc' } } } });
    const tables = await this.prisma.table.findMany({ where: { locationId: location.id }, orderBy: { createdAt: 'asc' } });
    return { ok: true, restaurant: { id: location.id, name: location.name, slug: location.slug, publicUrl: publicLocationUrl(location.slug), tagline: location.tagline, logo: location.logoPath }, categories: (menu?.categories ?? []).map((category) => ({ id: category.id, name: category.name, sortOrder: category.sortOrder, archived: Boolean(category.archivedAt) })), dishes: (menu?.dishes ?? []).map((dish) => this.formatDish(dish)), tables: tables.map((table) => ({ id: table.id, label: table.label, token: table.publicToken, active: table.active, archived: Boolean(table.archivedAt), menuUrl: publicLocationUrl(location.slug, table.publicToken) })), serviceOptions: { waiter: location.serviceWaiter, bill: location.serviceBill }, visualTheme: { primary: location.themePrimary, accent: location.themeAccent, paper: location.themePaper, name: location.themeName, font: location.themeFont } };
  }

  async publicMenu(slug: string, token?: string, visitor?: string) {
    if (!slug) throw new NotFoundException('Restaurante no encontrado.');

    const context = token ? await this.context(slug, token) : null;
    const location = context?.location ?? await this.prisma.location.findFirst({ where: { slug, status: 'ACTIVE' } });
    if (!location) throw new NotFoundException('Restaurante no encontrado.');

    const menu = await this.prisma.menu.findFirst({ where: { locationId: location.id, active: true }, include: { dishes: { where: { available: true, archivedAt: null }, include: { category: true, media: true }, orderBy: { sortOrder: 'asc' } } } });
    if (!menu) throw new NotFoundException('Este restaurante no tiene una carta activa.');

    if (context) {
      await this.prisma.analyticsEvent.create({ data: { locationId: location.id, tableId: context.table.id, visitorSession: visitor?.slice(0, 64), type: 'QR_SCAN' } });
    }

    return { ok: true, restaurant: { id: location.id, name: location.name, slug: location.slug, tagline: location.tagline, logo: location.logoPath }, table: context ? { id: context.table.id, label: context.table.label } : null, dishes: menu.dishes.map((dish) => this.formatDish(dish)), serviceOptions: { waiter: location.serviceWaiter, bill: location.serviceBill }, visualTheme: { primary: location.themePrimary, accent: location.themeAccent, paper: location.themePaper, name: location.themeName, font: location.themeFont } };
  }

  async createTable(userId: string, label: string, locationId?: string) {
    const location = await this.locationForUser(userId, locationId, 'tables.manage');
    if (!label.trim() || label.length > 60) throw new BadRequestException('Escribe un nombre de mesa válido.');
    let table;
    try {
      table = await this.prisma.table.create({ data: { locationId: location.id, label: label.trim(), publicToken: randomBytes(32).toString('hex') } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('Ya existe una mesa con ese nombre.');
      throw error;
    }
    return { ok: true, table: { id: table.id, label: table.label, token: table.publicToken, active: table.active, menuUrl: publicLocationUrl(location.slug, table.publicToken) } };
  }

  async archiveTable(userId: string, id: string, archive: boolean, locationId?: string) {
    const location = await this.locationForUser(userId, locationId, 'tables.manage');
    const table = await this.prisma.table.findFirst({ where: { id, locationId: location.id } });
    if (!table) throw new NotFoundException('La mesa no pertenece a la sucursal activa.');
    await this.prisma.table.update({ where: { id }, data: { active: !archive, archivedAt: archive ? new Date() : null } });
    return { ok: true };
  }

  async requests(userId: string, locationId?: string) {
    const operation = await this.operations(userId, locationId);
    return { ok: true, requests: operation.serviceRequests };
  }

  async operations(userId: string, locationId?: string) {
    const location = await this.locationForUser(userId, locationId, 'requests.read');
    const [service, orders] = await Promise.all([
      this.prisma.serviceRequest.findMany({ where: { locationId: location.id, status: 'PENDING' }, include: { table: true }, orderBy: { createdAt: 'asc' } }),
      this.prisma.order.findMany({ where: { locationId: location.id, status: { in: ['NEW', 'ACCEPTED', 'PREPARING', 'READY', 'DELIVERED'] } }, include: { table: true, items: true }, orderBy: { createdAt: 'asc' } }),
    ]);
    return { ok: true, serviceRequests: service.map((item) => ({ id: item.id, kind: 'service', requestType: item.type.toLowerCase(), table: item.table.label, type: item.type === 'WAITER' ? 'Llama al mozo' : 'Pidió la cuenta', createdAt: item.createdAt.toISOString() })), orders: orders.map((item) => ({ id: item.id, table: item.table.label, status: item.status, summary: item.items.map((line) => `${line.quantity}× ${line.dishName}`).join(' · '), total: `$${Math.round(item.totalCents / 100).toLocaleString('es-AR')}`, notes: item.notes, createdAt: item.createdAt.toISOString() })) };
  }

  async resolveRequest(userId: string, id: string, kind: string, locationId?: string) {
    const location = await this.locationForUser(userId, locationId, 'requests.resolve');
    if (kind === 'order') {
      return this.updateOrderStatus(userId, id, 'PREPARING', location.id);
    } else {
      await this.prisma.serviceRequest.updateMany({ where: { id, locationId: location.id, status: 'PENDING' }, data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedById: userId } });
      this.events.next({ type: 'service-request.updated', locationId: location.id, data: { id, status: 'RESOLVED' } });
    }
    return { ok: true };
  }

  async updateOrderStatus(userId: string, id: string, status: string, locationId?: string) {
    const location = await this.locationForUser(userId, locationId, 'requests.resolve');
    const order = await this.prisma.order.findFirst({ where: { id, locationId: location.id } });
    if (!order) throw new NotFoundException('El pedido no pertenece a la sucursal activa.');
    const transitions: Record<string, string[]> = { NEW: ['PREPARING', 'CANCELLED'], ACCEPTED: ['PREPARING', 'CANCELLED'], PREPARING: ['READY', 'CANCELLED'], READY: ['DELIVERED', 'CANCELLED'] };
    if (!transitions[order.status]?.includes(status)) throw new BadRequestException('La transición de pedido no es válida.');
    const updated = await this.prisma.order.update({ where: { id }, data: { status: status as OrderStatus } });
    this.events.next({ type: 'order.updated', locationId: location.id, data: { id, status: updated.status } });
    return { ok: true, order: { id: updated.id, status: updated.status } };
  }

  async saveSettings(userId: string, input: { serviceOptions?: { waiter?: boolean; bill?: boolean }; visualTheme?: { primary?: string; accent?: string; paper?: string; name?: string; font?: string } }, locationId?: string) {
    const location = await this.locationForUser(userId, locationId, 'location.manage');
    const color = (value: string | undefined, fallback: string) => /^#[0-9a-f]{6}$/i.test(value ?? '') ? value!.toLowerCase() : fallback;
    const fonts = ['Elegante editorial', 'Moderna limpia', 'Clásica cálida'];
    const font = fonts.includes(input.visualTheme?.font ?? '') ? input.visualTheme!.font! : location.themeFont;
    await this.prisma.location.update({ where: { id: location.id }, data: { serviceWaiter: Boolean(input.serviceOptions?.waiter), serviceBill: Boolean(input.serviceOptions?.bill), themePrimary: color(input.visualTheme?.primary, location.themePrimary), themeAccent: color(input.visualTheme?.accent, location.themeAccent), themePaper: color(input.visualTheme?.paper, location.themePaper), themeName: input.visualTheme?.name?.trim().slice(0, 80) || location.themeName, themeFont: font } });
    return { ok: true };
  }

  async saveDish(userId: string, input: { databaseId?: string; id?: string; name?: string; detail?: string; priceCents?: number; price?: string; badge?: string; categoryId?: string; available?: boolean }, locationId?: string) {
    const location = await this.locationForUser(userId, locationId, 'menu.manage');
    const name = input.name?.trim();
    if (!name) throw new BadRequestException('El plato necesita un nombre.');
    const menu = await this.prisma.menu.findFirstOrThrow({ where: { locationId: location.id, active: true } });
    const category = input.categoryId
      ? await this.prisma.category.findFirst({ where: { id: input.categoryId, menuId: menu.id, archivedAt: null } })
      : await this.prisma.category.upsert({ where: { menuId_name: { menuId: menu.id, name: 'Sin categoría' } }, update: { archivedAt: null }, create: { menuId: menu.id, name: 'Sin categoría', sortOrder: 0 } });
    if (!category) throw new BadRequestException('Elegí una categoría válida para el plato.');
    const rawPrice = Number.isFinite(input.priceCents) ? Math.trunc(input.priceCents!) : Number((input.price ?? '').replace(/\D/g, '')) * 100;
    const priceCents = Number.isFinite(rawPrice) ? rawPrice : 0;
    if (priceCents <= 0) throw new BadRequestException('El precio debe ser mayor a cero.');
    const data = { name, description: input.detail?.trim() ?? '', priceCents, badge: input.badge?.trim() || null, categoryId: category.id, available: input.available !== false };
    if (input.databaseId) {
      const existing = await this.prisma.dish.findFirst({ where: { id: input.databaseId, menuId: menu.id } });
      if (!existing) throw new NotFoundException('El plato no pertenece a esta sucursal.');
    }
    const dish = input.databaseId
      ? await this.prisma.dish.update({ where: { id: input.databaseId }, data, include: { category: true, media: true } })
      : await this.prisma.dish.create({ data: { ...data, menuId: menu.id, publicId: `${slugify(name, 'dish')}-${randomBytes(4).toString('hex')}`, sortOrder: await this.prisma.dish.count({ where: { menuId: menu.id } }) }, include: { category: true, media: true } });
    return { ok: true, dish: this.formatDish(dish) };
  }

  private async activeMenu(userId: string, locationId: string | undefined) {
    const location = await this.locationForUser(userId, locationId, 'menu.manage');
    const menu = await this.prisma.menu.findFirstOrThrow({ where: { locationId: location.id, active: true } });
    return { location, menu };
  }

  async archiveDish(userId: string, id: string, archive: boolean, locationId?: string) {
    const { menu } = await this.activeMenu(userId, locationId);
    const dish = await this.prisma.dish.findFirst({ where: { id, menuId: menu.id } });
    if (!dish) throw new NotFoundException('El plato no pertenece a la sucursal activa.');
    await this.prisma.dish.update({ where: { id }, data: { archivedAt: archive ? new Date() : null, available: archive ? false : dish.available } });
    return { ok: true };
  }

  async reorderDishes(userId: string, ids: string[], locationId?: string) {
    const { menu } = await this.activeMenu(userId, locationId);
    const dishes = await this.prisma.dish.findMany({ where: { menuId: menu.id, archivedAt: null }, select: { id: true } });
    if (ids.length !== dishes.length || new Set(ids).size !== ids.length || ids.some((id) => !dishes.some((dish) => dish.id === id))) throw new BadRequestException('El orden de platos es inválido.');
    await this.prisma.$transaction(ids.map((id, sortOrder) => this.prisma.dish.update({ where: { id }, data: { sortOrder } })));
    return { ok: true };
  }

  async saveCategory(userId: string, input: { id?: string; name?: string }, locationId?: string) {
    const { menu } = await this.activeMenu(userId, locationId);
    const name = input.name?.trim().slice(0, 80);
    if (!name) throw new BadRequestException('La categoría necesita un nombre.');
    if (input.id) {
      const category = await this.prisma.category.findFirst({ where: { id: input.id, menuId: menu.id } });
      if (!category) throw new NotFoundException('La categoría no pertenece a la sucursal activa.');
      if (category.name === 'Sin categoría') throw new BadRequestException('No se puede renombrar la categoría Sin categoría.');
      let saved;
      try { saved = await this.prisma.category.update({ where: { id: category.id }, data: { name, archivedAt: null } }); }
      catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('Ya existe una categoría con ese nombre.');
        throw error;
      }
      return { ok: true, category: { id: saved.id, name: saved.name, sortOrder: saved.sortOrder, archived: Boolean(saved.archivedAt) } };
    } else {
      let saved;
      try { saved = await this.prisma.category.create({ data: { menuId: menu.id, name, sortOrder: await this.prisma.category.count({ where: { menuId: menu.id } }) } }); }
      catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new BadRequestException('Ya existe una categoría con ese nombre.');
        throw error;
      }
      return { ok: true, category: { id: saved.id, name: saved.name, sortOrder: saved.sortOrder, archived: false } };
    }
  }

  async archiveCategory(userId: string, id: string, archive: boolean, locationId?: string) {
    const { menu } = await this.activeMenu(userId, locationId);
    const category = await this.prisma.category.findFirst({ where: { id, menuId: menu.id } });
    if (!category) throw new NotFoundException('La categoría no pertenece a la sucursal activa.');
    if (category.name === 'Sin categoría') throw new BadRequestException('La categoría Sin categoría no se puede archivar.');
    if (archive) {
      const fallback = await this.prisma.category.upsert({ where: { menuId_name: { menuId: menu.id, name: 'Sin categoría' } }, update: { archivedAt: null }, create: { menuId: menu.id, name: 'Sin categoría', sortOrder: 0 } });
      await this.prisma.$transaction([this.prisma.dish.updateMany({ where: { categoryId: category.id }, data: { categoryId: fallback.id } }), this.prisma.category.update({ where: { id }, data: { archivedAt: new Date() } })]);
    } else await this.prisma.category.update({ where: { id }, data: { archivedAt: null } });
    return { ok: true };
  }

  async reorderCategories(userId: string, ids: string[], locationId?: string) {
    const { menu } = await this.activeMenu(userId, locationId);
    const categories = await this.prisma.category.findMany({ where: { menuId: menu.id, archivedAt: null }, select: { id: true } });
    if (ids.length !== categories.length || new Set(ids).size !== ids.length || ids.some((id) => !categories.some((category) => category.id === id))) throw new BadRequestException('El orden de categorías es inválido.');
    await this.prisma.$transaction(ids.map((id, sortOrder) => this.prisma.category.update({ where: { id }, data: { sortOrder } })));
    return { ok: true };
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
    const dishes = await this.prisma.dish.findMany({ where: { menuId: menu.id, publicId: { in: ids }, available: true, archivedAt: null } });
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
    const ctx = input.tableToken ? await this.context(input.restaurant ?? '', input.tableToken) : null;
    const eventType = { dish_view: 'DISH_VIEW', dish_click: 'DISH_CLICK', add_dish: 'ADD_DISH' }[input.type ?? ''] as AnalyticsEventType | undefined;
    if (!eventType) throw new BadRequestException('Evento inválido.');
    if (!ctx && eventType === 'ADD_DISH') throw new ForbiddenException('Escaneá el QR de tu mesa para agregar platos.');
    const location = ctx?.location ?? await this.prisma.location.findFirst({ where: { slug: input.restaurant ?? '', status: 'ACTIVE' } });
    if (!location) throw new NotFoundException('Restaurante no encontrado.');
    const dish = input.dishId ? await this.prisma.dish.findFirst({ where: { publicId: input.dishId, menu: { locationId: location.id } } }) : null;
    await this.prisma.analyticsEvent.create({ data: { locationId: location.id, tableId: ctx?.table.id, dishId: dish?.id, visitorSession: input.visitorSession?.slice(0, 64), type: eventType, durationMs: input.durationMs ? Math.max(0, Math.min(input.durationMs, 3_600_000)) : null, metadata: input.metadata } });
    return { ok: true };
  }

  async analytics(userId: string, days = 7, locationId?: string) {
    const location = await this.locationForUser(userId, locationId, 'analytics.read');
    const selectedDays = [1, 7, 30].includes(days) ? days : 7;
    const since = new Date(Date.now() - selectedDays * 86_400_000);
    const orderWhere = { locationId: location.id, createdAt: { gte: since }, status: { not: 'CANCELLED' as OrderStatus } };
    const [events, orders, orderItems, dishes] = await Promise.all([
      this.prisma.analyticsEvent.findMany({ where: { locationId: location.id, createdAt: { gte: since } }, select: { type: true, dishId: true, durationMs: true, createdAt: true } }),
      this.prisma.order.findMany({ where: orderWhere, select: { id: true, totalCents: true, createdAt: true } }),
      this.prisma.orderItem.findMany({ where: { order: orderWhere }, select: { dishId: true, quantity: true, unitPriceCents: true } }),
      this.prisma.dish.findMany({ where: { menu: { locationId: location.id }, archivedAt: null }, select: { id: true, publicId: true, name: true, available: true, media: { where: { kind: 'VIDEO', published: true }, select: { id: true } } } }),
    ]);
    const count = (type: AnalyticsEventType) => events.filter((event) => event.type === type).length;
    const perDish = new Map(dishes.map((dish) => [dish.id, { id: dish.publicId, name: dish.name, available: dish.available, hasVideo: dish.media.length > 0, views: 0, clicks: 0, adds: 0, orderedUnits: 0, revenueCents: 0, viewDurationMs: 0, timedViews: 0 }]));
    for (const event of events) {
      const dish = event.dishId ? perDish.get(event.dishId) : undefined;
      if (!dish) continue;
      if (event.type === 'DISH_VIEW') { dish.views += 1; if (event.durationMs) { dish.viewDurationMs += event.durationMs; dish.timedViews += 1; } }
      if (event.type === 'DISH_CLICK') dish.clicks += 1;
      if (event.type === 'ADD_DISH') dish.adds += 1;
    }
    for (const item of orderItems) {
      const dish = perDish.get(item.dishId);
      if (!dish) continue;
      dish.orderedUnits += item.quantity;
      dish.revenueCents += item.quantity * item.unitPriceCents;
    }
    const dishMetrics = [...perDish.values()].map((dish) => ({ id: dish.id, name: dish.name, available: dish.available, hasVideo: dish.hasVideo, views: dish.views, clicks: dish.clicks, adds: dish.adds, orderedUnits: dish.orderedUnits, revenueCents: dish.revenueCents, averageViewSeconds: dish.timedViews ? Math.round((dish.viewDurationMs / dish.timedViews) / 1000) : 0, addRate: dish.views ? Math.round((dish.adds / dish.views) * 100) : 0, orderRate: dish.views ? Math.round((dish.orderedUnits / dish.views) * 100) : 0 })).sort((a, b) => b.revenueCents - a.revenueCents || b.orderedUnits - a.orderedUnits || b.views - a.views);
    const daily = Array.from({ length: selectedDays }, (_, index) => {
      const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() - (selectedDays - index - 1));
      const next = new Date(date); next.setDate(next.getDate() + 1);
      const dayOrders = orders.filter((order) => order.createdAt >= date && order.createdAt < next);
      const dayEvents = events.filter((event) => event.createdAt >= date && event.createdAt < next);
      return { date: date.toISOString().slice(0, 10), orders: dayOrders.length, revenueCents: dayOrders.reduce((sum, order) => sum + order.totalCents, 0), scans: dayEvents.filter((event) => event.type === 'QR_SCAN').length, views: dayEvents.filter((event) => event.type === 'DISH_VIEW').length };
    });
    const contentSuggestions = dishMetrics.flatMap((dish) => {
      const suggestions: { dishId: string; dishName: string; type: string; title: string; detail: string; action: 'content' | 'carta' }[] = [];
      if (!dish.hasVideo) suggestions.push({ dishId: dish.id, dishName: dish.name, type: 'missing_video', title: `Sumá un video a ${dish.name}`, detail: 'Los platos con una pieza visual tienen más oportunidades de ser descubiertos.', action: 'content' });
      if (dish.views >= 10 && dish.adds === 0 && dish.orderedUnits === 0) suggestions.push({ dishId: dish.id, dishName: dish.name, type: 'low_conversion', title: `Revisá la presentación de ${dish.name}`, detail: `${dish.views} vistas sin agregados: probá mejorar foto, video, descripción o precio.`, action: 'carta' });
      if (dish.adds >= 5 && dish.orderedUnits === 0) suggestions.push({ dishId: dish.id, dishName: dish.name, type: 'checkout_drop', title: `Revisá la propuesta de ${dish.name}`, detail: `${dish.adds} agregados sin pedidos: verificá disponibilidad y precio.`, action: 'carta' });
      return suggestions;
    });
    const bestSeller = dishMetrics.find((dish) => dish.orderedUnits > 0);
    if (bestSeller) contentSuggestions.unshift({ dishId: bestSeller.id, dishName: bestSeller.name, type: 'best_seller', title: `Destacá ${bestSeller.name}`, detail: `Es tu plato con mejor resultado: ${bestSeller.orderedUnits} unidades y $${Math.round(bestSeller.revenueCents / 100).toLocaleString('es-AR')} de facturación estimada.`, action: 'carta' });
    const estimatedRevenueCents = orders.reduce((sum, order) => sum + order.totalCents, 0);
    return { ok: true, days: selectedDays, kpis: { scans: count('QR_SCAN'), views: count('DISH_VIEW'), clicks: count('DISH_CLICK'), adds: count('ADD_DISH'), orders: orders.length, waiterCalls: count('WAITER_CALL'), billRequests: count('BILL_REQUEST') }, summary: { orderCount: orders.length, estimatedRevenueCents, waiterCalls: count('WAITER_CALL'), billRequests: count('BILL_REQUEST'), scanToOrderRate: count('QR_SCAN') ? Math.round((orders.length / count('QR_SCAN')) * 100) : 0 }, daily, dishes: dishMetrics, contentSuggestions };
  }

  async streamFor(userId: string, locationId?: string) {
    const location = await this.locationForUser(userId, locationId, 'requests.read');
    return { locationId: location.id, stream: this.events.asObservable() };
  }

  ipHash(ip: string) { return createHash('sha256').update(ip).digest('hex'); }
}
