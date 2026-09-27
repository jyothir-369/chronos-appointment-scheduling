import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { createLogger } from '../observability/logger.js';

/**
 * Correlation-ID interceptor (§4)
 * Propagates request/correlation ID from header or generates UUID.
 * Attaches to response header for cross-service tracing.
 */
@Injectable()
export class CorrelationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const correlationId = request.headers['x-correlation-id'] || crypto.randomUUID();
    request.correlationId = correlationId;
    const response = context.switchToHttp().getResponse();
    response.setHeader('X-Correlation-Id', correlationId);
    const log = createLogger({ correlationId, path: request.path, method: request.method });
    log.info('request started');
    return next.handle().pipe(
      tap({
        next: () => log.info('request completed'),
        error: (err) => log.error('request failed', err),
      })
    );
  }
}
