import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminAuthController } from '../auth/admin-auth.controller.js';
import { AdminSessionService } from '../auth/admin-session.service.js';
import { PasswordService } from '../auth/password.service.js';

@Module({
  controllers: [AdminController, AdminAuthController],
  providers: [AdminSessionService, PasswordService],
  exports: [AdminSessionService],
})
export class AdminModule {}
