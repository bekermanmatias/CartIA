import { Module } from '@nestjs/common';
import { CartiaController } from './cartia.controller';
import { CartiaService } from './cartia.service';
import { AccessModule } from '../access/access.module';

@Module({ imports: [AccessModule], controllers: [CartiaController], providers: [CartiaService] })
export class CartiaModule {}
