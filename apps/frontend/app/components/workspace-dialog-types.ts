import type { FormEvent } from "react";
import type {
  Assignment,
  Comment,
  Invitation,
  Issue,
  OrganizationMembership,
  Person,
} from "../lib/types";

export type WorkspaceDialogProps = {
  createOrganizationOpen: boolean;
  createBoardOpen: boolean;
  inviteOpen: boolean;
  inboxOpen: boolean;
  selectedIssue: Issue | null;
  isAdmin: boolean;
  organizationId: string;
  memberships: OrganizationMembership[];
  invitations: Invitation[];
  organizationPeople: Person[];
  issueComments: Comment[];
  issueAssignments: Assignment[];
  newOrgName: string;
  newOrgDescription: string;
  newBoardTitle: string;
  inviteEmail: string;
  editTitle: string;
  editDescription: string;
  commentText: string;
  onCloseCreateOrganization: () => void;
  onCloseCreateBoard: () => void;
  onCloseInvite: () => void;
  onCloseInbox: () => void;
  onCloseIssue: () => void;
  onCreateOrganization: (event: FormEvent<HTMLFormElement>) => void;
  onCreateBoard: (event: FormEvent<HTMLFormElement>) => void;
  onSendInvite: (event: FormEvent<HTMLFormElement>) => void;
  onSaveIssue: (event: FormEvent<HTMLFormElement>) => void;
  onAddComment: (event: FormEvent<HTMLFormElement>) => void;
  onAssignUser: (userId: string) => void;
  onRemoveAssignment: (userId: string) => void;
  onDeleteIssue: (issue: Issue) => void;
  onAnswerInvite: (id: string, answer: "accept" | "decline") => void;
  onOrganizationChange: (id: string) => void;
  onOrgNameChange: (value: string) => void;
  onOrgDescriptionChange: (value: string) => void;
  onBoardTitleChange: (value: string) => void;
  onInviteEmailChange: (value: string) => void;
  onEditTitleChange: (value: string) => void;
  onEditDescriptionChange: (value: string) => void;
  onCommentTextChange: (value: string) => void;
};
