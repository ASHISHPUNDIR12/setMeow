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

export function useDashboardState() {
  const [checking, setChecking] = useState(true);
  const [signedIn, setSignedIn] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [authBusy, setAuthBusy] = useState(false);
  const [authMessage, setAuthMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [memberships, setMemberships] = useState<OrganizationMembership[]>([]);
  const [organizationId, setOrganizationId] = useState("");
  const [boards, setBoards] = useState<Board[]>([]);
  const [boardId, setBoardId] = useState("");
  const [sections, setSections] = useState<Section[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [activeUsers, setActiveUsers] = useState<Person[]>([]);
  const [connection, setConnection] = useState<
    "offline" | "connecting" | "live"
  >("offline");
  const [loadingBoard, setLoadingBoard] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [showCreateBoard, setShowCreateBoard] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showInbox, setShowInbox] = useState(false);
  const [addingSection, setAddingSection] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgDescription, setNewOrgDescription] = useState("");
  const [newBoardTitle, setNewBoardTitle] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [issueComments, setIssueComments] = useState<Comment[]>([]);
  const [issueAssignments, setIssueAssignments] = useState<Assignment[]>([]);
  const [organizationPeople, setOrganizationPeople] = useState<Person[]>([]);
  const [commentText, setCommentText] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");

  return {
    checking,
    setChecking,
    signedIn,
    setSignedIn,
    authMode,
    setAuthMode,
    authBusy,
    setAuthBusy,
    authMessage,
    setAuthMessage,
    email,
    setEmail,
    password,
    setPassword,
    username,
    setUsername,
    memberships,
    setMemberships,
    organizationId,
    setOrganizationId,
    boards,
    setBoards,
    boardId,
    setBoardId,
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
    showInbox,
    setShowInbox,
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
