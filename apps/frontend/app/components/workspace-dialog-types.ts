import type { FormEvent } from "react";
import type {
  Assignment,
  Comment,
  Invitation,
  Issue,
  OrganizationMembership,
  Person,
} from "../lib/types";

export type CreateWorkspaceDialogsProps = {
  createOrganizationOpen: boolean;
  onCloseCreateOrganization: () => void;
  onCreateOrganization: (event: FormEvent<HTMLFormElement>) => void;
  newOrgName: string;
  onOrgNameChange: (value: string) => void;
  newOrgDescription: string;
  onOrgDescriptionChange: (value: string) => void;
  createBoardOpen: boolean;
  onCloseCreateBoard: () => void;
  onCreateBoard: (event: FormEvent<HTMLFormElement>) => void;
  newBoardTitle: string;
  onBoardTitleChange: (value: string) => void;
};

export type InvitationViewsProps = {
  inviteOpen: boolean;
  onCloseInvite: () => void;
  isAdmin: boolean;
  onSendInvite: (event: FormEvent<HTMLFormElement>) => void;
  organizationId: string;
  onOrganizationChange: (id: string) => void;
  memberships: OrganizationMembership[];
  inviteEmail: string;
  onInviteEmailChange: (value: string) => void;
};

export type InvitationInboxProps = {
  invitations: Invitation[];
  onAnswerInvite: (id: string, answer: "accept" | "decline") => void;
};

export type IssueDialogProps = {
  selectedIssue: Issue | null;
  onCloseIssue: () => void;
  onSaveIssue: (event: FormEvent<HTMLFormElement>) => void;
  editTitle: string;
  onEditTitleChange: (value: string) => void;
  editDescription: string;
  onEditDescriptionChange: (value: string) => void;
  onDeleteIssue: (issue: Issue) => void;
  onAssignUser: (userId: string) => void;
  organizationPeople: Person[];
  issueAssignments: Assignment[];
  onRemoveAssignment: (userId: string) => void;
  issueComments: Comment[];
  onAddComment: (event: FormEvent<HTMLFormElement>) => void;
  commentText: string;
  onCommentTextChange: (value: string) => void;
};
