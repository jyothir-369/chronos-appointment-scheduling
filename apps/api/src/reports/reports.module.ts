import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';

@Module({ controllers: [ReportsController], providers: [] })
export class ReportsModule {}
