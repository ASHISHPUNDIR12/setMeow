import { randomUUID } from "node:crypto";
import { Buffer } from "node:buffer";
import { prisma } from "./index";

export type RealtimeEvent = {
  type: string;
  boardId?: string;
  userId?: string;
  [key: string]: unknown;
};

export async function publishRealtimeEvent(event: RealtimeEvent) {
  const eventId = randomUUID();
  let payload = JSON.stringify({ ...event, eventId });
  if (Buffer.byteLength(payload, "utf8") > 7000) {
    payload = JSON.stringify({
      type: event.boardId ? "board_refresh" : event.type,
      eventId,
      ...(event.boardId ? { boardId: event.boardId } : {}),
      ...(event.userId ? { userId: event.userId } : {}),
    });
  }
  try {
    await prisma.$executeRaw`SELECT pg_notify('setmeow_issue_events', ${payload})`;
  } catch (error) {
    // The write has already committed. A notification failure must not turn a
    // successful REST mutation into a misleading retryable HTTP failure.
    console.error("Could not publish realtime event", error);
  }
}
