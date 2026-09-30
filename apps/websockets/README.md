# WebSocket service

This is the long-running realtime service for Setmeow boards and invitation inboxes. It uses the same PostgreSQL database and JWT signing secret as the backend. Keep it as a separate service from the Next.js frontend and HTTP API.

## Local development

Install dependencies at the repository root, then configure this service:

```bash
bun install --frozen-lockfile
cp apps/websockets/.env.example apps/websockets/.env
```

Set the local PostgreSQL URL and a JWT secret matching `apps/backend/.env`. Apply database migrations using the procedure in `apps/backend/README.md`. Start the service from this directory:

```bash
cd apps/websockets
bun run dev
```

The default port is `3002`. The server accepts WebSocket upgrades at `/boards/:boardId` and `/users/me`. Plain HTTP requests are supported at `/healthz` and `/readyz`; other paths return 404.

## Deploy

Use the repository root as the build context so Bun can install the `db` workspace dependency. Install the locked dependencies, then run the service with `apps/websockets` as its working directory:

```bash
bun install --frozen-lockfile
cd packages/db
bun run generate
cd ../../apps/websockets
bun run start
```

Use Bun 1.4.2, as configured by the repository. No compile step is required. The listener reads `WS_PORT`, falls back to the platform's `PORT`, then defaults to `3002`. It binds to all interfaces; configure the platform to forward traffic to this port.

Set these server-side variables in the WebSocket deployment environment:

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Direct PostgreSQL connection string for `LISTEN/NOTIFY`. For Neon, disable connection pooling when copying this URL. |
| `JWT_SECRET` | Yes | The same private signing key used by the backend. |
| `FRONTEND_ORIGIN` | Yes in production | Exact browser origin, such as `https://app.example.com`, with no trailing slash. Requests with a different `Origin` are rejected. |
| `WS_PORT` / `PORT` | Platform-dependent | Listen port. `WS_PORT` takes precedence over `PORT`; defaults to `3002` if neither is set. |

The frontend, backend, and WebSocket service must use the same `FRONTEND_ORIGIN`; the backend and WebSocket service must use the same `JWT_SECRET` and database. Set the frontend's `NEXT_PUBLIC_WS_URL` to the public WSS URL. The frontend requests a short-lived ticket through its authenticated API proxy, so the socket URL can be on a separate hostname. Configure the proxy/load balancer to support HTTP/1.1 WebSocket upgrades and long-lived connections. Use TLS at the public edge (`wss://`).

Configure a liveness probe for `GET /healthz` and a readiness probe for `GET /readyz`. Readiness returns 200 when the HTTP service is running and its PostgreSQL notification listener is connected; it returns 503 while starting, reconnecting, or shutting down. On SIGINT/SIGTERM the process closes WebSocket connections and disconnects Prisma.

## Runtime flow and message details

See [DATA_FLOW.md](./DATA_FLOW.md) for connection authorization, snapshots, event delivery, move handling, message shapes, and operational behavior. For the frontend connection/reconnect behavior, see [the frontend realtime notes](../frontend/README.md#realtime-updates). For the shared API contract, see [the backend API guide](../backend/API.md#board-websocket).

## Operational notes

- A connected socket is authenticated by a scoped socket ticket; same-host cookie connections remain supported. Board connections also require current organization membership, which is checked at connect and rechecked every 60 seconds.
- PostgreSQL stores all board state. In-memory state holds only live connections, presence and messages waiting for a just-connected client's snapshot.
- PostgreSQL `LISTEN/NOTIFY` broadcasts REST and WebSocket mutations between service instances. Notifications are not a durable queue; reconnecting clients receive a fresh database snapshot.
- Presence is held in memory per service instance. If the deployment runs multiple WebSocket instances, configure sticky WebSocket routing if users need a unified presence list across instances. Board data events still fan out between instances through PostgreSQL.
- Allow outbound database connectivity and account for one extra PostgreSQL connection per WebSocket instance for the notification listener, in addition to Prisma's pool.

## Checks

Type-check the service from this directory:

```bash
bun run check-types
```

The integration test `realtime.e2e.test.ts` requires a local PostgreSQL database and writes temporary records. Run it only against a disposable local database with the test prerequisites described in the test file.
