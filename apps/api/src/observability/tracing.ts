/**
 * OpenTelemetry tracing helpers — Phase 8 (§395)
 * NestJS 12 ships native observability SDK; provide a minimal tracing
 * wrapper that integrates with the existing service layer.
 */

export interface SpanContext {
  traceId?: string;
  spanId?: string;
  bookingId?: string;
  slotId?: string;
  idempotencyKey?: string;
}

export function startSpan(name: string, ctx?: SpanContext) {
  const traceId = ctx?.traceId || crypto.randomUUID();
  const spanId = crypto.randomUUID();
  // In production this would create a real OTel span; here we record it
  const startTime = Date.now();
  return {
    traceId,
    spanId,
    name,
    startTime,
    end: () => {
      const durationMs = Date.now() - startTime;
      // Structured log of span completion
      console.log(JSON.stringify({
        ts: new Date().toISOString(),
        otel: { traceId, spanId, name },
        durationMs,
        ...ctx,
      }));
    },
  };
}
