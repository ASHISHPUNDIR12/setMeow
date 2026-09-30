# Database package

`db` is a private workspace package shared by the HTTP backend and WebSocket service. It contains the Prisma 7 schema, checked-in PostgreSQL migrations, Prisma Client setup, issue move transaction, and PostgreSQL realtime event publishing.

PostgreSQL is the source of truth for users, organizations, memberships, invitations, boards, sections, issues, assignments, and comments. The WebSocket service uses a separate `pg` client to listen for realtime notifications; the API and socket service both use this package's Prisma client for database reads and writes.

## Configure locally

Set `DATABASE_URL` in `packages/db/.env`; Prisma's CLI configuration loads dotenv from its working directory. For local development, copy `apps/backend/.env` to `packages/db/.env` so both use the same database. The app services load their own environment files from their working directories.

A typical PostgreSQL URL is:

```text
postgresql://user:password@localhost:5432/setmeow
```

The database must exist before migrations run.

## Generate the client and migrate

Install dependencies from the repository root. Then, with `packages/db/.env` configured, run the database commands from `packages/db`:

```bash
bun install --frozen-lockfile
cd packages/db
bun run generate
bun run migrate:dev
```

`generate` creates the ignored output under `packages/db/generated/prisma`, which is imported by `index.ts`. Run it after dependency installation and whenever the Prisma schema changes. `migrate:dev` applies pending migrations locally and can create a new migration during schema development.

For production, run the checked-in migrations as a single release step before deploying new application instances:

```bash
bun run migrate:deploy
```

Run this from `packages/db` in a release job that has the production `DATABASE_URL` configured. Do not copy a production secret into the repository or a checked-in environment file.

Do not use `migrate:dev` against production. Commit every migration directory created during development. Production database backups and a reviewed migration plan are recommended before schema changes.

## Realtime writes

`move.ts` validates and commits issue moves in a transaction, then publishes the move event through `pg_notify` on `setmeow_issue_events`. `realtime.ts` publishes other backend domain events on that same channel. PostgreSQL notifications are transient signals, not a durable queue; clients restore their state from API/database snapshots after reconnecting.

See [the WebSocket flow guide](../../apps/websockets/DATA_FLOW.md) for how the socket service consumes these notifications.
