import { afterAll, beforeAll, expect, test } from "bun:test";
import type { IncomingMessage } from "node:http";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../auth.config";
import socketTicketRouter from "../modules/socket-ticket.route";
import { authenticateSocket } from "../../websockets/auth";

const userId = "123e4567-e89b-42d3-a456-426614174000";
const boardPath = "/boards/123e4567-e89b-42d3-a456-426614174001";
const allowedOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
const session = jwt.sign({ sub: userId }, jwtSecret, { expiresIn: "2h" });
let server: ReturnType<typeof express.application.listen>;
let baseUrl: string;

beforeAll(async () => {
  const app = express();
  app.use(express.json(), cookieParser());
  app.use("/auth", socketTicketRouter);
  server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No test port");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

const issue = (
  path: string,
  token: string | null = session,
  origin = allowedOrigin,
) =>
  fetch(`${baseUrl}/auth/socket-ticket`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      ...(token ? { Cookie: `accessToken=${token}` } : {}),
    },
    body: JSON.stringify({ path }),
  });

const request = (path: string, ticket: string) =>
  ({
    url: `${path}?ticket=${encodeURIComponent(ticket)}`,
    headers: {},
  }) as IncomingMessage;

function fixture(
  overrides: Record<string, unknown> = {},
  algorithm: jwt.Algorithm = "HS256",
) {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      sub: userId,
      aud: "setmeow-websocket",
      purpose: "socket_ticket",
      path: "/users/me",
      exp: now + 60,
      sessionExpiresAt: now + 3600,
      ...overrides,
    },
    jwtSecret,
    { algorithm },
  );
}

test("authenticated clients can connect to board and inbox rooms without a socket cookie", async () => {
  for (const path of [boardPath, "/users/me"]) {
    const response = await issue(path);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const { ticket } = (await response.json()) as { ticket: string };
    const claims = jwt.verify(ticket, jwtSecret, {
      audience: "setmeow-websocket",
    }) as jwt.JwtPayload;
    expect(claims.exp! - claims.iat!).toBeLessThanOrEqual(60);
    expect(claims.path).toBe(path);
    const identity = authenticateSocket(request(path, ticket), path, jwtSecret);
    expect(identity.userId).toBe(userId);
    expect(identity.expiresAt).toBe(
      (jwt.decode(session) as jwt.JwtPayload).exp! * 1000,
    );
  }
});

test("ticket issuance rejects missing, forged, and expired sessions", async () => {
  const expired = jwt.sign({ sub: userId }, jwtSecret, { expiresIn: -1 });
  const forged = jwt.sign({ sub: userId }, "wrong-secret", { expiresIn: "2h" });
  for (const token of [null, expired, forged])
    expect((await issue("/users/me", token)).status).toBe(401);
});

test("ticket issuance rejects foreign origins and invalid paths", async () => {
  expect(
    (await issue("/users/me", session, "https://attacker.example")).status,
  ).toBe(403);
  for (const path of [
    "/admin",
    "/boards/not-a-uuid",
    `${boardPath}?x=1`,
    "/users/me/",
  ])
    expect((await issue(path)).status).toBe(400);
});

test("a ticket cannot authenticate REST calls or be used as a session cookie", async () => {
  const response = await issue("/users/me");
  const { ticket } = (await response.json()) as { ticket: string };
  expect((await issue("/users/me", ticket)).status).toBe(401);
  expect(() =>
    authenticateSocket(
      {
        url: "/users/me",
        headers: { cookie: `accessToken=${ticket}` },
      } as IncomingMessage,
      "/users/me",
      jwtSecret,
    ),
  ).toThrow();
  expect(() =>
    authenticateSocket(request("/users/me", session), "/users/me", jwtSecret),
  ).toThrow();
});

test("socket tickets reject wrong scope, audience, signature, algorithm, and expiration", () => {
  const now = Math.floor(Date.now() / 1000);
  const invalid = [
    fixture({ path: boardPath }),
    fixture({ aud: "another-service" }),
    fixture({ purpose: "session" }),
    fixture({ sub: "not-a-uuid" }),
    fixture({ exp: now - 1 }),
    fixture({ sessionExpiresAt: now - 1 }),
    fixture({ sessionExpiresAt: now + 30 }),
    fixture({}, "HS384"),
    jwt.sign({ sub: userId }, "wrong-secret"),
  ];
  for (const ticket of invalid)
    expect(() =>
      authenticateSocket(request("/users/me", ticket), "/users/me", jwtSecret),
    ).toThrow();
});

test("tickets cannot outlive a nearly expired session", async () => {
  const shortSession = jwt.sign({ sub: userId }, jwtSecret, { expiresIn: 20 });
  const response = await issue("/users/me", shortSession);
  expect(response.status).toBe(200);
  const { ticket } = (await response.json()) as { ticket: string };
  const claims = jwt.decode(ticket) as jwt.JwtPayload;
  expect(claims.exp).toBeLessThanOrEqual(
    (jwt.decode(shortSession) as jwt.JwtPayload).exp!,
  );
});

test("existing same-host cookie connections still authenticate", () => {
  const identity = authenticateSocket(
    {
      url: "/users/me",
      headers: { cookie: `accessToken=${session}` },
    } as IncomingMessage,
    "/users/me",
    jwtSecret,
  );
  expect(identity.userId).toBe(userId);
});
