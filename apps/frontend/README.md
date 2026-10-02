# Setmeow frontend

The app uses the backend REST API for accounts, workspaces, boards, issues, comments, assignments, and invitations. Board state and member presence update over the authenticated board WebSocket.

## Reading the code

Start with `app/(protected)/layout.tsx`: it verifies the account and initializes `AuthProvider`. Then read `app/(guest)/layout.tsx` and `app/components/auth-provider.tsx`. A board's server `page.tsx` in `app/(protected)/workspaces/[organizationId]/boards/[boardId]` checks resource access before passing workspace data to `WorkspaceApp`. Pages and layouts remain Server Components; the auth context, workspace, and authentication forms are client boundaries because they need state, browser APIs, and live connections.

| Location                                             | Responsibility                                                                                       |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `app/lib/server-api.ts`                              | Cookie-authenticated server reads, session verification, workspace access.                           |
| `app/(guest)/layout.tsx`, `app/(protected)/layout.tsx` | Shared guest redirects and authenticated layout. |
| `app/components/auth-provider.tsx` | Current user context, derived signed-in state, and sign-out. |
| `proxy.ts` | Forwards the requested URL to server layouts to preserve auth return destinations. |
| `app/components/workspace-app.tsx`                   | Client entry point; connects the workspace controller to the screen.                                 |
| `app/hooks/use-workspace-controller.ts`              | Composes hooks and mutation callbacks, navigation, and notifications.                                |
| `app/hooks/use-workspace-state.ts`                   | Data genuinely shared across the screen and realtime handlers; selected issue derived from its ID.   |
| `app/components/workspace-screen.tsx`                | Sidebar, header, board, invitations, and overlay composition.                                        |
| `app/components/issue-dialog.tsx`                    | Local issue drafts and submit feedback; delegates people and conversation rendering.                 |
| `app/components/modal.tsx`                           | Focus management, keyboard dismissal, scroll locking, and accessible dialog title.                   |
| `app/hooks/use-*.ts`                                 | React hooks for fetching, connections, async pending state, theme, and workspace/invitation actions. |
| `app/lib/issue-actions.ts`, `issue-collaboration.ts` | Plain async mutations receiving explicit form values; no React hooks.                                |
| `app/lib/api.ts`                                     | Browser REST calls through `/api`, HTTP error status, and expired-session redirects.                 |
| `app/lib/board-events.ts`, `realtime.ts`             | Incoming board events, message parsing, socket tickets, and socket creation.                         |
| `app/lib/types.ts`, `routes.ts`, `errors.ts`         | Domain models, safe route builders, and error messages.                                              |

Component props live beside the component that owns them. Form drafts live in their dialogs; cancelling retains the draft, successful creation clears it, and reopening an issue starts from its saved data. Comments, assignments, and presence remain shared because sockets also update them.

### Following a user action

A board link navigates to its server page, which verifies membership and board access. The client initializes a workspace for that route. `use-board-realtime.ts` loads a REST fallback alongside the board socket and cancels both when leaving the board.

For editing, `openIssue` stores only an issue ID. `IssueDialog` initializes its own title, description, and comment draft. Saving passes `{ title, description }` to the mutation; the board updates and the modal closes on success. A failure preserves the draft and displays the error. The assignees and conversation have separate, small UI components.

### Realtime updates

`use-board-realtime.ts` owns connection setup and cleanup. `realtime.ts` parses incoming JSON before `board-events.ts` applies board content, comments, assignments, and move events. Async refreshes share the connection's abort signal, so an unmounted board cannot receive a late refresh.

`app/lib/issue-mover.ts` moves a card immediately and shows “Saving…” until the HTTP endpoint confirms it. WebSockets deliver committed moves to other viewers. Rapid moves of the same issue save sequentially while preserving the newest destination. Network/server failures retry once; unresolved saves read the stored issue before restoring it or reporting failure.

Account refreshes use their own lifecycle signal and ignore superseded responses. Notice timers are cancelled before showing a new notice and when unmounting.

See [REFACTOR.md](./REFACTOR.md) for the feature-by-feature changes, rationale, and patterns to learn.

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

