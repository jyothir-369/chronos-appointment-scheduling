// Mock mode disabled — real backend always used.
// Mock package import preserved for build compatibility only.
export async function apiFetch(path: string, opts?: RequestInit & { idempotencyKey?: string }) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

  const buildRequest = () =>
    fetch(`${API_URL}${path}`, {
      ...opts,
      headers: {
        "Content-Type": "application/json",
        ...(opts?.idempotencyKey
          ? { "idempotency-key": opts.idempotencyKey }
          : {}),
        ...(opts?.headers || {}),
      },
      credentials: "include",
    });

  try {
    let response = await buildRequest();
    let retried = false;

    if (response.status === 401 && path !== "/auth/login" && !retried) {
      retried = true;
      // SAFE FIX (Part 7): do not silently authenticate as arbitrary client.
      // Previous behavior called /auth/login with empty body, selecting oldest client.
      // That is removed. Client must explicitly provide credentials.
      throw new Error("Authentication required");
    }

    return response;
  } catch (err: any) {
    if (err?.message === "Authentication required") {
      throw err;
    }

    // Preserve backend error messages when safe (5xx with message)
    if (err?.message && err.message !== "Failed to fetch") {
      throw err;
    }

    throw new Error(err?.message || "Failed to fetch");
  }
}
