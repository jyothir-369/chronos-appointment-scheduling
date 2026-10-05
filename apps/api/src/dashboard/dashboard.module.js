import { Module } from '@nestjs/common';
import { DashboardSummaryController } from './summary.controller';
@Module({ controllers: [DashboardSummaryController] })
export class DashboardModule {}
