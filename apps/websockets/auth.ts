import type { IncomingMessage } from "node:http";
import jwt from "jsonwebtoken";
import { z } from "zod";

function tokenFromCookie(req: IncomingMessage) {
  const cookie = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("accessToken="));
  return cookie
    ? decodeURIComponent(cookie.slice("accessToken=".length))
    : null;
}

export function authenticateSocket(
  req: IncomingMessage,
  pathname: string,
  secret: string,
) {
  const ticket = new URL(req.url ?? "", "http://localhost").searchParams.get(
    "ticket",
  );
  const token = ticket ?? tokenFromCookie(req);
  if (!token) throw new Error("missing credentials");
  const claims = jwt.verify(token, secret, {
    algorithms: ["HS256"],
    ...(ticket !== null ? { audience: "setmeow-websocket" } : {}),
  });
  if (typeof claims === "string" || !z.uuid().safeParse(claims.sub).success)
    throw new Error("invalid subject");

  let expiresAt = claims.exp ? claims.exp * 1000 : undefined;
  if (ticket !== null) {
    if (
      claims.purpose !== "socket_ticket" ||
      claims.path !== pathname ||
      typeof claims.sessionExpiresAt !== "number" ||
      !Number.isFinite(claims.sessionExpiresAt) ||
      typeof claims.exp !== "number" ||
      claims.exp > claims.sessionExpiresAt ||
      claims.sessionExpiresAt * 1000 <= Date.now()
    )
      throw new Error("invalid socket ticket");
    // Ticket expiry limits the handshake; the original session limits the socket.
    expiresAt = claims.sessionExpiresAt * 1000;
  } else if (claims.purpose !== undefined || claims.aud !== undefined) {
    throw new Error("invalid session token");
  }
  return { userId: claims.sub as string, expiresAt };
}
