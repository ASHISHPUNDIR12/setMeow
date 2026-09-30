# Backend API

The server uses `/auth` for login routes and `/v1` for resource routes. Sign in with an HTTP cookie. All `/v1` routes require the `accessToken` cookie. IDs in URLs and request bodies are UUID strings.

| Method | Path                                          | Request body or query                        | Access                                                             |
| ------ | --------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| POST   | `/auth/signup`                                | `{ username, email, password }`              | Public                                                             |
| POST   | `/auth/signin` (also `/auth/login`)           | `{ email, password }`                        | Public                                                             |
| POST   | `/auth/signout`                               | None                                         | Clears the login cookie                                            |
| POST   | `/auth/socket-ticket`                         | `{ path: "/boards/<uuid>" }` or `{ path: "/users/me" }` | Signed in; issues a short-lived ticket for that socket path |
| GET    | `/auth/oauth/google?next=/dashboard`          | Browser redirect                             | Starts Google OAuth sign-in                                        |
| GET    | `/auth/oauth/github?next=/dashboard`          | Browser redirect                             | Starts GitHub OAuth sign-in                                        |
| GET    | `/auth/oauth/{google,github}/callback`        | Provider callback                            | Validates OAuth state, establishes the login cookie, and redirects |
| POST   | `/v1/organization`                            | `{ name, description }`                      | Signed in; creator becomes admin                                   |
| GET    | `/v1/organizations` (also `/v1/organization`) | None                                         | Signed in; returns own memberships and organizations               |
| GET    | `/v1/organization/:id`                        | None                                         | Organization member                                                |
| PUT    | `/v1/organization/:id`                        | `{ name? , description? }`                   | Admin                                                              |
| DELETE | `/v1/organization/:id`                        | None                                         | Admin; requires boards to be deleted first                         |
| GET    | `/v1/organization/:id/memberships`            | None                                         | Organization member                                                |
| DELETE | `/v1/organization/:id/membership/:userId`     | None                                         | Admin or self; cannot remove last admin                            |
| POST   | `/v1/invite`                                  | `{ email, orgId }`                           | Organization admin; recipient must have an account                 |
| GET    | `/v1/invites`                                 | None                                         | Signed in; returns own pending invitations                         |
| POST   | `/v1/invite/:inviteId/accept`                 | None                                         | Invited user; creates their membership                             |
| POST   | `/v1/invite/:inviteId/decline`                | None                                         | Invited user                                                       |
| POST   | `/v1/organization/:id/board`                  | `{ title }`                                  | Organization member                                                |
| GET    | `/v1/organization/:id/boards`                 | None                                         | Organization member                                                |
| GET    | `/v1/organization/:id/board/:boardId`         | None                                         | Organization member                                                |
| PUT    | `/v1/organization/:id/board/:boardId`         | `{ title }`                                  | Organization member                                                |
| DELETE | `/v1/organization/:id/board/:boardId`         | None                                         | Admin; requires issues and sections to be deleted first            |
| POST   | `/v1/section`                                 | `{ boardId, title }`                         | Organization member                                                |
| GET    | `/v1/sections?boardId=:boardId`               | None                                         | Organization member                                                |
| GET    | `/v1/section/:sectionId`                      | None                                         | Organization member                                                |
| PUT    | `/v1/section/:sectionId`                      | `{ title }`                                  | Organization member                                                |
| DELETE | `/v1/section/:sectionId`                      | None                                         | Organization member; requires issues to be moved or deleted first  |
| POST   | `/v1/issue`                                   | `{ boardId, sectionId, title, description }` | Organization member                                                |
| GET    | `/v1/issues?boardId=:boardId`                 | None                                         | Organization member                                                |
| GET    | `/v1/issue/:issueId`                          | None                                         | Organization member                                                |
| PUT    | `/v1/issue/:issueId`                          | `{ title?, description? }`                   | Organization member                                                |
| PUT    | `/v1/issue/:issueId/move`                     | `{ sectionId }`                              | Organization member; section must be on same board                 |
| DELETE | `/v1/issue/:issueId`                          | None                                         | Organization member; deletes comments and assignments too          |
| GET    | `/v1/issue/:issueId/assignees`                | None                                         | Organization member                                                |
| POST   | `/v1/issue/:issueId/assignees`                | `{ userId }`                                 | Organization member; assignee must also be a member                |
| DELETE | `/v1/issue/:issueId/assignees/:userId`        | None                                         | Organization member                                                |
| POST   | `/v1/comment`                                 | `{ issueId, content }`                       | Organization member; author comes from login cookie                |
| GET    | `/v1/issue/:issueId/comments`                 | None                                         | Organization member                                                |
| GET    | `/v1/comment/:commentId`                      | None                                         | Organization member                                                |
| PUT    | `/v1/comment/:commentId`                      | `{ content }`                                | Author or admin                                                    |
| DELETE | `/v1/comment/:commentId`                      | None                                         | Author or admin                                                    |

Create resources in this order: organization, board, section, issue, comment or assignment. Deletes return `409 Conflict` when a parent still has dependent resources, except deleting an issue removes its comments and assignments in one transaction.

Removing a member also removes that user's assignments to issues in the organization. Existing comments remain attributed to the user.

Invitations are in-app only: inviting does not send email. The recipient must already have an account. After sign in, the app should call `GET /v1/invites` with the login cookie, show the returned organization names, and submit the invitation ID to the accept or decline route. Accepting an invitation adds the user as a `member`; declining leaves them outside the organization.

For a browser frontend on a different origin, include credentials on login and subsequent requests (for example, `fetch(url, { credentials: "include" })`). The backend allows the origin configured by `FRONTEND_ORIGIN`, which defaults to `http://localhost:3000`. Production auth cookies use `SameSite=None; Secure` for cross-site deployments; local development keeps `SameSite=Lax`.

The frontend calls its `/api/*` proxy, configured by `API_URL` on the Next.js server. The separate WebSocket service now defaults to port `3002`; override its URL in the frontend with `NEXT_PUBLIC_WS_URL` if needed.

## Board WebSocket

Run the separate service with `bun run index.ts` from `apps/websockets`. It reads `DATABASE_URL` and `JWT_SECRET` from `apps/websockets/.env` (the same values used by the backend) and listens on `WS_PORT`, default `3002`.

First request `POST /auth/socket-ticket` through the authenticated frontend API proxy with `{ "path": "/boards/<boardId>" }` or `{ "path": "/users/me" }`. The response contains a ticket valid for up to 60 seconds and scoped to that socket path. Connect to `wss://<socket-host>/boards/:boardId?ticket=<ticket>` (or `/users/me?ticket=<ticket>`). Existing same-host connections can still use the `accessToken` cookie. The server checks the token and current organization membership before upgrading the connection. On connect it sends `board_snapshot` with `sections`, `issues`, and `activeUsers`. It then sends `presence` whenever the distinct active user list changes; multiple tabs for one user count once.

Send `{ "type": "issue_move", "issueId": "<uuid>", "sectionId": "<uuid>", "requestId": "<optional client id>" }` after a drag and drop. The server verifies both records belong to the connected board, commits the move, and returns `move_ack` to the sender. All connected members receive `issue_moved` with `boardId`, `issueId`, `sectionId`, `movedBy`, `eventId`, and the optional `requestId`. `PUT /v1/issue/:issueId/move` uses the same transaction and broadcasts the same event. Invalid messages and moves return `{ "type": "error", "code": "..." }` to the sender.

The service uses PostgreSQL `LISTEN/NOTIFY` for cross-process broadcasts. In-memory room state is only used for active connections and presence; issue state remains in PostgreSQL.
