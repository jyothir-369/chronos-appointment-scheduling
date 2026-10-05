import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

function forwardCookie(req: NextRequest): string | undefined {
  return req.headers.get("cookie") || undefined;
}

function mapBookingStatus(backendStatus: string): string {
  const s = (backendStatus || "").toLowerCase();
  if (s === "booked") return "confirmed";
  if (s === "completed") return "completed";
  if (s === "cancelled") return "cancelled";
  if (s === "no_show") return "completed"; // closest real mapping
  return s;
}

function formatDisplayTime(slotStartUtc: string) {
  const d = new Date(slotStartUtc + (slotStartUtc.endsWith("Z") ? "" : "Z"));
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function formatDisplayDate(slotStartUtc: string) {
  const d = new Date(slotStartUtc + (slotStartUtc.endsWith("Z") ? "" : "Z"));
  return d.toISOString().split("T")[0];
}

export async function GET(req: NextRequest) {
  try {
    const cookie = forwardCookie(req);
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const statusFilter = url.searchParams.get("status") || "all";

    // Call real NestJS backend; do NOT query DB directly
    const backendUrl = new URL("/bookings", API_URL);
    const backendRes = await fetch(backendUrl.toString(), {
      credentials: "include",
      headers: cookie ? { cookie } : {},
    });

    if (backendRes.status === 401) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }

    if (!backendRes.ok) {
      return NextResponse.json({ success: false, error: "Unable to load appointments" }, { status: 502 });
    }

    let bookings: any[] = await backendRes.json();
    if (!Array.isArray(bookings)) bookings = [];

    // Search filter (case-insensitive on name/email/event if available)
    if (search) {
      const q = search.toLowerCase();
      bookings = bookings.filter((b) => {
        const name = (b.clientName || b.client?.name || "").toLowerCase();
        const email = (b.clientEmail || b.client?.email || b.email || "").toLowerCase();
        const eventName = (b.eventTypeName || b.eventType?.title || b.eventType || "").toLowerCase();
        return name.includes(q) || email.includes(q) || eventName.includes(q);
      });
    }

    // Status filter using real backend status
    if (statusFilter !== "all") {
      bookings = bookings.filter((b) => {
        const mapped = mapBookingStatus(b.status);
        return mapped === statusFilter.toLowerCase();
      });
    }

    // Map to the requested contract; no fake data
    const appointments = bookings.map((b) => {
      const start = b.slot_start_utc || b.slotStartUtc || b.slot_start || b.start || null;
      return {
        id: b.id || b.booking_id || b.bookingId || null,
        clientName: b.clientName || b.client?.name || b.client || null,
        clientEmail: b.clientEmail || b.client?.email || b.email || null,
        clientAvatar: b.client?.avatarUrl || b.clientAvatar || null,
        eventTypeName: b.eventTypeName || b.eventType?.title || b.eventType || null,
        date: start ? formatDisplayDate(start) : null,
        time: start ? formatDisplayTime(start) : null,
        duration: b.durationMinutes || (start && b.slot_end_utc ? Math.round((new Date(b.slot_end_utc).getTime() - new Date(start).getTime()) / 60000) : null) || null,
        status: mapBookingStatus(b.status),
        location: b.eventType?.location || b.location || null,
        notes: b.notes || b.clientNotes || null,
        // Internal fields for adapter use
        slotStartUtc: start,
        slotEndUtc: b.slot_end_utc || b.slotEndUtc || null,
        version: b.version || null,
      };
    });

    return NextResponse.json({ success: true, appointments });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: "Unable to load appointments" }, { status: 502 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const cookie = forwardCookie(req);
    const url = new URL(req.url);
    const id = url.pathname.split("/").filter(Boolean).pop();
    const body = await req.json();
    const action = body?.action;

    if (!id || !action) {
      return NextResponse.json({ success: false, error: "Missing id or action" }, { status: 400 });
    }

    // Forward mutations to real NestJS endpoints; do not touch DB directly
    if (action === "confirm") {
      const res = await fetch(`${API_URL}/bookings/${id}/confirm`, {
        method: "POST",
        headers: cookie ? { cookie, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
        credentials: "include",
      });
      return NextResponse.json(await res.json().catch(() => ({ status: res.status })), { status: res.status });
    }

    if (action === "decline") {
      const res = await fetch(`${API_URL}/bookings/${id}/decline`, {
        method: "POST",
        headers: cookie ? { cookie, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
        credentials: "include",
      });
      return NextResponse.json(await res.json().catch(() => ({ status: res.status })), { status: res.status });
    }

    if (action === "cancel") {
      const res = await fetch(`${API_URL}/bookings/${id}/cancel`, {
        method: "POST",
        headers: cookie ? { cookie, "Content-Type": "application/json", "if-match": String(body.ifMatch || body.version || 1) } : { "Content-Type": "application/json", "if-match": String(body.ifMatch || body.version || 1) },
        credentials: "include",
      });
      return NextResponse.json(await res.json().catch(() => ({ status: res.status })), { status: res.status });
    }

    if (action === "reschedule") {
      const res = await fetch(`${API_URL}/bookings/${id}/reschedule`, {
        method: "POST",
        headers: cookie ? { cookie, "Content-Type": "application/json" } : { "Content-Type": "application/json" },
        body: JSON.stringify({
          newSlotId: body.newSlotId,
          idempotencyKey: body.idempotencyKey,
          version: body.version,
          ifMatch: body.ifMatch ?? body.version,
          cancellationWindowHours: body.cancellationWindowHours,
        }),
        credentials: "include",
      });
      return NextResponse.json(await res.json().catch(() => ({ status: res.status })), { status: res.status });
    }

    return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: "Adapter mutation failed" }, { status: 502 });
  }
}
