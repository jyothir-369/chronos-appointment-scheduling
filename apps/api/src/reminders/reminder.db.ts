import { Provider } from '@nestjs/common';
import pg from 'pg';

export const REMINDER_DB = 'REMINDER_DB';

export const reminderDbProvider: Provider = {
  provide: REMINDER_DB,
  useFactory: () =>
    new pg.Pool({
      connectionString:
        process.env.DATABASE_URL ||
        'postgresql://chronos:localdev@localhost:5433/chronos',
    }),
};
