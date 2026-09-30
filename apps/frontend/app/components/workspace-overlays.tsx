"use client";

import { WorkspaceDialogs } from "./workspace-dialogs";
import type { DashboardController } from "../hooks/use-dashboard-controller";

export function WorkspaceOverlays({ app }: { app: DashboardController }) {
  const { state } = app;
  return (
    <WorkspaceDialogs
      createOrganizationOpen={state.showCreateOrg}
      createBoardOpen={state.showCreateBoard}
      inviteOpen={state.showInvite}
      inboxOpen={state.showInbox}
      selectedIssue={state.selectedIssue}
      isAdmin={app.isAdmin}
      organizationId={state.organizationId}
      memberships={state.memberships}
      invitations={state.invitations}
      organizationPeople={state.organizationPeople}
      issueComments={state.issueComments}
      issueAssignments={state.issueAssignments}
      newOrgName={state.newOrgName}
      newOrgDescription={state.newOrgDescription}
      newBoardTitle={state.newBoardTitle}
      inviteEmail={state.inviteEmail}
      editTitle={state.editTitle}
      editDescription={state.editDescription}
      commentText={state.commentText}
      onCloseCreateOrganization={() => state.setShowCreateOrg(false)}
      onCloseCreateBoard={() => state.setShowCreateBoard(false)}
      onCloseInvite={() => state.setShowInvite(false)}
      onCloseInbox={() => state.setShowInbox(false)}
      onCloseIssue={() => state.setSelectedIssue(null)}
      onCreateOrganization={app.createOrganization}
      onCreateBoard={app.createBoard}
      onSendInvite={app.sendInvite}
      onSaveIssue={app.saveIssue}
      onAddComment={app.addComment}
      onAssignUser={app.assignUser}
      onRemoveAssignment={app.removeAssignment}
      onDeleteIssue={app.deleteIssue}
      onAnswerInvite={app.answerInvite}
      onOrganizationChange={state.setOrganizationId}
      onOrgNameChange={state.setNewOrgName}
      onOrgDescriptionChange={state.setNewOrgDescription}
      onBoardTitleChange={state.setNewBoardTitle}
      onInviteEmailChange={state.setInviteEmail}
      onEditTitleChange={state.setEditTitle}
      onEditDescriptionChange={state.setEditDescription}
      onCommentTextChange={state.setCommentText}
    />
  );
}