| Variable             | Example                              | Purpose                                                                                                                                                                         |
| -------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_URL`            | `https://api.example.com`            | Backend origin reachable from the Next.js server for the `/api/*` rewrite and server-side session checks. An internal service URL is suitable. Do not include a trailing slash. |
| `NEXT_PUBLIC_WS_URL` | `wss://setmeow-sockets.onrender.com` | Browser WebSocket origin/base path. The app appends `/boards/{boardId}` or `/users/me` and authenticates using a scoped ticket. A separate hostname is supported.               |

The sample `.env.example` contains local development values; replace them with the production origins in your hosting provider's build environment. `NEXT_PUBLIC_API_URL` is supported as a legacy fallback when `API_URL` is unset, but new deployments should use `API_URL`. Never put backend secrets, database credentials, or JWT signing keys in frontend variables.

Configure the backend with `FRONTEND_ORIGIN` set to the exact public frontend origin (for example, `https://app.example.com`). Configure the WebSocket service with the same `FRONTEND_ORIGIN`. Both services must use the same JWT secret as required by their configuration, and the browser-facing backend and socket endpoints must use HTTPS/WSS in production. Board and inbox sockets fetch a fresh ticket before each connection attempt, including reconnects.

After deployment, verify `/signin` loads, sign-in returns to the app, a protected workspace page loads after authentication, and a board receives live updates from a second session. Application route checks can also be run from `apps/frontend` with `node --test tests/routing.test.mjs`.

Sign in or create an account, create a workspace, then create a board. New boards start with Backlog, In progress, and Done sections. Drag issue cards between sections; the board synchronizes the committed move and active member list for everyone viewing it. Cards open issue details for editing, comments, and assignment.

## Routes and protection

| URL                                             | Behavior                                                                      |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| `/`                                             | Redirects to sign-in or the dashboard according to the verified session.      |
| `/signin`, `/signup`                            | Separate public auth pages; authenticated users are redirected into the app.  |
| `/dashboard`                                    | Protected entry point; opens the first workspace or shows workspace creation. |
| `/workspaces/[organizationId]`                  | Protected workspace; opens its first board or shows board creation.           |
| `/workspaces/[organizationId]/boards/[boardId]` | Protected, shareable board URL with membership and board checks.              |
| `/invitations`                                  | Protected invitation inbox.                                                   |

The `(guest)` group contains sign-in and signup; its layout redirects verified users to a safe `next` destination or the dashboard. The `(protected)` group contains dashboard, invitations, workspaces, and boards; its layout verifies the account before initializing the client auth context. Route groups do not change public URLs.

The authentication flow is: the backend sets an HttpOnly cookie after sign-in; the protected server layout calls `requireAccount()`; `getAccount()` forwards that cookie to `/auth/me`; the verified user becomes `AuthProvider`'s initial state. Client components read `{ user, signedIn, signOut }` with `useAuth()`. There is no browser mount-time `/auth/me` fetch. Sign-out clears the context only after the backend succeeds, then navigates to sign-in. UI pending/error state stays with the caller.

Server Components cannot read client context. Pages loading private data still call the shared authorization helpers because layouts persist on navigation and do not protect data reads by themselves. React's `cache()` shares the account lookup within a server render, not across users or sessions. Organization memberships and board state remain owned by the workspace feature. The backend authorizes every REST and WebSocket operation; browser API calls redirect on expired sessions.

Server layouts do not receive `searchParams`. `proxy.ts` forwards the pathname and query in an overwritten request header so guest redirects and protected login redirects preserve the destination. It performs no authentication and does not run for `/api` or static assets. `safeReturnTo()` allows only app destinations. Missing or inaccessible workspaces and boards show the not-found page. Backend failures show a retryable error page.

Run `bun run lint`, `bunx tsc --noEmit`, and `bun run build` for static checks. After building, run `node --test tests/routing.test.mjs` for HTTP route-protection tests against an isolated mock backend. These tests verify routing and authorization handling, not database or WebSocket integration.

## Verification

Run `bun run test`, `bun run lint`, and `bun run check-types` for the component, mutation, realtime, and static checks. After `bun run build`, run `bun run test:routes` to test authorization and navigation against an isolated mock backend. Route tests need permission to listen on local ports. These checks do not replace a browser check of drag-and-drop, keyboard focus, and multi-user collaboration against the actual services.
