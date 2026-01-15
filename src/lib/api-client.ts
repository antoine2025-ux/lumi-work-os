/**
 * Thin API client helpers to wrap fetch with:
 * - consistent base URL handling
 * - shared default headers
 * - lightweight request tracing in development
 *
 * Safe to use in both server and client code.
 */

const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  "";

/**
 * Build a full URL for an API path.
 *
 * - If `input` is already an absolute URL (http/https), return as-is.
 * - Otherwise, prefix with DEFAULT_BASE_URL (or leave relative if empty).
 */
export function apiUrl(input: string): string {
  if (/^https?:\/\//i.test(input)) {
    return input;
  }

  // If we have a configured base URL, prefix it; otherwise keep it relative.
  if (DEFAULT_BASE_URL) {
    return `${DEFAULT_BASE_URL}${input}`;
  }

  return input;
}

function generateRequestId() {
  // Simple, cheap correlation id for dev debugging.
  // Example: "req_1709730289123_ab12cd"
  const random = Math.random().toString(16).slice(2, 8);
  return `req_${Date.now()}_${random}`;
}

function nowMs() {
  if (typeof performance !== "undefined" && performance.now) {
    return performance.now();
  }
  return Date.now();
}

/**
 * A thin wrapper around fetch that:
 * - Applies base URL rules via `apiUrl`
 * - Merges default headers with user-provided headers
 * - Adds a lightweight correlation id header (X-Request-Id) if missing
 * - Logs basic timing + status info in development
 */
export async function apiFetch(
  input: string,
  init?: RequestInit
): Promise<Response> {
  const url = apiUrl(input);

  const headers = new Headers(init?.headers || {});

  // Ensure every request has a correlation id.
  const existingId = headers.get("X-Request-Id");
  const requestId = existingId || generateRequestId();
  if (!existingId) {
    headers.set("X-Request-Id", requestId);
  }

  const method = (init?.method || "GET").toUpperCase();
  const start = nowMs();

  const res = await fetch(url, {
    ...init,
    headers,
  });

  const end = nowMs();
  const durationMs = end - start;

  if (process.env.NODE_ENV === "development") {
    // Keep this concise but informative; shows up in browser devtools or server logs.
    // Example: [apiFetch] POST /api/org/create (id=req_...) -> 201 in 42.3ms
    // Note: we do not log bodies or secrets here.
    // eslint-disable-next-line no-console
    console.debug(
      `[apiFetch] ${method} ${url} (id=${requestId}) -> ${res.status} in ${durationMs.toFixed(
        1
      )}ms`
    );
  }

  return res;
}

/**
 * Optional instance-based client (if you want to pass a custom base URL).
 */
export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || DEFAULT_BASE_URL || "";
  }

  private buildUrl(path: string) {
    if (/^https?:\/\//i.test(path)) return path;
    if (this.baseUrl) return `${this.baseUrl}${path}`;
    return path;
  }

  async fetch(path: string, init?: RequestInit): Promise<Response> {
    const url = this.buildUrl(path);
    const headers = new Headers(init?.headers || {});
    const method = (init?.method || "GET").toUpperCase();
    const existingId = headers.get("X-Request-Id");
    const requestId = existingId || generateRequestId();
    if (!existingId) {
      headers.set("X-Request-Id", requestId);
    }

    const start = nowMs();
    const res = await fetch(url, {
      ...init,
      headers,
    });
    const end = nowMs();
    const durationMs = end - start;

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.debug(
        `[ApiClient] ${method} ${url} (id=${requestId}) -> ${res.status} in ${durationMs.toFixed(
          1
        )}ms`
      );
    }

    return res;
  }
}
