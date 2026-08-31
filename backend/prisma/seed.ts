import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('CartIA-demo-2026!', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@cartia.local' },
    update: { name: 'Equipo CartIA', passwordHash, platformAdmin: true, status: 'ACTIVE' },
    create: { email: 'demo@cartia.local', name: 'Equipo CartIA', passwordHash, platformAdmin: true },
  });
  const organization = await prisma.organization.upsert({
    where: { slug: 'cartia-demo' }, update: { name: 'CartIA Demo' }, create: { slug: 'cartia-demo', name: 'CartIA Demo' },
  });
  await prisma.organizationMembership.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
    update: { role: 'OWNER' }, create: { userId: user.id, organizationId: organization.id, role: 'OWNER' },
  });
  const location = await prisma.location.upsert({
    where: { slug: 'la-oliva' },
    update: { organizationId: organization.id, name: 'La Oliva', tagline: 'Cocina de estación, servicio de mesa y una carta que se mueve.' },
    create: { organizationId: organization.id, slug: 'la-oliva', name: 'La Oliva', tagline: 'Cocina de estación, servicio de mesa y una carta que se mueve.' },
  });
  await prisma.locationMembership.upsert({
    where: { userId_locationId: { userId: user.id, locationId: location.id } },
    update: { role: 'MANAGER' }, create: { userId: user.id, locationId: location.id, role: 'MANAGER' },
  });
  const menu = await prisma.menu.upsert({
    where: { locationId_name: { locationId: location.id, name: 'Carta principal' } },
    update: { active: true }, create: { locationId: location.id, name: 'Carta principal' },
  });
  const category = await prisma.category.upsert({
    where: { menuId_name: { menuId: menu.id, name: 'Principales' } }, update: {}, create: { menuId: menu.id, name: 'Principales' },
  });
  const dishes = [
    ['burrata', 'Burrata de estación', 'Tomates asados, pesto y pan de masa madre.', 14800, '/assets/food-burrata.jpg'],
    ['risotto', 'Risotto de hongos', 'Arroz cremoso, hongos de bosque y parmesano.', 18200, '/assets/food-risotto.jpg'],
    ['asado', 'Ojo de bife', 'Papas crocantes, chimichurri de hierbas y jugo de carne.', 24500, '/assets/food-steak.jpg'],
  ] as const;
  for (const [publicId, name, description, priceCents, path] of dishes) {
    const dish = await prisma.dish.upsert({
      where: { menuId_publicId: { menuId: menu.id, publicId } },
      update: { name, description, priceCents, categoryId: category.id, available: true },
      create: { menuId: menu.id, categoryId: category.id, publicId, name, description, priceCents, sortOrder: dishes.findIndex((item) => item[0] === publicId) },
    });
    const media = await prisma.media.findFirst({ where: { dishId: dish.id, kind: 'IMAGE' } });
    if (!media) await prisma.media.create({ data: { locationId: location.id, dishId: dish.id, kind: 'IMAGE', path, originalName: path.split('/').pop()!, mimeType: 'image/jpeg', bytes: BigInt(0) } });
  }
  for (let number = 1; number <= 12; number += 1) {
    const label = `Mesa ${number}`;
    const exists = await prisma.table.findFirst({ where: { locationId: location.id, label } });
    if (!exists) await prisma.table.create({ data: { locationId: location.id, label, publicToken: randomBytes(32).toString('hex') } });
  }
  console.log('Seed listo: demo@cartia.local / CartIA-demo-2026!');
}

main().finally(() => prisma.$disconnect());
