import { Module } from '@nestjs/common';
import { SlotsController } from './slots.controller.js';

@Module({ controllers: [SlotsController], providers: [] })
export class SlotsModule {}
