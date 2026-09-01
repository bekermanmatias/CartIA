import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { AccessService } from '../access/access.service';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';

type UploadFile = Express.Multer.File;
type MediaKind = 'IMAGE' | 'VIDEO' | 'LOGO';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const imageMimeTypes = new Map([['image/jpeg', 'jpg'], ['image/png', 'png'], ['image/webp', 'webp']]);

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly storage: StorageService,
  ) {}

  private validate(file: UploadFile | undefined, kind: MediaKind) {
    if (!file?.buffer?.length) throw new BadRequestException('Selecciona un archivo para subir.');
    const allowed = kind === 'VIDEO' ? new Map([['video/mp4', 'mp4']]) : imageMimeTypes;
    const maxBytes = kind === 'VIDEO' ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
    const extension = allowed.get(file.mimetype);
    if (!extension) throw new BadRequestException(kind === 'VIDEO' ? 'El video debe ser un MP4.' : 'La imagen debe ser JPG, PNG o WebP.');
    if (file.size > maxBytes) throw new BadRequestException(kind === 'VIDEO' ? 'El video supera el máximo de 50 MB.' : 'La imagen supera el máximo de 10 MB.');
    return extension;
  }

  private async activeLocation(userId: string, activeLocationId: string | undefined, permission: 'menu.manage' | 'location.manage') {
    const location = await this.access.activeLocation(userId, activeLocationId);
    await this.access.requireLocation(userId, location.id, permission);
    return location;
  }

  private async persist(input: {
    location: { id: string; organizationId: string };
    dishId?: string;
    kind: MediaKind;
    file: UploadFile;
    metadata?: { durationSeconds?: number; width?: number; height?: number };
  }) {
    const extension = this.validate(input.file, input.kind);
    const key = `organizations/${input.location.organizationId}/locations/${input.location.id}/${input.kind.toLowerCase()}/${randomUUID()}.${extension}`;
    const stored = await this.storage.put({ key, body: input.file.buffer, mimeType: input.file.mimetype });
    const previous = await this.prisma.media.findFirst({
      where: { locationId: input.location.id, dishId: input.dishId ?? null, kind: input.kind },
      orderBy: { updatedAt: 'desc' },
    });

    try {
      const values = {
        path: stored.url,
        storageKey: stored.key,
        originalName: input.file.originalname.slice(0, 255),
        mimeType: input.file.mimetype,
        bytes: BigInt(input.file.size),
        durationSeconds: input.metadata?.durationSeconds ?? null,
        width: input.metadata?.width ?? null,
        height: input.metadata?.height ?? null,
        published: true,
      };
      const media = previous
        ? await this.prisma.media.update({ where: { id: previous.id }, data: values })
        : await this.prisma.media.create({ data: { locationId: input.location.id, dishId: input.dishId, kind: input.kind, ...values } });
      await this.storage.remove(previous?.storageKey);
      return media;
    } catch (error) {
      await this.storage.remove(stored.key);
      throw error;
    }
  }

  async uploadImage(userId: string, activeLocationId: string | undefined, dishId: string, file: UploadFile) {
    const location = await this.activeLocation(userId, activeLocationId, 'menu.manage');
    const dish = await this.prisma.dish.findFirst({ where: { id: dishId, menu: { locationId: location.id } } });
    if (!dish) throw new NotFoundException('El plato no pertenece a la sucursal activa.');
    const media = await this.persist({ location, dishId: dish.id, kind: 'IMAGE', file });
    return { ok: true, image: media.path };
  }

  async uploadVideo(userId: string, activeLocationId: string | undefined, dishId: string, file: UploadFile, metadata: { duration?: string; width?: string; height?: string }) {
    const location = await this.activeLocation(userId, activeLocationId, 'menu.manage');
    const dish = await this.prisma.dish.findFirst({ where: { id: dishId, menu: { locationId: location.id } } });
    if (!dish) throw new NotFoundException('El plato no pertenece a la sucursal activa.');
    const number = (value: string | undefined, max: number) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 0 && parsed <= max ? parsed : undefined;
    };
    const media = await this.persist({
      location,
      dishId: dish.id,
      kind: 'VIDEO',
      file,
      metadata: { durationSeconds: number(metadata.duration, 3_600), width: number(metadata.width, 10_000), height: number(metadata.height, 10_000) },
    });
    return { ok: true, video: this.videoPayload(media) };
  }

  async uploadLogo(userId: string, activeLocationId: string | undefined, file: UploadFile) {
    const location = await this.activeLocation(userId, activeLocationId, 'location.manage');
    const media = await this.persist({ location, kind: 'LOGO', file });
    await this.prisma.location.update({ where: { id: location.id }, data: { logoPath: media.path } });
    return { ok: true, logo: media.path };
  }

  private videoPayload(media: { path: string; originalName: string; bytes: bigint; mimeType: string; durationSeconds: Prisma.Decimal | null; width: number | null; height: number | null; published: boolean }) {
    return {
      url: media.path,
      fileName: media.originalName,
      size: Number(media.bytes),
      type: media.mimeType,
      duration: media.durationSeconds ? Number(media.durationSeconds) : null,
      width: media.width,
      height: media.height,
      published: media.published,
    };
  }
}
