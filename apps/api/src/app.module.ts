import { Module } from '@nestjs/common';
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

@Module({
  imports: [
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
    NotificationsModule,
    ActivityModule,
    SearchModule,
    DashboardModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
