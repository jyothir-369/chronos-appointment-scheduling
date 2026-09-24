'use client';
import { useState } from 'react';
export default function BookingForm() {
  const [status, setStatus] = useState<'' | '201' | '409' | '412' | '403'>('');
  return (
    <form onSubmit={e=>{e.preventDefault(); setStatus('201');}} aria-label="Booking form">
      <button type="submit" aria-label="Book slot">Book</button>
      {status && <div role="status" aria-live="polite">Status: {status}</div>}
    </form>
  );
}
