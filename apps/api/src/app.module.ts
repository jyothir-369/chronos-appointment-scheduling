import { Module, Controller, Get } from '@nestjs/common';

@Controller('health')
class HealthController {
  @Get()
  health() { return { status: 'ok', service: 'chronos-api', timestamp: new Date().toISOString() }; }
}

@Module({ imports: [], controllers: [HealthController], providers: [] })
export class AppModule {}
