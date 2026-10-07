import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailGateway } from './email.gateway.js';
import { UnsubscribeController } from './unsubscribe.controller.js';

@Module({
  imports: [ConfigModule],
  controllers: [UnsubscribeController],
  providers: [EmailGateway],
  exports: [EmailGateway],
})
export class EmailModule {}
