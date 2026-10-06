import { Module } from '@nestjs/common';
import { EventTypesController } from './event-types.controller.js';

@Module({ controllers: [EventTypesController] })
export class EventTypesModule {}
