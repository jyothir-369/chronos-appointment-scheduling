/**
 * API error → actionable user message mapping (§3.3)
 * Covers 409 slot_unavailable, 412 version_conflict, 403 unauthorized, 422 idempotency_key_reuse
 */
export function mapApiError(status: number, errorCode?: string): string {
  switch (status) {
    case 409:
      return errorCode === 'slot_unavailable'
        ? 'That time slot is no longer available. Please refresh and choose another slot.'
        : 'Conflict — please try again.';
    case 412:
      return 'The booking information changed. Please refresh availability and try again.';
    case 403:
      return 'You are not authorized to perform this action.';
    case 422:
      return 'This request was already processed (duplicate idempotency key). No new booking was created.';
    case 401:
      return 'Please sign in to book.';
    case 400:
      return 'Invalid request — please check your input.';
    default:
      return `Error ${status}. Please try again.`;
  }
}
