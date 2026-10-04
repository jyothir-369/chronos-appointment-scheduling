import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ProvidersModule } from './providers/providers.module.js';
import { AvailabilityModule } from './availability/availability.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';

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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
