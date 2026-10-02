"use client";

import { useState } from "react";
import { useAuth } from "../components/auth-provider";
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
  memberships: OrganizationMembership[];
  organizationId: string;
  boards: Board[];
  boardId: string;
};

export function useWorkspaceState(initial: WorkspaceInitialState) {
  const { signedIn } = useAuth();

  // Workspace selection and the currently loaded board.
  const [memberships, setMemberships] = useState<OrganizationMembership[]>(
    initial.memberships,
  );
  const organizationId = initial.organizationId;
  const [boards, setBoards] = useState<Board[]>(initial.boards);
  const boardId = initial.boardId;
  const [sections, setSections] = useState<Section[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [movingIssueIds, setMovingIssueIds] = useState<Set<string>>(new Set());
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

  // Selected issue and collaboration data shared with realtime events.
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const selectedIssue =
    issues.find((issue) => issue.id === selectedIssueId) ?? null;
  const [issueComments, setIssueComments] = useState<Comment[]>([]);
  const [issueAssignments, setIssueAssignments] = useState<Assignment[]>([]);
  const [organizationPeople, setOrganizationPeople] = useState<Person[]>([]);
  const [loadingIssueDetails, setLoadingIssueDetails] = useState(false);

  return {
    signedIn,
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
    movingIssueIds,
    setMovingIssueIds,
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
    selectedIssue,
    setSelectedIssueId,
    issueComments,
    setIssueComments,
    issueAssignments,
    setIssueAssignments,
    organizationPeople,
    setOrganizationPeople,
    loadingIssueDetails,
    setLoadingIssueDetails,
  };
}

export type WorkspaceState = ReturnType<typeof useWorkspaceState>;
