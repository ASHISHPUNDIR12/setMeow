"use client";

import { BoardContent } from "./board-content";
import { BoardHeader } from "./board-header";
import { WorkspaceSidebar } from "./workspace-sidebar";
import { WorkspaceOverlays } from "./workspace-overlays";
import type { DashboardController } from "../hooks/use-dashboard-controller";

export function WorkspaceScreen({ app }: { app: DashboardController }) {
  const { state } = app;
  return (
    <main className="app-shell">
      <WorkspaceSidebar
        memberships={state.memberships}
        organizationId={state.organizationId}
        boards={state.boards}
        boardId={state.boardId}
        email={state.email}
        inviteCount={app.unreadInvites}
        onOrganizationChange={app.chooseOrganization}
        onBoardChange={(board) => {
          state.setBoardId(board.id);
          state.setLoadingBoard(true);
          state.setConnection("connecting");
          state.setError("");
          state.setSections([]);
          state.setIssues([]);
          state.setActiveUsers([]);
        }}
        onCreateOrganization={() => state.setShowCreateOrg(true)}
        onCreateBoard={() => state.setShowCreateBoard(true)}
        onToggleInbox={() => state.setShowInbox((open) => !open)}
        onSignOut={app.signOut}
      />
      <section className="main-content">
        <BoardHeader
          organizationName={app.selectedMembership?.organization.name ?? ""}
          boardTitle={app.selectedBoard?.title ?? ""}
          connection={state.connection}
          activeUsers={state.activeUsers}
          isAdmin={app.isAdmin}
          theme={app.theme}
          error={state.error}
          notice={state.notice}
          onThemeToggle={() =>
            app.setTheme((theme) => (theme === "dark" ? "light" : "dark"))
          }
          onInvite={() => state.setShowInvite(true)}
          onNewIssue={() => document.getElementById("quick-add-issue")?.focus()}
          onDismissMessage={() => {
            state.setError("");
            state.setNotice("");
          }}
        />
        <BoardContent
          hasOrganization={Boolean(state.organizationId)}
          hasBoard={Boolean(app.selectedBoard)}
          loading={state.loadingBoard}
          issues={state.issues}
          sections={state.sections}
          issuesBySection={app.issuesBySection}
          addingSection={state.addingSection}
          onAddingSectionChange={state.setAddingSection}
          onCreateOrganization={() => state.setShowCreateOrg(true)}
          onCreateBoard={() => state.setShowCreateBoard(true)}
          onCreateSection={app.createSection}
          onCreateIssue={app.createIssue}
          onMoveIssue={app.moveIssue}
          onOpenIssue={app.openIssue}
        />
      </section>
      <WorkspaceOverlays app={app} />
    </main>
  );
}
