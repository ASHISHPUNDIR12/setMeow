"use client";

import { useMemo } from "react";
import type { Issue } from "../lib/types";
import { useAccountSync } from "./use-account-sync";
import { useAuthActions } from "./use-auth-actions";
import { useBoardRealtime } from "./use-board-realtime";
import { useDashboardState } from "./use-dashboard-state";
import { useInvitationActions } from "./use-invitation-actions";
import { useIssueActions } from "./use-issue-actions";
import { useIssueCollaboration } from "./use-issue-collaboration";
import { useIssueDetails } from "./use-issue-details";
import { useThemePreference } from "./use-theme-preference";
import { useWorkspaceActions } from "./use-workspace-actions";
import { useWorkspaceData } from "./use-workspace-data";

export function useDashboardController() {
  const state = useDashboardState();
  const { theme, setTheme } = useThemePreference();
  const refreshAccount = useAccountSync(state);
  useWorkspaceData(state);
  useIssueDetails(state);
  const { moveIssue } = useBoardRealtime(state);

  function chooseOrganization(id: string) {
    state.setOrganizationId(id);
    state.setBoards([]);
    state.setBoardId("");
    state.setSections([]);
    state.setIssues([]);
    state.setActiveUsers([]);
    state.setConnection("offline");
  }
  function openIssue(issue: Issue) {
    state.setEditTitle(issue.title);
    state.setEditDescription(issue.description);
    state.setCommentText("");
    state.setSelectedIssue(issue);
  }
  function announce(message: string) {
    state.setNotice(message);
    window.setTimeout(() => state.setNotice(""), 3200);
  }

  const { submitAuth, signOut } = useAuthActions(state, refreshAccount);
  const workspaceActions = useWorkspaceActions(state, announce, refreshAccount);
  const issueActions = useIssueActions(state, announce);
  const collaborationActions = useIssueCollaboration(state);
  const invitationActions = useInvitationActions(
    state,
    refreshAccount,
    announce,
    chooseOrganization,
  );
  const selectedMembership = state.memberships.find(
    (item) => item.organization.id === state.organizationId,
  );
  const selectedBoard = state.boards.find((item) => item.id === state.boardId);
  const issuesBySection = useMemo(() => {
    const grouped = new Map(
      state.sections.map((section) => [section.id, [] as Issue[]]),
    );
    for (const issue of state.issues) grouped.get(issue.sectionId)?.push(issue);
    return grouped;
  }, [state.issues, state.sections]);

  return {
    state,
    theme,
    setTheme,
    selectedMembership,
    selectedBoard,
    isAdmin: selectedMembership?.role === "admin",
    unreadInvites: state.invitations.length,
    issuesBySection,
    chooseOrganization,
    openIssue,
    moveIssue,
    ...workspaceActions,
    ...issueActions,
    ...collaborationActions,
    ...invitationActions,
    submitAuth,
    signOut,
  };
}

export type DashboardController = ReturnType<typeof useDashboardController>;
