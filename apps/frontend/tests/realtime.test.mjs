import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { openRealtimeSocket } from "../app/lib/realtime";
import { WEBSOCKET_URL } from "../app/lib/api";

const originalFetch = globalThis.fetch;
const originalWebSocket = globalThis.WebSocket;
let urls;
let timeoutSpy;

beforeEach(() => {
  urls = [];
  globalThis.WebSocket = class {
    constructor(url) {
      urls.push(String(url));
    }
  };
});

afterEach(() => {
  timeoutSpy?.mockRestore();
  timeoutSpy = undefined;
  globalThis.fetch = originalFetch;
  globalThis.WebSocket = originalWebSocket;
});

test("socket tickets are requested through the cookie-authenticated API proxy", async () => {
  let requestedUrl;
  let options;
  globalThis.fetch = async (input, init) => {
    requestedUrl = String(input);
    options = init;
    return Response.json({ ticket: "scoped-ticket" });
  };
  const controller = new AbortController();
  await openRealtimeSocket("/users/me", controller.signal);
  expect(requestedUrl).toBe("/api/auth/socket-ticket");
  expect(options?.method).toBe("POST");
  expect(options?.credentials).toBe("include");
  expect(JSON.parse(options?.body)).toEqual({ path: "/users/me" });
  expect(options?.signal.aborted).toBe(false);
  controller.abort();
  expect(options?.signal.aborted).toBe(true);
  const url = new URL(urls[0]);
  expect(url.origin).toBe(new URL(WEBSOCKET_URL).origin);
  expect(url.pathname).toBe("/users/me");
  expect(url.searchParams.get("ticket")).toBe("scoped-ticket");
  expect(url.searchParams.has("accessToken")).toBe(false);
});

test("Strict Mode cleanup skips the discarded ticket request and the next mount connects", async () => {
  let requests = 0;
  globalThis.fetch = async () => {
    requests += 1;
    return Response.json({ ticket: "scoped-ticket" });
  };
  const discarded = new AbortController();
  const firstConnection = openRealtimeSocket("/users/me", discarded.signal);
  discarded.abort();
  await expect(firstConnection).rejects.toMatchObject({ name: "AbortError" });
  expect(requests).toBe(0);
  await openRealtimeSocket("/users/me", new AbortController().signal);
  expect(requests).toBe(1);
  expect(urls).toHaveLength(1);
});

test("a stalled ticket request times out and a retry can request a fresh ticket", async () => {
  const deadline = new AbortController();
  timeoutSpy = spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
  globalThis.fetch = async (_input, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    });
  const connection = openRealtimeSocket("/users/me", new AbortController().signal);
  await Promise.resolve();
  expect(timeoutSpy).toHaveBeenCalledWith(10_000);
  deadline.abort(new DOMException("Ticket request timed out", "TimeoutError"));
  await expect(connection).rejects.toMatchObject({ name: "TimeoutError" });
  expect(urls).toHaveLength(0);

  timeoutSpy.mockRestore();
  timeoutSpy = undefined;
  globalThis.fetch = async () => Response.json({ ticket: "retry-ticket" });
  await openRealtimeSocket("/users/me", new AbortController().signal);
  expect(new URL(urls[0]).searchParams.get("ticket")).toBe("retry-ticket");
});

test("an unmounted connection cannot open a socket after the ticket response arrives", async () => {
  const controller = new AbortController();
  globalThis.fetch = async () => {
    controller.abort();
    return Response.json({ ticket: "scoped-ticket" });
  };
  await expect(
    openRealtimeSocket("/users/me", controller.signal),
  ).rejects.toMatchObject({ name: "AbortError" });
  expect(urls).toHaveLength(0);
});

test("failed ticket issuance does not open an unauthenticated socket", async () => {
  globalThis.fetch = async () =>
    Response.json({ message: "unauthorized" }, { status: 401 });
  await expect(
    openRealtimeSocket("/users/me", new AbortController().signal),
  ).rejects.toThrow("unauthorized");
  expect(urls).toHaveLength(0);
});

test("each reconnect requests a fresh ticket", async () => {
  let attempts = 0;
  globalThis.fetch = async () =>
    Response.json({ ticket: `ticket-${++attempts}` });
  await openRealtimeSocket("/users/me", new AbortController().signal);
  await openRealtimeSocket("/users/me", new AbortController().signal);
  expect(attempts).toBe(2);
  expect(new URL(urls[0]).searchParams.get("ticket")).toBe("ticket-1");
  expect(new URL(urls[1]).searchParams.get("ticket")).toBe("ticket-2");
});
