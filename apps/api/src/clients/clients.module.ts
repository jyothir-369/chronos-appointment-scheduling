import { Module } from '@nestjs/common';
import { ClientsController } from './clients.controller.js';

@Module({ controllers: [ClientsController] })
export class ClientsModule {}
