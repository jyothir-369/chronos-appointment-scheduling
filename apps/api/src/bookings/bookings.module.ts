import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller.js';
import { RemindersModule } from '../reminders/reminders.module.js';

@Module({ imports: [RemindersModule], controllers: [BookingsController], providers: [] })
export class BookingsModule {}
