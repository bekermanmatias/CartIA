import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartiaService } from './cartia.service';

describe('CartiaService order transitions', () => {
  const prisma = { order: { findFirst: jest.fn(), update: jest.fn() } };
  const access = { actor: jest.fn(), requireLocation: jest.fn() };
  const service = new CartiaService(prisma as any, access as any);

  beforeEach(() => {
    jest.resetAllMocks();
    access.actor.mockResolvedValue({ locationMemberships: [{ locationId: 'location-a' }] });
    access.requireLocation.mockResolvedValue({ id: 'location-a' });
    prisma.order.findFirst.mockResolvedValue({ id: 'order-a', locationId: 'location-a', status: 'NEW' });
    prisma.order.update.mockResolvedValue({ id: 'order-a', status: 'PREPARING' });
  });

  it('moves a new order to preparation', async () => {
    await expect(service.updateOrderStatus('user-a', 'order-a', 'PREPARING', 'location-a')).resolves.toEqual({ ok: true, order: { id: 'order-a', status: 'PREPARING' } });
  });

  it('rejects an invalid transition', async () => {
    await expect(service.updateOrderStatus('user-a', 'order-a', 'DELIVERED', 'location-a')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows an accepted legacy order to enter preparation', async () => {
    prisma.order.findFirst.mockResolvedValue({ id: 'order-a', locationId: 'location-a', status: 'ACCEPTED' });
    await expect(service.updateOrderStatus('user-a', 'order-a', 'PREPARING', 'location-a')).resolves.toEqual({ ok: true, order: { id: 'order-a', status: 'PREPARING' } });
  });

  it('rejects a dish with no numeric price before writing it', async () => {
    (prisma as any).menu = { findFirstOrThrow: jest.fn().mockResolvedValue({ id: 'menu-a' }) };
    (prisma as any).category = { findFirst: jest.fn().mockResolvedValue({ id: 'category-a', name: 'Principales' }) };
    await expect(service.saveDish('user-a', { name: 'Plato sin precio', price: '$', categoryId: 'category-a' }, 'location-a')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns the canonical persisted dish after saving it', async () => {
    (prisma as any).menu = { findFirstOrThrow: jest.fn().mockResolvedValue({ id: 'menu-a' }) };
    (prisma as any).category = { findFirst: jest.fn().mockResolvedValue({ id: 'category-a', name: 'Principales' }) };
    (prisma as any).dish = { count: jest.fn().mockResolvedValue(0), create: jest.fn().mockResolvedValue({ id: 'dish-a', publicId: 'plato-a', name: 'Plato A', description: '', priceCents: 12500, badge: null, available: true, sortOrder: 0, archivedAt: null, category: { id: 'category-a', name: 'Principales' }, media: [] }) };
    await expect(service.saveDish('user-a', { name: 'Plato A', price: '$125', categoryId: 'category-a' }, 'location-a')).resolves.toMatchObject({ ok: true, dish: { databaseId: 'dish-a', categoryId: 'category-a', priceCents: 12500 } });
  });

  it('returns an active public menu without a table token', async () => {
    const location = { id: 'location-a', slug: 'serena-piso-12', name: 'Serena Piso 12', tagline: 'Alta cocina', logoPath: null, serviceWaiter: true, serviceBill: true, themePrimary: '#173d31', themeAccent: '#f0b44d', themePaper: '#f6f0e5', themeName: 'Editorial', themeFont: 'Clásica cálida' };
    (prisma as any).location = { findFirst: jest.fn().mockResolvedValue(location) };
    (prisma as any).menu = { findFirst: jest.fn().mockResolvedValue({ dishes: [] }) };
    (prisma as any).analyticsEvent = { create: jest.fn() };

    await expect(service.publicMenu('serena-piso-12')).resolves.toMatchObject({ ok: true, restaurant: { id: 'location-a', slug: 'serena-piso-12' }, table: null });
    expect((prisma as any).location.findFirst).toHaveBeenCalledWith({ where: { slug: 'serena-piso-12', status: 'ACTIVE' } });
    expect((prisma as any).analyticsEvent.create).not.toHaveBeenCalled();
  });

  it('keeps QR validation and scan analytics when a table token is provided', async () => {
    const location = { id: 'location-a', slug: 'serena-piso-12', name: 'Serena Piso 12', tagline: '', logoPath: null, status: 'ACTIVE', serviceWaiter: true, serviceBill: true, themePrimary: '#173d31', themeAccent: '#f0b44d', themePaper: '#f6f0e5', themeName: 'Editorial', themeFont: 'Clásica cálida' };
    (prisma as any).table = { findUnique: jest.fn().mockResolvedValue({ id: 'table-a', label: 'Mesa 4', active: true, location }) };
    (prisma as any).menu = { findFirst: jest.fn().mockResolvedValue({ dishes: [] }) };
    (prisma as any).analyticsEvent = { create: jest.fn() };

    await expect(service.publicMenu('serena-piso-12', 'secure-token', 'visitor-a')).resolves.toMatchObject({ table: { id: 'table-a', label: 'Mesa 4' } });
    expect((prisma as any).analyticsEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ locationId: 'location-a', tableId: 'table-a', type: 'QR_SCAN' }) }));
  });

  it('rejects operational public endpoints when no table token resolves to an active table', async () => {
    (prisma as any).table = { findUnique: jest.fn().mockResolvedValue(null) };

    await expect(service.publicServiceRequest({ restaurant: 'serena-piso-12', type: 'waiter' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.publicOrder({ restaurant: 'serena-piso-12', items: [{ dishId: 'dish-a', quantity: 1 }] })).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.publicEvent({ restaurant: 'serena-piso-12', type: 'dish_view', dishId: 'dish-a' })).rejects.toBeInstanceOf(NotFoundException);
  });
});
