# Frontend refactor review

This refactor keeps the existing Next.js 16.3.6 App Router, React 19, REST backend, WebSockets, Tailwind styling, and routes. No libraries were added. Existing work in the workspace was preserved.

## 1. Account and authentication lifecycle

**Problem:** account reads could complete after navigation or sign-out; an older refresh could overwrite newer memberships. Refreshing also set `signedIn` back to true. Multiple notice timers could clear a newer message.

**Change:** one account effect owns the socket and refresh lifecycle. Reads use an abort signal and a refresh counter. Only the newest active refresh updates state. Notices cancel their previous timer and clean up on unmount. Authentication uses an immediate submission guard, and its fields are disabled while sending.

```diff
- setSignedIn(true);
+ if (signal.aborted || refreshId !== latestRefresh.current) return;
```

Read `app/hooks/use-account-sync.ts`, then `use-workspace-controller.ts`. Effects synchronize external systems; mutations stay in event callbacks.

## 2. Dialogs and form state

**Problem:** issue title, description, comment, workspace name, board name, and invitation email lived in the dashboard's state. Components received values and setter callbacks through multiple layers. Several mutation functions looked like hooks but called no React hooks.

**Change:** drafts live in their dialogs. Mutations receive values directly. The issue dialog delegates people and conversation rendering to `IssueAssignees` and `IssueComments`. `InviteDialog` replaces the misleading `InvitationViews` name. Props are colocated; the catch-all dialog types file was removed.

```diff
- saveIssue(event); // reads globally stored draft values
+ saveIssue({ title, description });
```

`Modal` owns accessible labelling, focus trapping/restoration, scroll locking, and dismissal rules. Static UI primitives stay together in `ui.tsx`. Creation drafts still survive cancellation and clear on success; issue drafts reset when opening another issue.

Read `app/components/issue-dialog.tsx`, then `app/lib/issue-actions.ts`. API mutations are ordinary functions, not hook-shaped wrappers. `usePendingActions` remains a small shared hook because several independent operations need the same immediate duplicate guard and pending cleanup.

## 3. Board and realtime state

**Problem:** the selected issue was a second saved copy of the issue already in the board list. Socket JSON was parsed in two places without rejecting null or malformed message objects. Async event refreshes lacked connection cleanup. A memoized bundle of stable setters made effect dependencies harder to read.

**Change:** store the selected issue ID and derive the issue from the board list. Keep editable drafts independent. A shared parser rejects malformed message envelopes. Board event handlers share the lifecycle signal and ignore other boards. The event dispatcher and handlers are together in `app/lib/board-events.ts`; socket lifecycle remains in `use-board-realtime.ts`. The action bundle is constructed inside the effect, whose dependencies are the individual stable setters.

```diff
- const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
+ const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
+ const selectedIssue = issues.find(issue => issue.id === selectedIssueId) ?? null;
```

Issue-detail reads cancel when switching issues and display loading rather than another issue's data or a misleading empty state. Saving title/description preserves the card's latest section, so a concurrent move is not undone. Existing optimistic moves, retries, loading feedback, and live presence were retained.

Read `app/hooks/use-board-realtime.ts`, `app/lib/board-events.ts`, and `app/lib/issue-mover.ts`. Keep optimistic state separate from confirmation, and guard every async state write with the lifecycle that owns it.

## 4. Composition and cleanup

`WorkspaceApp`, `useWorkspaceController`, and `useWorkspaceState` now name the shared workspace UI accurately; it also renders invitations. Route pages still validate access on the server. `AccountMenu` owns its document listeners instead of mixing them into board navigation. Non-hook helpers live in `lib/`; hooks remain in `hooks/`.

Unused starter SVG assets were removed. Browser storage failures no longer break theme switching. “New issue” is disabled when there is no actual board. Formatting was made consistent without replacing Tailwind markup or the visual design.

## Patterns to avoid

- Storing every input at the application root, or keeping both an ID and a separate saved entity copy.
- Making ordinary async functions look like React hooks.
- Passing DOM events into mutations when the mutation only needs form values.
- Letting network requests or timers outlive their screen.
- Parsing JSON and assuming the result is always a message object.
- Splitting a feature across tiny dispatcher files, or bundling unrelated lifecycle code in a generic UI file.

## Patterns to learn

- Server pages for authorization and initial route data; client components for interaction.
- Local drafts, derived selected records, and explicitly shared realtime data.
- Plain typed function arguments and colocated component props.
- Immediate duplicate guards plus visible pending state and `finally` cleanup.
- Abort signals, functional state updates, and explicit checks before async writes.
- Meaningful component boundaries such as conversation, assignees, and account menus.

## Deliberately unchanged

One small auth context was added in the follow-up below; no global workspace store, context hierarchy, query library, generic repository/API framework, form library, reducer framework, or server-action migration was added. The existing backend remains the authority for authentication and mutations. The board stays a client feature because live presence, optimistic movement, and dialogs share state. Ordinary small components and feature-specific Tailwind styles were not split or rewritten simply to reduce line count.

The selected issue's comments and assignments remain shared because realtime events update them. The separate pending strategies for independent operations and mutually exclusive modal actions remain explicit; forcing them into one configurable abstraction would hide their different behavior. Database transactionality for creating a board and its default sections is a backend concern and was not changed here.

## Validation and limits

Mutation, loading, move-queue, and socket tests cover the affected behavior. Additional regressions cover malformed messages, stale board refreshes, events for another board, and description saves racing with moves. Production routing tests check authentication, workspace selection, invitations navigation, and error boundaries against a mock backend.

Static markup was compared with the pre-refactor versions of the board, sidebar, issue dialog, board creation dialog, and auth screen. Markup matched after accounting for deliberate accessibility attributes and button types. No browser automation dependency was installed; real drag-and-drop, focus interactions, and multi-user behavior still warrant a browser smoke check.

Final checks passed: 26 behavior/component tests, 7 production routing tests, ESLint, TypeScript, and `git diff --check`. The final production build passed with `bun run build --webpack`. Turbopack's final build was blocked by this environment's local-port restriction in its CSS worker, including after requesting escalated execution. The default build script was left unchanged.


## Follow-up: guest and protected layouts with auth context

**Problem:** account checks were difficult to discover across individual pages, and the current user was passed through workspace props while signed-in state lived separately in workspace state.

**Change:** renamed `(auth)` to `(guest)` and `(app)` to `(protected)` without changing URLs. Guest layout handles authenticated-user redirects. Protected layout verifies the account and initializes a small `AuthProvider`. `useAuth()` exposes the user, derived signed-in state, and sign-out. Workspace props now contain only workspace data. Failed sign-out preserves the current account and uses the existing error/loading feedback.

**Decision:** retain authenticated private-data reads and organization/board permission checks because layouts are reused during navigation. The shared account lookup is deduplicated within a server render. A small Next.js `proxy.ts` forwards the actual URL for layout redirects, including query parameters, overwriting any browser-supplied value. Authentication remains in server helpers and the backend.

**Read first:** `(protected)/layout.tsx`, `(guest)/layout.tsx`, `components/auth-provider.tsx`, then `lib/server-api.ts`. The README explains the complete login-to-context flow.

**Validation:** route tests cover existing redirects and resource permissions, preserved query parameters, safe guest return destinations, forged redirect headers, and a single account lookup shared by layout and page.
