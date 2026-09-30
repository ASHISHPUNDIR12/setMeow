"use client";

import { useState } from "react";
import type {
  Assignment,
  Board,
  Comment,
  Invitation,
  Issue,
  OrganizationMembership,
  Person,
  Section,
} from "../lib/types";

export type WorkspaceInitialState = {
  user: Person;
  memberships: OrganizationMembership[];
  organizationId: string;
  boards: Board[];
  boardId: string;
};

export function useDashboardState(initial: WorkspaceInitialState) {
  const user = initial.user;
  const [signedIn, setSignedIn] = useState(true);

  // Workspace selection and the currently loaded board.
  const [memberships, setMemberships] = useState<OrganizationMembership[]>(
    initial.memberships,
  );
  const organizationId = initial.organizationId;
  const [boards, setBoards] = useState<Board[]>(initial.boards);
  const boardId = initial.boardId;
  const [sections, setSections] = useState<Section[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [activeUsers, setActiveUsers] = useState<Person[]>([]);
  const [connection, setConnection] = useState<
    "offline" | "connecting" | "live"
  >("offline");
  const [loadingBoard, setLoadingBoard] = useState(Boolean(initial.boardId));

  // Feedback and dialog visibility.
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [addingSection, setAddingSection] = useState(false);

  // Workspace creation and invitation forms.
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDescription, setNewOrgDescription] = useState("");
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  // Selected issue, its editable fields, and collaboration details.
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [issueComments, setIssueComments] = useState<Comment[]>([]);
  const [issueAssignments, setIssueAssignments] = useState<Assignment[]>([]);
  const [organizationPeople, setOrganizationPeople] = useState<Person[]>([]);
  const [commentText, setCommentText] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  return {
    user,
    signedIn,
    setSignedIn,
    memberships,
    setMemberships,
    organizationId,
    boards,
    setBoards,
    boardId,
    sections,
    setSections,
    issues,
    setIssues,
    invitations,
    setInvitations,
    activeUsers,
    setActiveUsers,
    connection,
    setConnection,
    loadingBoard,
    setLoadingBoard,
    notice,
    setNotice,
    error,
    setError,
    showCreateOrg,
    setShowCreateOrg,
    showCreateBoard,
    setShowCreateBoard,
    showInvite,
    setShowInvite,
    addingSection,
    setAddingSection,
    newOrgName,
    setNewOrgName,
    newOrgDescription,
    setNewOrgDescription,
    newBoardTitle,
    setNewBoardTitle,
    inviteEmail,
    setInviteEmail,
    selectedIssue,
    setSelectedIssue,
    issueComments,
    setIssueComments,
    issueAssignments,
    setIssueAssignments,
    organizationPeople,
    setOrganizationPeople,
    commentText,
    setCommentText,
    editTitle,
    setEditTitle,
    editDescription,
    setEditDescription,
  };
}

export type DashboardState = ReturnType<typeof useDashboardState>;
