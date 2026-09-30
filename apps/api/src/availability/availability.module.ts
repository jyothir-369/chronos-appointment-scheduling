import { Module } from '@nestjs/common';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { MaterializerService } from '../materialize/materializer.service';

@Module({ controllers: [AvailabilityController], providers: [AvailabilityService, MaterializerService], exports: [AvailabilityService] })
export class AvailabilityModule {}
