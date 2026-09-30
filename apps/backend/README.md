# backend

To install dependencies:

```bash
bun install
```

Set `DATABASE_URL` and `JWT_SECRET` in `.env`. If the frontend is not at `http://localhost:3000`, also set `FRONTEND_ORIGIN` to its exact origin.

Apply database migrations from `packages/db` before starting the backend:

```bash
cd ../../packages/db
bunx prisma migrate deploy
```

Then start the backend from this directory:

```bash
bun run index.ts
```

See [API.md](./API.md) for routes, request bodies, access rules, and deletion order.

Run the end-to-end API test against a local PostgreSQL database:

```bash
bun test tests/backend.e2e.test.ts
```

The test creates temporary users and resources, checks the main workflow, and removes its data afterward. It refuses to run against a non-local database.
