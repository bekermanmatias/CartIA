import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes, randomUUID } from 'crypto';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { join, resolve } from 'path';
import { StorageService } from '../media/storage.service';

const SANDBOX_ORGANIZATION_SLUG = 'cartia-demo';
const SANDBOX_LOCATION_SLUG = 'la-oliva';
const SANDBOX_EMAIL = 'demo@cartia.local';

const dishes = [
  { publicId: 'burrata', name: 'Burrata de estación', description: 'Tomates asados, pesto y pan de masa madre.', priceCents: 14800, category: 'Entradas', image: 'burrata.png', video: 'burrata-demo.mp4' },
  { publicId: 'tartar', name: 'Tartar de atún rojo', description: 'Aguacate, sésamo tostado y ponzu cítrico.', priceCents: 18900, category: 'Entradas', image: 'tartar-atun.png', video: 'tartar-atun-demo.mp4' },
  { publicId: 'milanesa', name: 'Milanesa napolitana', description: 'Ternera, tomate de estación y mozzarella gratinada.', priceCents: 17900, category: 'Principales', image: 'milanesa.png', video: 'milanesa-demo.mp4' },
  { publicId: 'pulpo', name: 'Pulpo a la brasa', description: 'Crema de patata, pimentón y aceite verde.', priceCents: 21500, category: 'Principales', image: 'pulpo.png', video: 'pulpo-demo.mp4' },
  { publicId: 'ravioles', name: 'Ravioles de calabaza', description: 'Manteca noisette, salvia y avellanas.', priceCents: 16800, category: 'Principales', image: 'ravioles.png', video: 'ravioles-demo.mp4' },
  { publicId: 'tiramisu', name: 'Tiramisú clásico', description: 'Mascarpone, café intenso y cacao amargo.', priceCents: 9800, category: 'Postres', image: 'tiramisu.png', video: 'tiramisu-demo.mp4' },
] as const;

function fixtureDirectory() {
  const candidates = [resolve(process.cwd(), 'fixtures'), resolve(process.cwd(), 'src/sandbox/fixtures')];
  const directory = candidates.find((candidate) => existsSync(candidate));
  if (!directory) throw new Error('No se encontraron los fixtures del sandbox.');
  return directory;
}

function imageMimeType(fileName: string) {
  if (fileName.endsWith('.png')) return 'image/png';
  if (fileName.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

async function main() {
  const fixtures = fixtureDirectory();
  const files = await Promise.all(dishes.flatMap((dish) => [join(fixtures, 'images', dish.image), join(fixtures, 'videos', dish.video)]).map(async (file) => ({ file, body: await readFile(file) })));
  if (files.some(({ body }) => !body.length)) throw new Error('Uno de los fixtures del sandbox está vacío.');

  // Validate all external configuration before touching database state.
  const storage = new StorageService();
  const prisma = new PrismaClient();
  const uploadedKeys: string[] = [];

  try {
    const previous = await prisma.organization.findUnique({
      where: { slug: SANDBOX_ORGANIZATION_SLUG },
      include: { locations: { include: { media: { select: { storageKey: true } } } } },
    });
    if (previous) {
      for (const key of previous.locations.flatMap((location) => location.media.map((media) => media.storageKey)).filter(Boolean)) await storage.remove(key);
      await prisma.organization.delete({ where: { id: previous.id } });
    }

    const passwordHash = await bcrypt.hash('CartIA-demo-2026!', 12);
    const user = await prisma.user.upsert({
      where: { email: SANDBOX_EMAIL },
      update: { name: 'Equipo CartIA', passwordHash, platformAdmin: true, status: 'ACTIVE' },
      create: { email: SANDBOX_EMAIL, name: 'Equipo CartIA', passwordHash, platformAdmin: true, status: 'ACTIVE' },
    });
    const organization = await prisma.organization.create({ data: { name: 'CartIA Sandbox', slug: SANDBOX_ORGANIZATION_SLUG } });
    await prisma.organizationMembership.create({ data: { userId: user.id, organizationId: organization.id, role: 'OWNER' } });
    const location = await prisma.location.create({
      data: {
        organizationId: organization.id,
        slug: SANDBOX_LOCATION_SLUG,
        name: 'La Oliva',
        tagline: 'Cocina de estación, servicio de mesa y una carta que se mueve.',
      },
    });
    await prisma.locationMembership.create({ data: { userId: user.id, locationId: location.id, role: 'MANAGER' } });
    const menu = await prisma.menu.create({ data: { locationId: location.id, name: 'Carta principal' } });
    const categories = new Map<string, string>();
    for (const [sortOrder, name] of ['Entradas', 'Principales', 'Postres'].entries()) {
      const category = await prisma.category.create({ data: { menuId: menu.id, name, sortOrder } });
      categories.set(name, category.id);
    }
    for (const [sortOrder, dish] of dishes.entries()) {
      const created = await prisma.dish.create({
        data: { menuId: menu.id, categoryId: categories.get(dish.category), publicId: dish.publicId, name: dish.name, description: dish.description, priceCents: dish.priceCents, sortOrder },
      });
      for (const media of [
        { kind: 'IMAGE', fileName: dish.image, directory: 'images', mimeType: imageMimeType(dish.image) },
        { kind: 'VIDEO', fileName: dish.video, directory: 'videos', mimeType: 'video/mp4' },
      ]) {
        const body = await readFile(join(fixtures, media.directory, media.fileName));
        const key = `organizations/${organization.id}/locations/${location.id}/sandbox/${randomUUID()}-${media.fileName}`;
        const stored = await storage.put({ key, body, mimeType: media.mimeType });
        uploadedKeys.push(stored.key);
        await prisma.media.create({
          data: {
            locationId: location.id,
            dishId: created.id,
            kind: media.kind,
            path: stored.url,
            storageKey: stored.key,
            originalName: media.fileName,
            mimeType: media.mimeType,
            bytes: BigInt(body.length),
            published: true,
          },
        });
      }
    }
    for (let number = 1; number <= 12; number += 1) {
      await prisma.table.create({ data: { locationId: location.id, label: `Mesa ${number}`, publicToken: randomBytes(32).toString('hex') } });
    }
    console.log(`Sandbox listo: ${SANDBOX_EMAIL} / CartIA-demo-2026! (${SANDBOX_LOCATION_SLUG})`);
  } catch (error) {
    await Promise.all(uploadedKeys.map((key) => storage.remove(key)));
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
