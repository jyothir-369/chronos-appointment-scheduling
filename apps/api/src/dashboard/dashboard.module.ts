import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DashboardSummaryController } from './summary.controller.js';
@Module({ imports: [AuthModule], controllers: [DashboardSummaryController] })
export class DashboardModule {}
