"use client";

import type { WorkspaceDialogProps } from "./workspace-dialog-types";
import { CreateWorkspaceDialogs } from "./create-workspace-dialogs";
import { InvitationViews } from "./invitation-views";
import { IssueDialog } from "./issue-dialog";

export function WorkspaceDialogs(props: WorkspaceDialogProps) {
  return (
    <>
      <CreateWorkspaceDialogs props={props} />
      <InvitationViews props={props} />
      <IssueDialog props={props} />
    </>
  );
}
