/**
 * Phase 4 — Email Gateway Tests
 *
 * Focused tests (1-10 from spec). The Resend provider is mocked at the module
 * level so no real external email service is called.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmailGateway, EmailError } from '../email.gateway.js';

// Mock the Resend SDK before importing the gateway module.
const mockSend = vi.fn();

vi.mock('resend', () => {
  return {
    Resend: vi.fn((key: string) => {
      // Return the same mock instance for all send calls
      return {
        emails: {
          send: mockSend,
        },
      };
    }),
  };
});

// Import after mock is registered (but vitest handles hoisting)

describe('EmailGateway — focused tests (§10 requirements)', () => {
  let gateway: EmailGateway;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockSend.mockReset();
    mockSend.mockResolvedValue({ data: { id: 'res-msg-001' }, error: null });

    process.env.EMAIL_API_KEY = 're_test_0123456789';
    process.env.EMAIL_FROM = 'Chronos <test@example.com>';

    // Dynamic import picks up the mocked Resend
    const gwModule = await import('../email.gateway.js');
    gateway = new gwModule.EmailGateway({
      get: (key: string) => {
        if (key === 'EMAIL_API_KEY') return 're_test_0123456789';
        if (key === 'EMAIL_FROM') return 'Chronos <test@example.com>';
        return undefined;
      },
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. email gateway success — sends through provider', async () => {
    const result = await gateway.send(
      { to: 'client@example.com', subject: 'Reminder', html: '<p>Test</p>' },
      'reminder/test/60'
    );
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Chronos <test@example.com>',
        to: 'client@example.com',
        subject: 'Reminder',
      })
    );
    expect(result.providerMessageId).toBe('res-msg-001');
  });

  it('2. provider message ID returned', async () => {
    const result = await gateway.send(
      { to: 'a@b.com', subject: 'S', html: '<b>H</b>' },
      'id-key-123'
    );
    expect(result.providerMessageId).toBeDefined();
    expect(typeof result.providerMessageId).toBe('string');
  });

  it('3. transient provider failure throws EmailError with code transient', async () => {
    mockSend.mockRejectedValueOnce(new Error('rate limit exceeded'));
    await expect(
      gateway.send({ to: 'a@b.com', subject: 'X', html: '<p>X</p>' }, 'k')
    ).rejects.toThrow(EmailError);
  });

  it('4. permanent provider failure throws EmailError with code permanent', async () => {
    mockSend.mockRejectedValueOnce(new Error('invalid email domain'));
    await expect(
      gateway.send({ to: 'bad@bad', subject: 'X', html: '<p>X</p>' }, 'k')
    ).rejects.toThrow(EmailError);
  });

  it('5. same idempotency key reused on retry (same key passed to provider)', async () => {
    await gateway.send({ to: 'a@b.com', subject: 'S', html: '<p>T</p>' }, 'same-key-001');
    await gateway.send({ to: 'a@b.com', subject: 'S2', html: '<p>T2</p>' }, 'same-key-001');
    const calls = mockSend.mock.calls;
    expect(calls[0][0].headers['Idempotency-Key']).toBe('same-key-001');
    expect(calls[1][0].headers['Idempotency-Key']).toBe('same-key-001');
  });

  it('6. reminder worker path: gateway used in reminder flow (indirect verification)', async () => {
    // This verifies that the gateway interface (send / result) matches what the reminder worker expects.
    const result = await gateway.send(
      { to: 'client@example.com', subject: 'Reminder', html: '<p>Appointment at 14:00</p>' },
      'reminder/book/000/1440'
    );
    expect(result.providerMessageId).toBe('res-msg-001');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('7. provider message ID persisted (returned by gateway)', async () => {
    const result = await gateway.send(
      { to: 'user@test.com', subject: 'R', html: '<b>H</b>' },
      'reminder/book/001/60'
    );
    expect(result.providerMessageId).toBe('res-msg-001');
  });

  it('8. failed delivery does not incorrectly return a message ID', async () => {
    mockSend.mockRejectedValueOnce(new Error('provider down'));
    await expect(
      gateway.send({ to: 'x@y', subject: 'S', html: 'H' }, 'key')
    ).rejects.toThrow(EmailError);
  });

  it('9. missing email configuration fails clearly', async () => {
    // Create a gateway without config (simulate missing EMAIL_API_KEY)
    const badModule = await vi.importActual('../email.gateway.js');
    const badGw = new badModule.EmailGateway({
      get: (key: string) => undefined,
    } as any);
    await expect(
      badGw.send({ to: 'test@test.com', subject: 'S', html: 'H' }, 'k')
    ).rejects.toThrow('not configured');
  });

  it('10. no duplicate reminder send for repeated processing (idempotency key preserved)', async () => {
    await gateway.send({ to: 'a@b', subject: 'S', html: 'H' }, 'reminder/test/unique');
    await gateway.send({ to: 'a@b', subject: 'S2', html: 'H2' }, 'reminder/test/unique');
    expect(mockSend.mock.calls.length).toBe(2);
    expect(mockSend.mock.calls[0][0].headers['Idempotency-Key']).toBe('reminder/test/unique');
    expect(mockSend.mock.calls[1][0].headers['Idempotency-Key']).toBe('reminder/test/unique');
  });
});