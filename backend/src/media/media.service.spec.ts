import { BadRequestException } from '@nestjs/common';
import { MediaService } from './media.service';

const location = { id: 'location-a', organizationId: 'organization-a' };
const image = (overrides: Partial<Express.Multer.File> = {}) => ({
  buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  mimetype: 'image/png',
  size: 9,
  originalname: 'plato.png',
  ...overrides,
} as Express.Multer.File);

describe('MediaService', () => {
  const access = { activeLocation: jest.fn(), requireLocation: jest.fn() };
  const prisma = {
    dish: { findFirst: jest.fn() },
    media: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    location: { update: jest.fn() },
  };
  const storage = { put: jest.fn(), remove: jest.fn() };
  const service = new MediaService(prisma as any, access as any, storage as any);

  beforeEach(() => {
    jest.resetAllMocks();
    access.activeLocation.mockResolvedValue(location);
    access.requireLocation.mockResolvedValue(location);
    prisma.dish.findFirst.mockResolvedValue({ id: 'dish-a' });
    prisma.media.findFirst.mockResolvedValue(null);
    storage.put.mockResolvedValue({ key: 'organizations/organization-a/locations/location-a/image/file.png', url: 'https://public.r2.dev/organizations/organization-a/locations/location-a/image/file.png' });
    prisma.media.create.mockResolvedValue({ path: 'https://public.r2.dev/organizations/organization-a/locations/location-a/image/file.png' });
  });

  it('stores a dish image in the active location and returns its public R2 URL', async () => {
    await expect(service.uploadImage('user-a', 'location-a', 'dish-a', image())).resolves.toEqual({
      ok: true,
      image: 'https://public.r2.dev/organizations/organization-a/locations/location-a/image/file.png',
    });
    expect(storage.put).toHaveBeenCalledWith(expect.objectContaining({ mimeType: 'image/png' }));
    expect(prisma.media.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ locationId: 'location-a', dishId: 'dish-a', kind: 'IMAGE' }),
    }));
  });

  it('rejects an invalid image before uploading it', async () => {
    await expect(service.uploadImage('user-a', 'location-a', 'dish-a', image({ mimetype: 'text/plain' }))).rejects.toBeInstanceOf(BadRequestException);
    expect(storage.put).not.toHaveBeenCalled();
  });

  it('replaces the previous R2 object after a successful media update', async () => {
    prisma.media.findFirst.mockResolvedValue({ id: 'media-a', storageKey: 'old/key.png' });
    prisma.media.update.mockResolvedValue({ path: 'https://public.r2.dev/new.png' });
    await service.uploadImage('user-a', 'location-a', 'dish-a', image());
    expect(prisma.media.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'media-a' } }));
    expect(storage.remove).toHaveBeenCalledWith('old/key.png');
  });

  it('removes only media owned by a dish in the active location', async () => {
    prisma.dish.findFirst.mockResolvedValue({ id: 'dish-a' });
    prisma.media.findFirst.mockResolvedValue({ id: 'media-a', storageKey: 'old/video.mp4' });
    prisma.media.delete.mockResolvedValue({ id: 'media-a' });
    await expect(service.removeDishMedia('user-a', 'location-a', 'dish-a', 'VIDEO')).resolves.toEqual({ ok: true, removed: true });
    expect(prisma.media.delete).toHaveBeenCalledWith({ where: { id: 'media-a' } });
    expect(storage.remove).toHaveBeenCalledWith('old/video.mp4');
  });
});
