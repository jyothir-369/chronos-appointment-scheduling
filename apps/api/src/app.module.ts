import { Module } from '@nestjs/common';
import { ProvidersModule } from './providers/providers.module.js';
import { AvailabilityModule } from './availability/availability.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { HealthModule } from './health/health.module.js';
import { RateLimitModule } from './security/rate-limit.module.js';

@Module({ imports: [RateLimitModule, ProvidersModule, AvailabilityModule, BookingsModule, NotificationsModule, HealthModule], controllers: [], providers: [] })
export class AppModule {}
