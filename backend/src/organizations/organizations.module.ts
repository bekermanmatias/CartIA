import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({ imports: [PrismaModule, AccessModule], controllers: [OrganizationsController], providers: [OrganizationsService] })
export class OrganizationsModule {}
