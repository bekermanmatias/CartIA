import { Module } from '@nestjs/common';
import { CartiaController } from './cartia.controller';
import { CartiaService } from './cartia.service';

@Module({ controllers: [CartiaController], providers: [CartiaService] })
export class CartiaModule {}
