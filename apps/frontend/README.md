# Setmeow frontend

The app uses the backend REST API for accounts, workspaces, boards, issues, comments, assignments, and invitations. Board state and member presence update over the authenticated board WebSocket.

## Reading the code

Start with the `page.tsx` files in `app/(auth)` and `app/(app)`. Server pages validate the session before rendering the workspace client component in `app/dashboard.tsx`. Follow `app/components/workspace-screen.tsx` to see how the sidebar, board header, board columns, and dialogs fit together.

| Location                                | Responsibility                                                                            |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| `app/hooks/use-dashboard-controller.ts` | Connects state, data loading, and user actions; derives the selected workspace and board. |
| `app/hooks/use-dashboard-state.ts`      | Holds session, workspace, dialog, and form state, grouped by purpose.                     |
| `app/components/`                       | Renders the UI and calls callbacks supplied by the controller.                            |
| `app/components/workspace-overlays.tsx` | Passes each dialog its specific values and callbacks.                                     |
| `app/hooks/use-*-actions.ts`            | Handles form submissions and REST writes for each feature.                                |
| `app/lib/api.ts`                        | Sends authenticated REST requests and translates failed responses into errors.            |
| `app/lib/types.ts`                      | Defines the frontend data models.                                                         |
| `app/lib/server-api.ts`                 | Verifies sessions with the backend and checks workspace membership on the server.         |
| `app/lib/routes.ts`                     | Builds workspace/board URLs and validates post-login destinations.                       |

### Following a user action

For board selection, the sidebar uses Next.js `Link` to navigate to the board URL. The server page verifies membership and board access, then initializes a fresh workspace controller for that route. `use-board-realtime.ts` fetches the initial sections and issues and opens the board’s WebSocket connection. Refreshing a page or using browser history keeps the board selected by the URL.

For issue editing, `openIssue` fills the form state. `issue-dialog.tsx` renders that state and calls `saveIssue` from `use-issue-actions.ts` on submit. The action saves through the REST API and updates local state.

### Realtime updates

`use-board-realtime.ts` owns connection setup, reconnects, and cleanup. Incoming messages go through `board-event-handler.ts` to `board-content-events.ts` for board content or `board-activity-events.ts` for comments, assignments, and moves.

`use-issue-mover.ts` moves a card immediately and waits for server confirmation. It uses the WebSocket when connected and falls back to REST otherwise. Failed moves restore the previous section; socket moves also have a confirmation timeout.

### Styles

`app/globals.css` imports Tailwind and defines the color, shadow, and breakpoint tokens. Components use Tailwind utilities directly, including responsive and dark variants. The `dark` variant follows the existing `data-theme` preference on the document. Shared buttons and form fields use `app/lib/ui-styles.ts`.

`PawLogo` renders the orange-yellow SVG mark, also used for the browser icon. `AuthArtwork` holds the decorative sign-in and signup illustration. Dialogs use the subtle `shadow-modal` token, separate from the clay shadows used on cards.

