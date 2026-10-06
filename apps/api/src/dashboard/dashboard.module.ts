import { Module } from '@nestjs/common';
import { DashboardSummaryController } from './summary.controller.js';
@Module({ controllers: [DashboardSummaryController] })
export class DashboardModule {}
