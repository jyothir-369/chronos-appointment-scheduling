/**
 * Stage B — Structured logging foundation (§4 / Phase 8)
 * Replaces ad-hoc console.log with Pino-style structured JSON.
 * Every entry carries correlation/request ID.
 */

export interface LogContext {
  correlationId: string;
  requestId?: string;
  userId?: string;
  path?: string;
  method?: string;
}

function nowIso(): string {
  return new Date().toISOString(); // eslint-disable-next-line chronos/no-raw-date -- log timestamp adapter only
}

export function createLogger(ctx?: Partial<LogContext>) {
  const correlationId = ctx?.correlationId || crypto.randomUUID();
  return {
    info: (msg: string, extra?: Record<string, unknown>) =>
      console.log(JSON.stringify({ level: 'info', time: nowIso(), msg, correlationId, ...extra, ...ctx })),
    warn: (msg: string, extra?: Record<string, unknown>) =>
      console.log(JSON.stringify({ level: 'warn', time: nowIso(), msg, correlationId, ...extra, ...ctx })),
    error: (msg: string, err?: unknown, extra?: Record<string, unknown>) =>
      console.log(JSON.stringify({ level: 'error', time: nowIso(), msg, correlationId, error: err instanceof Error ? err.message : String(err), ...extra, ...ctx })),
    debug: (msg: string, extra?: Record<string, unknown>) =>
      console.log(JSON.stringify({ level: 'debug', time: nowIso(), msg, correlationId, ...extra, ...ctx })),
    child: (extraCtx: Partial<LogContext>) => createLogger({ ...ctx, ...extraCtx }),
  };
}

export const logger = createLogger();
