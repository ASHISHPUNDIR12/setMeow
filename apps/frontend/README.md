# Setmeow frontend

The app uses the backend REST API for accounts, workspaces, boards, issues, comments, assignments, and invitations. Board state and member presence update over the authenticated board WebSocket.

## Run locally

Start the backend on port `3001` and the WebSocket service on port `3002`, then run the frontend:

```bash
cd apps/frontend
bun install
bun run dev
```

Optional frontend environment values:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3002
```

The frontend origin must match `FRONTEND_ORIGIN` in both backend and WebSocket service environments. In production, use HTTPS/WSS and set the public URLs to the deployed API and socket host.

Sign in or create an account, create a workspace, then create a board. New boards start with Backlog, In progress, and Done sections. Drag issue cards between sections; the board synchronizes the committed move and active member list for everyone viewing it. Cards open issue details for editing, comments, and assignment.
