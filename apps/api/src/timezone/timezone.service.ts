import { Injectable } from '@nestjs/common';

@Injectable()
export class TimezoneService {
  formatTimeInZone(instantUtc: Date, ianaZone: string): string {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: ianaZone,
      hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(instantUtc);
  }

  isValidIana(tz: string): boolean {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }

  toLocalDate(instantUtc: Date, ianaZone: string): string {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: ianaZone, year: 'numeric', month: 'numeric', day: 'numeric',
    }).format(instantUtc);
  }
}
