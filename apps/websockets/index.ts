import "dotenv/config";
import { createServer } from "node:http";
import { URL } from "node:url";
import { Client } from "pg";
import { WebSocket, WebSocketServer } from "ws";
import { z } from "zod";
import { prisma } from "db/client";
import { ISSUE_EVENTS_CHANNEL, moveIssue } from "db/move";
import { authenticateSocket } from "./auth";

const uuid = z.uuid();
const moveMessage = z
  .object({
    type: z.literal("issue_move"),
    issueId: uuid,
    sectionId: uuid,
    requestId: z.string().min(1).max(64).optional(),
  })
  .strict();
const realtimeEvent = z
  .object({
    type: z.string().min(1),
    eventId: uuid,
    boardId: uuid.optional(),
    userId: uuid.optional(),
  })
  .passthrough();
type Person = { id: string; username: string };
type Session = {
  socket: WebSocket;
  boardId: string;
  organizationId: string;
  user: Person;
  expiresAt?: number;
  ready: boolean;
  pending: string[];
  alive: boolean;
};
type UserSession = { socket: WebSocket; expiresAt?: number; alive: boolean };
const send = (socket: WebSocket, payload: unknown) => {
  if (socket.readyState === WebSocket.OPEN)
    socket.send(JSON.stringify(payload));
};

