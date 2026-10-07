import { Module } from '@nestjs/common';
import dotenv from 'dotenv';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ProvidersModule } from './providers/providers.module.js';
import { AvailabilityModule } from './availability/availability.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ClientsModule } from './clients/clients.module.js';
import { EventTypesModule } from './event-types/event-types.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { BillingModule } from './billing/billing.module.js';
import { AppointmentsModule } from './appointments/appointments.module.js';
import { ActivityModule } from './activity/activity.module.js';
import { SearchModule } from './search/search.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { SlotsModule } from './slots/slots.module.js';
import { EmailModule } from './email/email.module.js';
import { RemindersModule } from './reminders/reminders.module.js';

dotenv.config({ path: new URL('../.env', import.meta.url) });

// Ensure ConfigModule reads the same env file used at runtime
import * as path from 'path';
dotenv.config({ path: path.resolve('apps/api/.env') });

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: [path.resolve('apps/api/.env'), path.resolve('.env')] }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 30,
      },
    ]),
    ProvidersModule,
    AvailabilityModule,
    BookingsModule,
    NotificationsModule,
    HealthModule,
    AuthModule,
    ClientsModule,
    EventTypesModule,
    AnalyticsModule,
    ReportsModule,
    BillingModule,
    AppointmentsModule,
    ActivityModule,
    SearchModule,
    DashboardModule,
    SlotsModule,
    EmailModule,
    RemindersModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
