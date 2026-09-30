import { Module } from '@nestjs/common';
import { CartiaController } from './cartia.controller';
import { CartiaService } from './cartia.service';
import { AccessModule } from '../access/access.module';
import { MediaModule } from '../media/media.module';

@Module({ imports: [AccessModule, MediaModule], controllers: [CartiaController], providers: [CartiaService] })
export class CartiaModule {}
