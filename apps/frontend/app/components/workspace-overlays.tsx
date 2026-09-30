"use client";

import { CreateWorkspaceDialogs } from "./create-workspace-dialogs";
import { InvitationViews } from "./invitation-views";
import { IssueDialog } from "./issue-dialog";
import type { DashboardController } from "../hooks/use-dashboard-controller";

export function WorkspaceOverlays({ app }: { app: DashboardController }) {
  const { state } = app;

  return (
    <>
      <CreateWorkspaceDialogs
        createOrganizationOpen={state.showCreateOrg}
        onCloseCreateOrganization={() => state.setShowCreateOrg(false)}
        onCreateOrganization={app.createOrganization}
        newOrgName={state.newOrgName}
        onOrgNameChange={state.setNewOrgName}
        newOrgDescription={state.newOrgDescription}
        onOrgDescriptionChange={state.setNewOrgDescription}
        createBoardOpen={state.showCreateBoard}
        onCloseCreateBoard={() => state.setShowCreateBoard(false)}
        onCreateBoard={app.createBoard}
        newBoardTitle={state.newBoardTitle}
        onBoardTitleChange={state.setNewBoardTitle}
      />
      <InvitationViews
        inviteOpen={state.showInvite}
        onCloseInvite={() => state.setShowInvite(false)}
        isAdmin={app.isAdmin}
        onSendInvite={app.sendInvite}
        organizationId={state.organizationId}
        onOrganizationChange={app.chooseOrganization}
        memberships={state.memberships}
        inviteEmail={state.inviteEmail}
        onInviteEmailChange={state.setInviteEmail}
      />
      <IssueDialog
        selectedIssue={state.selectedIssue}
        onCloseIssue={() => state.setSelectedIssue(null)}
        onSaveIssue={app.saveIssue}
        editTitle={state.editTitle}
        onEditTitleChange={state.setEditTitle}
        editDescription={state.editDescription}
        onEditDescriptionChange={state.setEditDescription}
        onDeleteIssue={app.deleteIssue}
        onAssignUser={app.assignUser}
        organizationPeople={state.organizationPeople}
        issueAssignments={state.issueAssignments}
        onRemoveAssignment={app.removeAssignment}
        issueComments={state.issueComments}
        onAddComment={app.addComment}
        commentText={state.commentText}
        onCommentTextChange={state.setCommentText}
      />
    </>
  );
}
