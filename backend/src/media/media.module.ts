import { Module } from '@nestjs/common';
import { AccessModule } from '../access/access.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { StorageService } from './storage.service';

@Module({
  imports: [PrismaModule, AccessModule],
  controllers: [MediaController],
  providers: [StorageService, MediaService],
})
export class MediaModule {}
