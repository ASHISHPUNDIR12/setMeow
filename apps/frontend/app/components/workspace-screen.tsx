"use client";

import { InvitationInbox } from "./invitation-inbox";
import { BoardContent } from "./board-content";
import { BoardHeader } from "./board-header";
import { WorkspaceSidebar } from "./workspace-sidebar";
import { WorkspaceOverlays } from "./workspace-overlays";
import type { DashboardController } from "../hooks/use-dashboard-controller";

export function WorkspaceScreen({
  app,
  view,
}: {
  app: DashboardController;
  view: "board" | "invitations";
}) {
  const { state } = app;
  return (
    <main className="grid min-h-dvh grid-cols-[250px_minmax(0,1fr)] max-lg:grid-cols-[215px_minmax(0,1fr)] max-sm:flex max-sm:flex-col">
      <WorkspaceSidebar
        memberships={state.memberships}
        organizationId={state.organizationId}
        boards={state.boards}
        boardId={state.boardId}
        username={app.user.username}
        email={app.user.email}
        inviteCount={app.unreadInvites}
        onOrganizationChange={app.chooseOrganization}
        onCreateOrganization={() => state.setShowCreateOrg(true)}
        onCreateBoard={() => state.setShowCreateBoard(true)}
        onSignOut={app.signOut}
      />
      <section className="min-w-0 px-[clamp(22px,4vw,62px)] pb-18 max-lg:px-6 max-sm:px-4 max-sm:pb-10">
        <BoardHeader
          organizationName={app.selectedMembership?.organization.name ?? ""}
          boardTitle={
            view === "invitations"
              ? "Invitations"
              : (app.selectedBoard?.title ?? "")
          }
          connection={state.connection}
          activeUsers={state.activeUsers}
          isAdmin={app.isAdmin}
          theme={app.theme}
          error={state.error}
          notice={state.notice}
          onThemeToggle={app.toggleTheme}
          onInvite={() => state.setShowInvite(true)}
          onNewIssue={() => document.getElementById("quick-add-issue")?.focus()}
          onDismissMessage={app.dismissMessage}
        />
        {view === "invitations" ? (
          <InvitationInbox
            invitations={state.invitations}
            onAnswerInvite={app.answerInvite}
          />
        ) : (
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
        )}
      </section>
      <WorkspaceOverlays app={app} />
    </main>
  );
}
