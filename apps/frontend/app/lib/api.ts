const API = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001").replace(/\/$/, "");

export const WS = process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3002";

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API}${path}`, { ...init, headers, credentials: "include" });
  const data: { message?: string } | null = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message ?? `Request failed (${response.status})`);
  return data as T;
}
