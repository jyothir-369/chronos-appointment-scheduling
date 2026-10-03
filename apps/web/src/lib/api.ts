import { USE_MOCK, getBookings, getWorkspace } from "@chronos/mock-data";

export async function apiFetch(path: string, opts?: RequestInit & { idempotencyKey?: string }) {
  const isMock = USE_MOCK === true && process.env.NODE_ENV !== "production";
  if (isMock && typeof window !== "undefined") {
    if (path === "/bookings") return Response.json(getBookings());
    if (path === "/providers/me") return Response.json(getWorkspace());
    return Response.json({});
  }
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  try {
    return await fetch(`${API_URL}${path}`, {
      ...opts,
      headers: { "Content-Type": "application/json", ...(opts?.idempotencyKey ? { "idempotency-key": opts.idempotencyKey } : {}), ...(opts?.headers || {}) },
      credentials: "include",
    });
  } catch {
    if (isMock) {
      if (path === "/bookings") return Response.json(getBookings());
      if (path === "/providers/me") return Response.json(getWorkspace());
      return Response.json({});
    }
    throw new Error("Failed to fetch");
  }
}