Tailwind references: [theme variables](https://tailwindcss.com/docs/theme) and [data attribute dark mode](https://tailwindcss.com/docs/dark-mode#using-a-data-attribute).

## Run locally

Start the backend on port `3001` and the WebSocket service on port `3002`, then run the frontend:

```bash
cd apps/frontend
bun install
bun run dev
```

Copy `.env.example` to `.env.local` to configure the frontend locally:

```env
API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3002
```

Browser REST calls use `/api/*`, which Next.js rewrites to `API_URL` (with legacy `NEXT_PUBLIC_API_URL` as a fallback). Set `API_URL` when building and running the frontend. This keeps the backend’s HttpOnly session cookie on the frontend host, allowing server pages to verify it.

The frontend origin must match `FRONTEND_ORIGIN` in both backend and WebSocket service environments. In production, use HTTPS/WSS. The browser requests a short-lived socket ticket through `/api/auth/socket-ticket`, then connects directly to the WebSocket service. The WebSocket hostname can differ from the frontend; the session cookie stays on the frontend hostname.

## Production deployment

Deploy this as a Node.js Next.js application; it is not a static export because protected pages verify sessions on the server. The backend API and WebSocket service must be deployed and reachable before the frontend is used.

### Build and run

From the repository root, install dependencies and build the frontend workspace:

```bash
bun install --frozen-lockfile
bun --filter frontend build
```

Run the production server from `apps/frontend`:

```bash
bun run start
```

The default Next.js server listens on port `3000`; set the platform's `PORT` value when it provides one. On a monorepo-aware host, set the project root to the repository root and select the `frontend` workspace/package, or configure the host to build from the repository root and run the frontend workspace scripts above. Use a Node.js version supported by the repository (Node 24 or later) and Bun 1.4.2 for workspace installation/builds.

### Required production configuration

Set these variables in the frontend deployment environment before building, since the backend rewrite and browser WebSocket URL are included in the production build:

| Variable | Example | Purpose |
| --- | --- | --- |
| `API_URL` | `https://api.example.com` | Backend origin reachable from the Next.js server for the `/api/*` rewrite and server-side session checks. An internal service URL is suitable. Do not include a trailing slash. |
| `NEXT_PUBLIC_WS_URL` | `wss://setmeow-sockets.onrender.com` | Browser WebSocket origin/base path. The app appends `/boards/{boardId}` or `/users/me` and authenticates using a scoped ticket. A separate hostname is supported. |

The sample `.env.example` contains local development values; replace them with the production origins in your hosting provider's build environment. `NEXT_PUBLIC_API_URL` is supported as a legacy fallback when `API_URL` is unset, but new deployments should use `API_URL`. Never put backend secrets, database credentials, or JWT signing keys in frontend variables.

Configure the backend with `FRONTEND_ORIGIN` set to the exact public frontend origin (for example, `https://app.example.com`). Configure the WebSocket service with the same `FRONTEND_ORIGIN`. Both services must use the same JWT secret as required by their configuration, and the browser-facing backend and socket endpoints must use HTTPS/WSS in production. Board and inbox sockets fetch a fresh ticket before each connection attempt, including reconnects.

After deployment, verify `/signin` loads, sign-in returns to the app, a protected workspace page loads after authentication, and a board receives live updates from a second session. Application route checks can also be run from `apps/frontend` with `node --test tests/routing.test.mjs`.

Sign in or create an account, create a workspace, then create a board. New boards start with Backlog, In progress, and Done sections. Drag issue cards between sections; the board synchronizes the committed move and active member list for everyone viewing it. Cards open issue details for editing, comments, and assignment.

## Routes and protection

| URL | Behavior |
| --- | --- |
| `/` | Redirects to sign-in or the dashboard according to the verified session. |
| `/signin`, `/signup` | Separate public auth pages; authenticated users are redirected into the app. |
| `/dashboard` | Protected entry point; opens the first workspace or shows workspace creation. |
| `/workspaces/[organizationId]` | Protected workspace; opens its first board or shows board creation. |
| `/workspaces/[organizationId]/boards/[boardId]` | Protected, shareable board URL with membership and board checks. |
| `/invitations` | Protected invitation inbox. |

Every protected server page calls the shared authorization helpers. Session verification uses the backend’s JWT validation, not just cookie presence, and account requests are never cached across users. The backend remains responsible for authorizing every REST and WebSocket operation. Invalid sessions redirect to `/signin?next=...`; successful authentication returns to the requested app route. Missing or inaccessible workspaces and boards show the not-found page. Backend failures show a retryable error page.

Run `bun run lint`, `bunx tsc --noEmit`, and `bun run build` for static checks. After building, run `node --test tests/routing.test.mjs` for HTTP route-protection tests against an isolated mock backend. These tests verify routing and authorization handling, not database or WebSocket integration.
