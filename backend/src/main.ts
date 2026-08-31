import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import { json } from 'express';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('');
  app.use(json({ limit: '1mb' }));
  app.use(cookieParser());
  const PgStore = require('connect-pg-simple')(session);
  app.use(session({
    store: new PgStore({ conString: process.env.DATABASE_URL, createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET ?? 'development-only-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', maxAge: 1000 * 60 * 60 * 12 },
  }));
  app.enableCors({ origin: process.env.APP_URL ?? 'http://localhost', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
  const prisma = app.get(PrismaService);
  await prisma.enableShutdownHooks(app);
  await app.listen(Number(process.env.PORT ?? 3000), '0.0.0.0');
}

bootstrap();
