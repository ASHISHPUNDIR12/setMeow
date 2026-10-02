"use client";

import { CreateWorkspaceDialogs } from "./create-workspace-dialogs";
import { InviteDialog } from "./invite-dialog";
import { IssueDialog } from "./issue-dialog";
import type { WorkspaceController } from "../hooks/use-workspace-controller";

export function WorkspaceOverlays({ app }: { app: WorkspaceController }) {
  const { state } = app;

  return (
    <>
      <CreateWorkspaceDialogs
        creatingOrganization={app.creatingOrganization}
        creatingBoard={app.creatingBoard}
        createOrganizationOpen={state.showCreateOrg}
        onCloseCreateOrganization={() => state.setShowCreateOrg(false)}
        onCreateOrganization={app.createOrganization}
        createBoardOpen={state.showCreateBoard}
        onCloseCreateBoard={() => state.setShowCreateBoard(false)}
        onCreateBoard={app.createBoard}
      />
      <InviteDialog
        sendingInvite={app.sendingInvite}
        inviteOpen={state.showInvite}
        onCloseInvite={() => state.setShowInvite(false)}
        isAdmin={app.isAdmin}
        onSendInvite={app.sendInvite}
        organizationId={state.organizationId}
        onOrganizationChange={app.chooseOrganization}
        memberships={state.memberships}
      />
      <IssueDialog
        key={state.selectedIssue?.id ?? "closed"}
        selectedIssue={state.selectedIssue}
        error={state.error}
        loadingDetails={state.loadingIssueDetails}
        onCloseIssue={() => state.setSelectedIssueId(null)}
        onSaveIssue={app.saveIssue}
        onDeleteIssue={app.deleteIssue}
        onAssignUser={app.assignUser}
        organizationPeople={state.organizationPeople}
        issueAssignments={state.issueAssignments}
        onRemoveAssignment={app.removeAssignment}
        issueComments={state.issueComments}
        onAddComment={app.addComment}
      />
    </>
  );
}
