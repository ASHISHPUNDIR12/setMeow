import { api, WEBSOCKET_URL } from "./api";

export async function openRealtimeSocket(path: string, signal: AbortSignal) {
  // Let Strict Mode's immediate effect cleanup cancel before issuing a ticket.
  await Promise.resolve();
  signal.throwIfAborted();
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(10_000)]);
  const { ticket } = await api<{ ticket: string }>("/auth/socket-ticket", {
    method: "POST",
    body: JSON.stringify({ path }),
    signal: requestSignal,
  });
  requestSignal.throwIfAborted();
  const url = new URL(`${WEBSOCKET_URL.replace(/\/$/, "")}${path}`);
  url.searchParams.set("ticket", ticket);
  return new WebSocket(url);
}