function reject(socket: import("node:stream").Duplex, status: number) {
  const reason =
    {
      400: "Bad Request",
      401: "Unauthorized",
      403: "Forbidden",
      404: "Not Found",
      503: "Service Unavailable",
    }[status] ?? "Error";
  socket.end(
    `HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
  );
}

export async function startRealtimeServer(options: { port?: number } = {}) {
  const secret = process.env.JWT_SECRET;
  const databaseUrl = process.env.DATABASE_URL;
  if (!secret || !databaseUrl)
    throw new Error("JWT_SECRET and DATABASE_URL are required");
  const rooms = new Map<string, Set<Session>>();
  const userRooms = new Map<string, Set<UserSession>>();
  const server = createServer((_req, res) => {
    if (_req.method === "GET" && _req.url === "/healthz") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }
    if (_req.method === "GET" && _req.url === "/readyz") {
      const ready = !stopping && listener !== undefined;
      res.writeHead(ready ? 200 : 503, { "content-type": "application/json" });
      res.end(JSON.stringify({ status: ready ? "ready" : "not_ready" }));
      return;
    }
    res.writeHead(404).end();
  });
  const wss = new WebSocketServer({ noServer: true, maxPayload: 16 * 1024 });
  let listener: Client | undefined;
  let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  let stopping = false;

  const activeUsers = (boardId: string): Person[] => {
    const users = new Map<string, Person>();
    for (const session of rooms.get(boardId) ?? [])
      users.set(session.user.id, session.user);
    return [...users.values()].sort((a, b) => a.id.localeCompare(b.id));
  };
  const broadcast = (boardId: string, payload: unknown) => {
    const message = JSON.stringify(payload);
    for (const session of rooms.get(boardId) ?? []) {
      if (!session.ready) session.pending.push(message);
      else if (session.socket.readyState === WebSocket.OPEN)
        session.socket.send(message);
    }
  };
  const presence = (boardId: string) =>
    broadcast(boardId, {
      type: "presence",
      boardId,
      activeUsers: activeUsers(boardId),
    });
  const broadcastToUser = (userId: string, payload: unknown) => {
    const message = JSON.stringify(payload);
    for (const session of userRooms.get(userId) ?? []) {
      if (session.socket.readyState === WebSocket.OPEN)
        session.socket.send(message);
    }
  };
  const snapshot = async (session: Session) => {
    const [sections, issues] = await Promise.all([
      prisma.section.findMany({
        where: { boardId: session.boardId },
        orderBy: { id: "asc" },
      }),
      prisma.issue.findMany({
        where: { boardId: session.boardId },
        orderBy: { id: "asc" },
      }),
    ]);
    if (session.socket.readyState !== WebSocket.OPEN) return;
    send(session.socket, {
      type: "board_snapshot",
      boardId: session.boardId,
      sections,
      issues,
      activeUsers: activeUsers(session.boardId),
    });
    session.ready = true;
    for (const message of session.pending)
      if (session.socket.readyState === WebSocket.OPEN)
        session.socket.send(message);
    session.pending.length = 0;
  };

  async function connectListener() {
    if (stopping) return;
    const client = new Client({ connectionString: databaseUrl });
    try {
      await client.connect();
      await client.query(`LISTEN ${ISSUE_EVENTS_CHANNEL}`);
      if (stopping) {
        await client.end();
        return;
      }
      listener = client;
      client.on("notification", (notification) => {
        if (
          notification.channel !== ISSUE_EVENTS_CHANNEL ||
          !notification.payload
        )
          return;
        let data: unknown;
        try {
          data = JSON.parse(notification.payload);
        } catch {
          return;
        }
        const parsed = realtimeEvent.safeParse(data);
        if (!parsed.success) return;
        if (parsed.data.boardId) broadcast(parsed.data.boardId, parsed.data);
        if (parsed.data.userId)
          broadcastToUser(parsed.data.userId, parsed.data);
      });
      const lost = () => {
        if (listener !== client) return;
        listener = undefined;
        client.end().catch(() => {});
        if (!stopping)
          reconnectTimer = setTimeout(() => {
            void connectListener();
          }, 1000);
      };
      client.on("error", lost);
      client.on("end", lost);
      for (const sessions of rooms.values())
        for (const session of sessions) {
          session.ready = false;
          session.pending.length = 0;
          void snapshot(session).catch(() =>
            session.socket.close(1011, "snapshot failed"),
          );
        }
      for (const userId of userRooms.keys())
        broadcastToUser(userId, { type: "invitation_changed", userId });
    } catch (error) {
      await client.end().catch(() => {});
      if (!stopping)
        reconnectTimer = setTimeout(() => {
          void connectListener();
        }, 1000);
      if (!listener && !server.listening) throw error;
    }
  }
  await connectListener();

  server.on("upgrade", async (req, socket, head) => {
    try {
      const pathname = new URL(req.url ?? "", "http://localhost").pathname;
      const boardId = /^\/boards\/([^/]+)$/.exec(pathname)?.[1];
      const isUserRoom = pathname === "/users/me";
      if ((!boardId || !uuid.safeParse(boardId).success) && !isUserRoom) {
        reject(socket, 400);
        return;
      }
      const origin = req.headers.origin;
      const allowedOrigin =
        process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
      if (origin && origin !== allowedOrigin) {
        reject(socket, 403);
        return;
      }
      let identity: ReturnType<typeof authenticateSocket>;
      try {
        identity = authenticateSocket(req, pathname, secret);
      } catch {
        reject(socket, 401);
        return;
      }
      if (isUserRoom) {
        const userId = identity.userId;
        wss.handleUpgrade(req, socket, head, (ws) => {
          const connections = userRooms.get(userId) ?? new Set<UserSession>();
          const userSession: UserSession = {
            socket: ws,
            expiresAt: identity.expiresAt,
            alive: true,
          };
          connections.add(userSession);
          userRooms.set(userId, connections);
          send(ws, { type: "user_ready" });
          ws.on("pong", () => {
            userSession.alive = true;
          });
          ws.on("close", () => {
            connections.delete(userSession);
            if (connections.size === 0) userRooms.delete(userId);
          });
        });
        return;
      }
      const board = await prisma.board.findUnique({
        where: { id: boardId! },
        select: { organizationId: true },
      });
      if (!board) {
        reject(socket, 404);
        return;
      }
      const userId = identity.userId;
      if (!userId) {
        reject(socket, 401);
        return;
      }
      const membership = await prisma.membership.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: board.organizationId,
          },
        },
        select: { user: { select: { id: true, username: true } } },
      });
      if (!membership) {
        reject(socket, 403);
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        const roomBoardId = boardId!;
        const session: Session = {
          socket: ws,
          boardId: roomBoardId,
          organizationId: board.organizationId,
          user: membership.user,
          expiresAt: identity.expiresAt,
          ready: false,
          pending: [],
          alive: true,
        };
        const room = rooms.get(roomBoardId) ?? new Set<Session>();
        room.add(session);
        rooms.set(roomBoardId, room);
        void snapshot(session).catch(() => ws.close(1011, "snapshot failed"));
        presence(boardId!);
        ws.on("pong", () => {
          session.alive = true;
        });
        ws.on("message", async (raw) => {
          let data: unknown;
          try {
            data = JSON.parse(raw.toString());
          } catch {
            send(ws, { type: "error", code: "invalid_json" });
            return;
          }
          const parsed = moveMessage.safeParse(data);
          if (!parsed.success) {
            send(ws, { type: "error", code: "invalid_message" });
            return;
          }
          const { issueId, sectionId, requestId } = parsed.data;
          try {
            const result = await moveIssue({
              userId: session.user.id,
              issueId,
              sectionId,
              expectedBoardId: boardId,
              requestId,
            });
            if (result.status === "moved")
              send(ws, { type: "move_ack", requestId, issueId, sectionId });
            else if (result.status === "unchanged")
              send(ws, {
                type: "move_ack",
                requestId,
                issueId,
                sectionId,
                unchanged: true,
              });
            else send(ws, { type: "error", code: result.status, requestId });
            if (result.status === "forbidden")
              ws.close(1008, "membership revoked");
          } catch {
            send(ws, { type: "error", code: "server_error", requestId });
          }
        });
        ws.on("close", () => {
          room.delete(session);
          if (room.size === 0) rooms.delete(boardId!);
          else presence(boardId!);
        });
      });
    } catch {
      reject(socket, 503);
    }
  });

  const heartbeat = setInterval(() => {
    for (const sessions of userRooms.values())
      for (const session of sessions) {
        if (session.expiresAt && Date.now() >= session.expiresAt) {
          session.socket.close(1008, "token expired");
          continue;
        }
        if (!session.alive) {
          session.socket.terminate();
          continue;
        }
        session.alive = false;
        session.socket.ping();
      }
    for (const sessions of rooms.values())
      for (const session of sessions) {
        if (session.expiresAt && Date.now() >= session.expiresAt) {
          session.socket.close(1008, "token expired");
          continue;
        }
        if (!session.alive) {
          session.socket.terminate();
          continue;
        }
        session.alive = false;
        session.socket.ping();
      }
  }, 30_000);
  const revalidate = setInterval(() => {
    for (const sessions of rooms.values())
      for (const session of sessions) {
        void prisma.membership
          .findUnique({
            where: {
              userId_organizationId: {
                userId: session.user.id,
                organizationId: session.organizationId,
              },
            },
            select: { id: true },
          })
          .then((member) => {
            if (!member) session.socket.close(1008, "membership revoked");
          })
          .catch(() => {});
      }
  }, 60_000);

  try {
    await new Promise<void>((resolve, rejectListen) => {
      server.once("error", rejectListen);
      server.listen(
        options.port ?? Number(process.env.WS_PORT ?? process.env.PORT ?? 3002),
        () => {
          server.off("error", rejectListen);
          resolve();
        },
      );
    });
  } catch (error) {
    clearInterval(heartbeat);
    clearInterval(revalidate);
    await listener?.end().catch(() => {});
    throw error;
  }
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    port,
    close: async () => {
      stopping = true;
      clearInterval(heartbeat);
      clearInterval(revalidate);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      for (const session of [...rooms.values()].flatMap((room) => [...room]))
        session.socket.terminate();
      for (const sessions of userRooms.values())
        for (const session of sessions) session.socket.terminate();
      wss.close();
      await listener?.end().catch(() => {});
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

if (import.meta.main) {
  startRealtimeServer()
    .then(({ port, close }) => {
      console.log(`WebSocket server listening on ${port}`);
      let stopping = false;
      const shutdown = async (signal: string) => {
        if (stopping) return;
        stopping = true;
        console.log(`Received ${signal}; stopping WebSocket server`);
        await close();
        await prisma.$disconnect();
      };
      process.once("SIGINT", () => void shutdown("SIGINT"));
      process.once("SIGTERM", () => void shutdown("SIGTERM"));
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
