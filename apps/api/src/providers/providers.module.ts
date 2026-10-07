import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ProvidersController } from './providers.controller.js';

@Module({ imports: [AuthModule], controllers: [ProvidersController], providers: [], exports: [] })
export class ProvidersModule {}
