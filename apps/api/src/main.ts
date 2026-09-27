import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  // Explicit environment-driven allow-list (never origin: true + credentials: true)
  const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['https://app.chronos.example'];
  if (process.env.NODE_ENV === 'development') allowedOrigins.push('http://localhost:3000');
  app.enableCors({ origin: allowedOrigins, credentials: true });
  await app.listen(3001);
  console.log('Chronos API listening on http://localhost:3001');
}
bootstrap();
