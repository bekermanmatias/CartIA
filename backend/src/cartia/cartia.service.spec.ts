import { BadRequestException } from '@nestjs/common';
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
});
