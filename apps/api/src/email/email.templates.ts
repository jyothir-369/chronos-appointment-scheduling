/**
 * Phase 4 — Reminder Email Templates
 * Renders reminder emails for 24h and 1h reminders.
 * Includes unsubscribe link/mechanism.
 */
import { clock } from '@chronos/time';
const T = (globalThis as any).Temporal;

export interface ReminderEmailData {
  to: string;
  clientName: string;
  providerName: string;
  appointmentDate: string;
  appointmentTime: string;
  clientTimezone: string;
  offsetMinutes: number;
  bookingId: string;
  unsubscribeUrl: string;
}

/**
 * Render reminder email HTML and text.
 * Uses inline styles for email compatibility.
 */
export function renderReminderEmail(data: ReminderEmailData): { html: string; text: string } {
  const dateTime = new Date(data.appointmentDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: data.clientTimezone,
  });

  const timeLabel = data.offsetMinutes === 1440 ? '24-hour' : '1-hour';
  const subject = `Reminder: Your appointment with ${data.providerName} is in ${timeLabel}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #6366f1, #4f46e5); padding: 30px; border-radius: 16px 16px 0 0; color: white;">
        <h1 style="margin: 0; font-size: 24px;">Appointment Reminder</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">${timeLabel} notice</p>
      </div>

      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          Hi ${escapeHtml(data.clientName)},
        </p>

        <p style="font-size: 16px; margin-bottom: 20px;">
          This is a reminder for your upcoming appointment with
          <strong>${escapeHtml(data.providerName)}</strong>.
        </p>

        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Date &amp; Time</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${dateTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Timezone</td>
              <td style="padding: 8px 0; font-size: 14px;">${escapeHtml(data.clientTimezone)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Booking ID</td>
              <td style="padding: 8px 0; font-size: 14px; font-family: monospace;">${escapeHtml(data.bookingId)}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #64748b; margin-bottom: 20px;">
          If you no longer need this appointment, please cancel at least 24 hours in advance.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />

        <p style="font-size: 12px; color: #94a3b8; margin-bottom: 10px;">
          <a href="${escapeHtml(data.unsubscribeUrl)}" style="color: #6366f1; text-decoration: underline;">
            Unsubscribe from appointment reminders
          </a>
        </p>

        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
          This is an automated reminder from Chronos. Please do not reply to this email.
        </p>
      </div>
    </div>
  `;

  const text = `Reminder: Your appointment with ${data.providerName} is in ${timeLabel}

Date & Time: ${dateTime}
Timezone: ${data.clientTimezone}
Booking ID: ${data.bookingId}

If you no longer need this appointment, please cancel at least 24 hours in advance.

Unsubscribe: ${data.unsubscribeUrl}

This is an automated reminder from Chronos. Please do not reply to this email.`;

  return { html, text: text.trim() };
}

/**
 * Render cancellation email HTML and text.
 */
export function renderCancellationEmail(data: {
  providerName: string;
  appointmentDate: string;
  clientTimezone: string;
  bookingId: string;
}): { html: string; text: string } {
  const dateTime = new Date(data.appointmentDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: data.clientTimezone,
  });

  const subject = `Appointment Cancelled: ${dateTime}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 30px; border-radius: 16px 16px 0 0; color: white;">
        <h1 style="margin: 0; font-size: 24px;">Appointment Cancelled</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Your appointment has been cancelled</p>
      </div>

      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          Hi, your appointment with <strong>${escapeHtml(data.providerName)}</strong> on <strong>${dateTime}</strong> has been cancelled.
        </p>

        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Date &amp; Time</td>
              <td style="padding: 8px 0; font-size: 14px;">${dateTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Booking ID</td>
              <td style="padding: 8px 0; font-size: 14px; font-family: monospace;">${escapeHtml(data.bookingId)}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #64748b;">
          If this was a mistake, you can reschedule your appointment.
        </p>
      </div>
    </div>
  `;

  const text = `Appointment Cancelled: Your appointment with ${data.providerName} on ${dateTime} has been cancelled.

Booking ID: ${data.bookingId}

If this was a mistake, you can reschedule your appointment.`;

  return { html, text: text.trim() };
}

/**
 * Render confirmation email HTML and text.
 */
export function renderConfirmationEmail(data: {
  clientName: string;
  providerName: string;
  appointmentDate: string;
  clientTimezone: string;
  bookingId: string;
}): { html: string; text: string } {
  const dateTime = new Date(data.appointmentDate).toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: data.clientTimezone,
  });

  const subject = `Appointment Confirmed: ${dateTime}`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #10b981, #059669); padding: 30px; border-radius: 16px 16px 0 0; color: white;">
        <h1 style="margin: 0; font-size: 24px;">Appointment Confirmed ✓</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Your appointment is scheduled</p>
      </div>

      <div style="background: #f8fafc; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e2e8f0;">
        <p style="font-size: 16px; margin-bottom: 20px;">
          Hi ${escapeHtml(data.clientName)}, your appointment with <strong>${escapeHtml(data.providerName)}</strong> is confirmed.
        </p>

        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Date &amp; Time</td>
              <td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${dateTime}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Timezone</td>
              <td style="padding: 8px 0; font-size: 14px;">${escapeHtml(data.clientTimezone)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Booking ID</td>
              <td style="padding: 8px 0; font-size: 14px; font-family: monospace;">${escapeHtml(data.bookingId)}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 14px; color: #64748b;">
          You'll receive a reminder 1 hour before your appointment.
        </p>
      </div>
    </div>
  `;

  const text = `Appointment Confirmed: Your appointment with ${data.providerName} on ${dateTime} is confirmed.

Booking ID: ${data.bookingId}
Timezone: ${data.clientTimezone}

You'll receive a reminder 1 hour before your appointment.`;

  return { html, text: text.trim() };
}

/**
 * Escape HTML to prevent XSS in email templates.
 */
function escapeHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}