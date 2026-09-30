import { api, WEBSOCKET_URL } from "./api";

export async function openRealtimeSocket(path: string, signal: AbortSignal) {
  const { ticket } = await api<{ ticket: string }>("/auth/socket-ticket", {
    method: "POST",
    body: JSON.stringify({ path }),
    signal,
  });
  if (signal.aborted)
    throw new DOMException("Connection cancelled", "AbortError");
  const url = new URL(`${WEBSOCKET_URL.replace(/\/$/, "")}${path}`);
  url.searchParams.set("ticket", ticket);
  return new WebSocket(url);
}
