import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller.js';
import { AvailabilityService } from './availability.service.js';
import { MaterializerService } from '../materialize/materializer.service.js';

@Module({ controllers: [AvailabilityController], providers: [AvailabilityService, MaterializerService], exports: [AvailabilityService] })
export class AvailabilityModule {}
