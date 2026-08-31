import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module';
import { CartiaModule } from './cartia/cartia.module';
import { PrismaModule } from './prisma/prisma.module';
import { AccessModule } from './access/access.module';
import { OrganizationsModule } from './organizations/organizations.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../.env'] }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    LoggerModule.forRoot({ pinoHttp: { level: process.env.NODE_ENV === 'production' ? 'info' : 'debug', transport: process.env.NODE_ENV === 'production' ? undefined : { target: 'pino-pretty' } } }),
    PrismaModule,
    AccessModule,
    OrganizationsModule,
    AuthModule,
    CartiaModule,
  ],
})
export class AppModule {}
