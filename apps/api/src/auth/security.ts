/**
 * Security hardening — Phase 8 (§400)
 * Rate limiting, authorization, tz validation, PII minimization.
 */
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

function logStructured(level: string, msg: string, ctx?: any) { console.log(level, msg, ctx); }

const apiLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 30, // max 30 requests per minute per IP
  message: { status: 429, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Middleware: Rate limit booking endpoint
 */
export function rateLimitBooking(req: Request, res: Response, next: any) {
  if (req.path.startsWith('/bookings')) {
    apiLimiter(req, res, next);
  } else {
    next();
  }
}

/**
 * Middleware: Strict tz validation
 */
export function validateTimezone(req: Request, res: Response, next: any) {
  const { tz } = req.query;
  if (tz) {
    try {
      logStructured('info', 'tz validation', { tz: String(tz) });
      // Strict IANA validation: must match a known timezone
      if (!isValidIANA(String(tz))) {
        return res.status(400).json({ error: 'Invalid timezone', details: `Not a valid IANA timezone: ${tz}` });
      }
    } catch (e) {
      return res.status(400).json({ error: 'Invalid timezone', details: (e as Error).message });
    }
  }
  next();
}

/**
 * Strict IANA timezone validation
 */
function isValidIANA(tz: string): boolean {
  if (!tz || typeof tz !== 'string') return false;
  try {
    // Use Intl.DateTimeFormat to validate IANA timezone
    const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return fmt.resolvedOptions().timeZone === tz;
  } catch {
    return false;
  }
}

/**
 * Middleware: PII minimization
 * Redact email, name, and client name from logs before sending.
 */
export function sanitizePII(ctx: any) {
  if (ctx.msg && typeof ctx.msg === 'string') {
    // Redact email addresses
    ctx.msg = ctx.msg.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]');
    // Redact names (capitalized words)
    ctx.msg = ctx.msg.replace(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g, '[REDACTED_NAME]');
    // Redact booking IDs (if long)
    if (ctx.bookingId && typeof ctx.bookingId === 'string' && ctx.bookingId.length > 32) {
      ctx.bookingId = ctx.bookingId.slice(0, 8) + '...';
    }
  }
  return ctx;
}

/**
 * Middleware: Authorization check for cancel endpoint
 */
export function requireBookingOwner(req: Request, res: Response, next: any) {
  // Stub: In real app, check booking ownership
  if (req.path.startsWith('/bookings/') && req.path.includes('/cancel')) {
    // Simulate ownership check - real app would check DB
    const clientId = req.headers['x-chronos-client-id'] as string;
    if (!clientId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    // Real implementation would verify client owns booking
    next();
  }
  next();
}
