import { api } from "./api";
import type { SocketMessage } from "./types";

export const WEBSOCKET_URL =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3002";

export function parseRealtimeMessage(raw: string): SocketMessage | null {
  try {
    const message: unknown = JSON.parse(raw);
    if (
      message === null ||
      typeof message !== "object" ||
      Array.isArray(message)
    )
      return null;
    if (!("type" in message) || typeof message.type !== "string") return null;
    return message as SocketMessage;
  } catch {
    return null;
  }
}

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
