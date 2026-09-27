import { Module, Controller, Get } from '@nestjs/common';
import { ProvidersModule } from './providers/providers.module.js';
import { AvailabilityModule } from './availability/availability.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { HealthModule } from './health/health.module.js';

@Controller('health')
class HealthController {
  @Get()
  health() { return { status: 'ok', service: 'chronos-api', timestamp: new Date().toISOString() }; } // eslint-disable-next-line chronos/no-raw-date -- health timestamp
}

@Module({ imports: [ProvidersModule, AvailabilityModule, BookingsModule, NotificationsModule, HealthModule], controllers: [HealthController], providers: [] })
export class AppModule {}
