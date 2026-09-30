# WebSocket data flow

This document describes the realtime service in `index.ts`, the persistence and notification helpers in `packages/db`, and the browser client in `apps/frontend/app/hooks`.

## Connections and authorization

The service is a standalone HTTP server with WebSocket upgrades. It exposes two socket routes:

- `GET /boards/:boardId` opens a board room.
- `GET /users/me` opens the authenticated user's invitation inbox room.

Before upgrading, the service validates the route and UUID, checks the request `Origin` against `FRONTEND_ORIGIN` (an absent Origin is allowed for non-browser clients), verifies the scoped ticket in the `ticket` query parameter using `JWT_SECRET`, and requires a UUID subject. Existing same-host cookie authentication remains supported. A board socket additionally looks up the board and confirms the user belongs to its organization. Unknown boards return 404, missing/invalid sessions return 401, and non-members return 403. Upgrade failures caused by a database error return 503.

Before every connection attempt, the frontend sends `POST /api/auth/socket-ticket` with the intended socket path. The backend verifies the HttpOnly session cookie and returns a path-scoped JWT with audience `setmeow-websocket`, a maximum handshake lifetime of 60 seconds, and the original session expiration. Socket tickets cannot authenticate REST requests or other socket paths. After the handshake, the original session expiration is enforced during the connection heartbeat. Ticket query parameters should be redacted from custom access logs. Board membership is rechecked every 60 seconds; a revoked member's socket closes with code 1008. Every 30 seconds the service pings sockets and terminates clients that did not respond to the previous ping.

## Board connection and snapshot ordering

On board connection, the service adds the socket to the in-memory room and queries PostgreSQL for that board's sections and issues. It sends:

```json
{
  "type": "board_snapshot",
  "boardId": "<uuid>",
  "sections": [],
  "issues": [],
  "activeUsers": [{ "id": "<uuid>", "username": "<name>" }]
}
```

The connection buffers board events while this query is in progress. After sending the snapshot it marks the socket ready and flushes buffered events in order. This lets a just-connected client establish its base state before applying live changes. The frontend handles snapshots and incremental messages through `use-board-realtime.ts` and `board-event-handler.ts`.

Presence counts distinct user IDs, so several tabs for one person appear once. A `presence` message contains `{ "type": "presence", "boardId": "<uuid>", "activeUsers": [...] }`. It is sent when a board connection joins or leaves and other connections remain.

## Data writes and fan-out

PostgreSQL is the source of truth. REST routes write through the backend; moving an issue can also be requested over the WebSocket. The service accepts this client message:

```json
{ "type": "issue_move", "issueId": "<uuid>", "sectionId": "<uuid>", "requestId": "<optional client id>" }
```

Zod rejects invalid JSON shapes. `moveIssue` in `packages/db/move.ts` runs the operation in a database transaction and checks the issue, expected board, current membership, and destination section. The sender receives `move_ack` on success/unchanged state, or `{ "type": "error", "code": "..." }` for a rejected move. A successful move writes an `issue_moved` event to PostgreSQL with `pg_notify` in the same transaction.

Other backend mutations publish events with `publishRealtimeEvent` in `packages/db/realtime.ts`. Events use the `setmeow_issue_events` channel, include an `eventId`, and may have a `boardId` or `userId` routing key. The WebSocket service has one PostgreSQL `LISTEN` connection per process and fans each event to matching local board or user rooms. If a payload is too large for PostgreSQL notification limits, the publisher sends `board_refresh`; clients should reload authoritative state for that board.

Invitation changes route to user rooms and currently produce an `invitation_changed` notification. The frontend then reloads invitation data over the authenticated HTTP API. Board events are sent as incremental updates; a `board_refresh` means the client needs a fresh board state.

## Message reference

| Direction | Type | Purpose |
| --- | --- | --- |
| Server to board client | `board_snapshot` | Initial sections, issues and presence from PostgreSQL. |
| Server to board clients | `presence` | Distinct active users for the board room on this server instance. |
| Client to server | `issue_move` | Request a validated issue move. |
| Server to requesting client | `move_ack` | Confirms that the move was committed or already current. |
| Server to board clients | `issue_moved` | Committed move event, including the actor and optional request ID. |
| Server to matching rooms | Domain event types such as `issue_created`, `issue_updated`, `issue_deleted`, `comment_created` | Incremental updates published by backend/database helpers. Exact payload fields are defined at their emitters and frontend event handlers. |
| Server to board clients | `board_refresh` | Event was too large for `NOTIFY`; client should reload board state. |
| Server to user room | `invitation_changed` | Invitation data changed; client reloads it through HTTP. |
| Server to user room | `user_ready` | Confirms the inbox socket is registered. |
| Server to sender | `error` | Invalid input or a rejected write; includes a machine-readable `code`. |

All server events carry a UUID `eventId`, except protocol messages such as `presence`, `user_ready`, and request acknowledgements. Client event definitions and reducers live under `apps/frontend/app/hooks`.

## Failure and scaling behavior

The notification listener reconnects after a connection loss. Board sockets on this instance receive a new snapshot after listener recovery, and inbox clients receive an `invitation_changed` prompt to reload. Notifications are transient, so the service does not replay events missed during an outage; the snapshot/API refresh restores current data.

Board rooms and presence are process-local. PostgreSQL notifications distribute data events across instances, but they do not distribute presence membership. With multiple service replicas, users connected to different replicas will not see each other in presence; sticky routing can keep a board's users together. A shared presence store would be needed for globally accurate presence across arbitrary replicas.

`GET /healthz` is a process liveness check. `GET /readyz` is ready only while the HTTP server is active and the PostgreSQL notification listener is connected. The service handles SIGINT/SIGTERM by terminating live sockets, closing the HTTP server, and disconnecting Prisma in its executable entry point.
