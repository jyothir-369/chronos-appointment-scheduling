import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller.js';

@Module({ controllers: [AnalyticsController], providers: [] })
export class AnalyticsModule {}
