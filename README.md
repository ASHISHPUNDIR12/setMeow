# Setmeow

Setmeow is a collaborative kanban app. Users organize work in workspaces and boards, track issues across sections, comment and assign work, invite members, and see live updates.

## Services

| Workspace | Purpose | Local URL |
| --- | --- | --- |
| `apps/frontend` | Next.js web app | `http://localhost:3000` |
| `apps/backend` | Express API and authentication | `http://localhost:3001` |
| `apps/websockets` | Board updates, presence, and invitation notifications | `ws://localhost:3002` |
| `packages/db` | Prisma schema, migrations, and PostgreSQL client | PostgreSQL |

## Local setup

Requirements: Bun 1.4.2, Node.js 24+, and PostgreSQL.

1. Install dependencies from the repository root:

   ```bash
   bun install --frozen-lockfile
   ```

2. Create an empty PostgreSQL database, then copy the environment examples:

   ```bash
   cp apps/backend/.env.example apps/backend/.env
   cp apps/backend/.env packages/db/.env
   cp apps/websockets/.env.example apps/websockets/.env
   cp apps/frontend/.env.example apps/frontend/.env.local
   ```

   Set `DATABASE_URL` in the backend, database, and WebSocket environments. Set the same `JWT_SECRET` in the backend and WebSocket environments.

3. Generate Prisma Client and apply local migrations:

   ```bash
   cd packages/db
   bun run generate
   bun run migrate:dev
   cd ../..
   ```

4. Start the frontend, API, and WebSocket service:

   ```bash
   bun run dev
   ```

   Open `http://localhost:3000`.

## Deployment

Deploy the frontend, backend, and WebSocket service separately, with PostgreSQL reachable by the backend and WebSocket service. Use Bun 1.4.2 and configure the required production environment variables from each service's `.env.example`.

Before deployment, generate Prisma Client in the backend and WebSocket build environments and run `bun run migrate:deploy` once from `packages/db` with the production `DATABASE_URL`. Set `API_URL` and `NEXT_PUBLIC_WS_URL` before building the frontend. Use HTTPS/WSS, and route the WebSocket connection through the frontend hostname so the browser sends its session cookie.

Detailed setup and operations:

- [Frontend](apps/frontend/README.md)
- [Backend](apps/backend/README.md)
- [WebSocket service and data flow](apps/websockets/README.md)
- [Database and migrations](packages/db/README.md)
