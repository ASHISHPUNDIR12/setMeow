const API_BASE_URL = "/api";

export const WEBSOCKET_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3002";

export async function api<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });

  // DELETE responses can be empty, and failed requests may not contain JSON.
  const data: { message?: string } | null =
    response.status === 204 ? null : await response.json().catch(() => null);

  if (response.status === 401 && !path.startsWith("/auth/") && typeof window !== "undefined") {
    const returnTo = window.location.pathname + window.location.search;
    window.location.replace(`/signin?next=${encodeURIComponent(returnTo)}`);
  }

  if (!response.ok) {
    throw new Error(data?.message ?? `Request failed (${response.status})`);
  }

  return data as T;
}
