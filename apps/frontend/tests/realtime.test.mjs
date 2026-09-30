import { afterEach, beforeEach, expect, test } from "bun:test";
import { openRealtimeSocket } from "../app/lib/realtime";
import { WEBSOCKET_URL } from "../app/lib/api";

const originalFetch = globalThis.fetch;
const originalWebSocket = globalThis.WebSocket;
let urls;

beforeEach(() => {
  urls = [];
  globalThis.WebSocket = class {
    constructor(url) {
      urls.push(String(url));
    }
  };
});

afterEach(() => {
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
  expect(options?.signal).toBe(controller.signal);
  const url = new URL(urls[0]);
  expect(url.origin).toBe(new URL(WEBSOCKET_URL).origin);
  expect(url.pathname).toBe("/users/me");
  expect(url.searchParams.get("ticket")).toBe("scoped-ticket");
  expect(url.searchParams.has("accessToken")).toBe(false);
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
