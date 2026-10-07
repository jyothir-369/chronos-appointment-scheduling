/**
 * Phase 4 â€” Email Gateway
 * Small, explicit gateway for sending emails via Resend.
 * Accepts rendered email data, sends through provider, returns provider message ID.
 * Supports idempotency keys, distinguishes transient/permanent failures.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendResult {
  providerMessageId: string;
}

export class EmailError extends Error {
  constructor(
    message: string,
    public readonly code: 'transient' | 'permanent' | 'configuration',
    public readonly providerMessageId?: string
  ) {
    super(message);
    this.name = 'EmailError';
  }
}

@Injectable()
export class EmailGateway {
  private readonly logger = new Logger(EmailGateway.name);
  private readonly client: Resend;
  private readonly from: string;
  private readonly isConfigured: boolean;

  constructor(private readonly config?: ConfigService) {
    // Defensive: ConfigService may not be injected in some module configurations
    const configService = config || (globalThis as any).__configServiceInstance || undefined;
    const apiKey = (configService ? (configService.get as any)('EMAIL_API_KEY') : process.env.EMAIL_API_KEY) || undefined;
    const from = (configService ? (configService.get as any)('EMAIL_FROM') : process.env.EMAIL_FROM) || 'Chronos <no-reply@chronos.app>';

    if (!apiKey) {
      this.logger.warn('EMAIL_API_KEY not configured â€” email gateway will fail clearly on send');
      this.isConfigured = false;
      this.client = null as any;
      this.from = from;
      return;
    }

    this.client = new Resend(apiKey);
    this.from = from;
    this.isConfigured = true;
    this.logger.log('Email gateway initialized with Resend');
  }

  /**
   * Send an email with idempotency key.
   * Returns provider message ID on success.
   * Throws EmailError with code 'transient' | 'permanent' | 'configuration'.
   */
  async send(data: EmailData, idempotencyKey: string): Promise<SendResult> {
    if (!this.isConfigured) {
      throw new EmailError(
        'Email gateway not configured: EMAIL_API_KEY is missing',
        'configuration'
      );
    }

    try {
      const sendData: any = {
        from: this.from,
        to: data.to,
        subject: data.subject,
        html: data.html,
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      };
      if (data.text !== undefined) sendData.text = data.text;

      const result = await this.client.emails.send(sendData);

      if (result.error) {
        // Resend returns error in result object for some failures
        const isTransient = this.isTransientError(result.error);
        throw new EmailError(
          `Resend error: ${result.error.message}`,
          isTransient ? 'transient' : 'permanent'
        );
      }

      this.logger.log(`Email sent: ${result.data?.id} (idempotencyKey: ${idempotencyKey})`);
      return { providerMessageId: result.data?.id ?? 'unknown' };
    } catch (err: any) {
      if (err instanceof EmailError) throw err;

      // Network/transient errors
      if (this.isTransientError(err)) {
        throw new EmailError(
          `Transient email error: ${err.message}`,
          'transient'
        );
      }

      // Permanent provider errors
      throw new EmailError(
        `Permanent email error: ${err.message}`,
        'permanent'
      );
    }
  }

  /**
   * Check if an error is transient (should retry).
   * Resend-specific: 429 rate limit, 5xx server errors, network errors.
   */
  private isTransientError(err: any): boolean {
    if (!err) return false;

    // Resend error structure
    if (err.statusCode === 429 || err.statusCode >= 500) return true;

    // Network errors
    if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') return true;

    // Generic error message checks
    const message = err.message?.toLowerCase() ?? '';
    if (message.includes('rate limit') || message.includes('too many requests')) return true;
    if (message.includes('timeout') || message.includes('network')) return true;
    if (message.includes('503') || message.includes('502') || message.includes('504')) return true;

    return false;
  }

  /**
   * Health check for the email gateway.
   */
  async healthCheck(): Promise<{ configured: boolean; reachable: boolean; providerError?: string }> {
    if (!this.isConfigured) {
      return { configured: false, reachable: false, providerError: 'EMAIL_API_KEY missing' };
    }
    return { configured: true, reachable: false, providerError: 'REACHABILITY_NOT_VERIFIED' };
  }
}
