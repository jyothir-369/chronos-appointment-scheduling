import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { ProviderAuthController } from './provider-auth.controller.js';
import { ProviderSessionService } from './provider-session.service.js';
import { PasswordService } from './password.service.js';
import { ProviderAuthGuard } from './provider-auth.guard.js';

@Module({
  controllers: [AuthController, ProviderAuthController],
  providers: [ProviderSessionService, PasswordService, ProviderAuthGuard],
  exports: [ProviderAuthGuard, ProviderSessionService],
})
export class AuthModule {}
