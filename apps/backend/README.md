# backend

## Local development

Copy `.env.example` to `.env` and set `DATABASE_URL` and `JWT_SECRET`. If the frontend is not at `http://localhost:3000`, set `FRONTEND_ORIGIN` to its exact origin.

Install dependencies from the repository root:

```bash
bun install --frozen-lockfile
```

To enable social sign-in, add these server-only values to `apps/backend/.env`:

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Register these exact OAuth redirect URIs with the providers (replace the origin in production):

- Google: `http://localhost:3000/api/auth/oauth/google/callback`
- GitHub: `http://localhost:3000/api/auth/oauth/github/callback`

The frontend `/api` proxy forwards these callbacks to the backend. Never put provider secrets in frontend environment variables. Sign-in requires Google to return a verified email and GitHub to provide a verified primary email. OAuth accounts can use the same verified email as an existing password account.

From the repository root, install dependencies, apply migrations, and start the backend:

```bash
bun install --frozen-lockfile
cd packages/db
cp ../../apps/backend/.env .env
bun run generate
bun run migrate:dev
cd ../../apps/backend
bun run dev
```

## Production deployment

Run the backend as a long-lived Bun HTTP service. It is not a static application. Provision PostgreSQL and deploy the database migrations before sending traffic. The backend exposes `GET /health` for platform health checks.

### Build and start

Use the repository root as the install context so Bun can install the `db` workspace dependency. Run migrations once from the release job with its production `DATABASE_URL` set:

```bash
bun install --frozen-lockfile
cd packages/db
bun run migrate:deploy
```

Configure the host's start command as `bun run start` with working directory `apps/backend`. Set the platform provided `PORT`; the service defaults to `3001` when unset. Use Bun 1.4.2 to match the repository's package manager. No separate compile step is required for Bun's TypeScript entry point. Run the migration step once in the release job (with the production `DATABASE_URL` available), not on each backend instance.

### Production environment

Set these server-side values in the backend service environment. Do not commit real credentials or put them in the frontend environment.

| Variable | Required | Purpose |
| --- | --- | --- |
| `PORT` | Usually provided by host | HTTP listen port. |
| `DATABASE_URL` | Yes | PostgreSQL connection string for the production database. Ensure the database permits connections from the backend host. |
| `JWT_SECRET` | Yes | Strong, private signing key shared with the WebSocket service. Generate a unique high-entropy value for each environment; do not reuse the example value. |
| `FRONTEND_ORIGIN` | Yes in production | Exact browser frontend origin, for example `https://app.example.com`, without a trailing slash. Used for CORS and OAuth redirects. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Optional | Enable Google sign-in when both are set. |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` | Optional | Enable GitHub sign-in when both are set. |

Run `bun run generate` after installation when preparing the release artifact. Run `bun run migrate:deploy` from `packages/db` after dependencies are installed and before the new backend version serves requests. Do not run migrations independently on every backend instance. Back up the database before production schema changes and use a restricted database account appropriate for the application.

For OAuth, register callbacks on the public frontend origin because `/api` is proxied to this backend:

- `https://app.example.com/api/auth/oauth/google/callback`
- `https://app.example.com/api/auth/oauth/github/callback`

Configure the WebSocket service with the same `DATABASE_URL`, `JWT_SECRET`, and `FRONTEND_ORIGIN`. Put the services behind HTTPS, and make sure the frontend's `/api/*` proxy reaches this backend. Production auth cookies require HTTPS. Keep the frontend origin identical across the frontend, backend, and WebSocket service configuration.

### Deployment checks

After deployment, request `GET /health`, create an account or sign in through the frontend, and confirm authenticated API requests succeed. If OAuth is enabled, complete a provider sign-in to verify its registered callback and origin. Check backend logs for database connection or migration errors; avoid logging credentials.

See [API.md](./API.md) for routes, request bodies, access rules, and deletion order.

Run the end-to-end API test against a local PostgreSQL database:

```bash
bun test tests/backend.e2e.test.ts
```

The test creates temporary users and resources, checks the main workflow, and removes its data afterward. It refuses to run against a non-local database.
