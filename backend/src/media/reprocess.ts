import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { MediaProcessor } from './media-processor.service';
import { StorageService } from './storage.service';

/**
 * One-off maintenance job: re-runs the media pipeline over videos that were
 * uploaded before optimization existed. It re-encodes each video (faststart +
 * compression) and, when the dish has no cover yet, stores the extracted frame
 * as the dish image. Media stays in R2; the old object is removed after the
 * replacement is saved.
 *
 * By default it only touches dishes without a cover (the actual pending work).
 * Pass `--all` to force every video through the pipeline.
 * Pass `--posters` to only regenerate poster frames for covers that were
 * previously created from a video frame.
 *
 * Usage (on the server, with the same env as the API):
 *   npm run media:reprocess
 *   npm run media:reprocess -- --all
 *   npm run media:reprocess -- --posters
 */
const force = process.argv.includes('--all');
const postersOnly = process.argv.includes('--posters');

async function reprocessVideos() {
  const prisma = new PrismaClient();
  const storage = new StorageService();
  const processor = new MediaProcessor();

  let processed = 0;
  let posters = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const videos = await prisma.media.findMany({
      where: { kind: 'VIDEO', published: true, dishId: { not: null } },
      orderBy: { createdAt: 'asc' },
    });
    console.log(`Videos a revisar: ${videos.length}${force ? ' (--all)' : ''}`);

    for (const video of videos) {
      const dishId = video.dishId as string;
      const cover = await prisma.media.findFirst({ where: { locationId: video.locationId, dishId, kind: 'IMAGE' } });
      if (cover && !force) {
        skipped += 1;
        continue;
      }

      try {
        const location = await prisma.location.findUnique({ where: { id: video.locationId }, select: { organizationId: true } });
        if (!location) throw new Error('sucursal no encontrada');

        const response = await fetch(video.path);
        if (!response.ok) throw new Error(`no se pudo descargar el video (${response.status})`);
        const original = Buffer.from(await response.arrayBuffer());

        const optimized = await processor.optimizeVideo(original);
        if (!optimized) throw new Error('ffmpeg no pudo procesar el video');

        const key = `organizations/${location.organizationId}/locations/${video.locationId}/video/${randomUUID()}.mp4`;
        const stored = await storage.put({ key, body: optimized.buffer, mimeType: optimized.mimeType });
        await prisma.media.update({
          where: { id: video.id },
          data: {
            path: stored.url,
            storageKey: stored.key,
            mimeType: optimized.mimeType,
            bytes: BigInt(optimized.buffer.length),
            durationSeconds: optimized.durationSeconds ?? null,
            width: optimized.width ?? null,
            height: optimized.height ?? null,
          },
        });
        await storage.remove(video.storageKey);
        processed += 1;

        if (optimized.poster && !cover) {
          const posterKey = `organizations/${location.organizationId}/locations/${video.locationId}/image/${randomUUID()}.jpg`;
          const poster = await storage.put({ key: posterKey, body: optimized.poster, mimeType: 'image/jpeg' });
          await prisma.media.create({
            data: {
              locationId: video.locationId,
              dishId,
              kind: 'IMAGE',
              path: poster.url,
              storageKey: poster.key,
              originalName: 'miniatura-video.jpg',
              mimeType: 'image/jpeg',
              bytes: BigInt(optimized.poster.length),
              published: true,
            },
          });
          posters += 1;
        }
        console.log(`OK ${dishId}${optimized.poster && !cover ? ' + miniatura' : ''}`);
      } catch (error) {
        failed += 1;
        console.error(`FALLO ${dishId}: ${error instanceof Error ? error.message : error}`);
      }
    }

    console.log(`Listo. Procesados: ${processed} · Miniaturas nuevas: ${posters} · Omitidos: ${skipped} · Fallidos: ${failed}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function regeneratePosters() {
  const prisma = new PrismaClient();
  const storage = new StorageService();
  const processor = new MediaProcessor();

  let regenerated = 0;
  let skipped = 0;
  let failed = 0;

  try {
    const covers = await prisma.media.findMany({
      where: {
        kind: 'IMAGE',
        published: true,
        dishId: { not: null },
        originalName: 'miniatura-video.jpg',
      },
      orderBy: { createdAt: 'asc' },
    });
    console.log(`Miniaturas a regenerar: ${covers.length}`);

    for (const cover of covers) {
      const dishId = cover.dishId as string;
      try {
        const video = await prisma.media.findFirst({
          where: { locationId: cover.locationId, dishId, kind: 'VIDEO', published: true },
        });
        if (!video) {
          skipped += 1;
          console.log(`SIN VIDEO ${dishId}`);
          continue;
        }

        const response = await fetch(video.path);
        if (!response.ok) throw new Error(`no se pudo descargar el video (${response.status})`);
        const videoBuffer = Buffer.from(await response.arrayBuffer());

        const poster = await processor.regeneratePoster(videoBuffer);
        if (!poster) throw new Error('ffmpeg no pudo extraer la miniatura');
        if (!cover.storageKey) throw new Error('la miniatura no tiene storageKey');

        await storage.put({ key: cover.storageKey, body: poster, mimeType: 'image/jpeg' });
        await prisma.media.update({
          where: { id: cover.id },
          data: {
            mimeType: 'image/jpeg',
            bytes: BigInt(poster.length),
          },
        });
        regenerated += 1;
        console.log(`OK ${dishId} · miniatura regenerada (${poster.length} bytes)`);
      } catch (error) {
        failed += 1;
        console.error(`FALLO ${dishId}: ${error instanceof Error ? error.message : error}`);
      }
    }

    console.log(`Listo. Regeneradas: ${regenerated} · Omitidas: ${skipped} · Fallidas: ${failed}`);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  if (postersOnly) {
    await regeneratePosters();
  } else {
    await reprocessVideos();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
