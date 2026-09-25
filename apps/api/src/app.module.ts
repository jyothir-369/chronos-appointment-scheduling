import { Module, Controller, Get } from '@nestjs/common';
import { BookingsModule } from './bookings/bookings.module.js';

@Controller('health')
class HealthController {
  @Get()
  health() { return { status: 'ok', service: 'chronos-api', timestamp: new Date().toISOString() }; }
}

@Module({ imports: [BookingsModule], controllers: [HealthController], providers: [] })
export class AppModule {}
