"use client";

import { useRouter } from "next/navigation";
import { workspacePath } from "../lib/routes";
import { api } from "../lib/api";
import { messageOf } from "./errors";
import type { WorkspaceInitialState } from "./use-dashboard-state";
import { useMemo } from "react";
import type { Issue } from "../lib/types";
import { useAccountSync } from "./use-account-sync";
import { useBoardRealtime } from "./use-board-realtime";
import { useDashboardState } from "./use-dashboard-state";
import { useInvitationActions } from "./use-invitation-actions";
import { useIssueActions } from "./use-issue-actions";
import { useIssueCollaboration } from "./use-issue-collaboration";
import { useIssueDetails } from "./use-issue-details";
import { useThemePreference } from "./use-theme-preference";
import { useWorkspaceActions } from "./use-workspace-actions";

const NOTICE_DURATION_MS = 3200;

export function useDashboardController(initial: WorkspaceInitialState) {
  const router = useRouter();
  const state = useDashboardState(initial);
  const { theme, setTheme } = useThemePreference();
  const refreshAccount = useAccountSync(state);
  useIssueDetails(state);
  const { moveIssue } = useBoardRealtime(state);

  function chooseOrganization(id: string) {
    router.push(workspacePath(id));
  }

  async function signOut() {
    try {
      await api("/auth/signout", { method: "POST" });
      state.setSignedIn(false);
      router.replace("/signin");
      router.refresh();
    } catch (cause) {
      state.setError(messageOf(cause));
    }
  }

  function toggleTheme() {
    setTheme((currentTheme) => (currentTheme === "dark" ? "light" : "dark"));
  }

  function dismissMessage() {
    state.setError("");
    state.setNotice("");
  }

  function openIssue(issue: Issue) {
    state.setEditTitle(issue.title);
    state.setEditDescription(issue.description);
    state.setCommentText("");
    state.setSelectedIssue(issue);
  }
  function announce(message: string) {
    state.setNotice(message);
    window.setTimeout(() => state.setNotice(""), NOTICE_DURATION_MS);
  }

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
    for (const issue of state.issues) {
      grouped.get(issue.sectionId)?.push(issue);
    }
    return grouped;
  }, [state.issues, state.sections]);

  return {
    state,
    user: initial.user,
    theme,
    toggleTheme,
    dismissMessage,
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
    signOut,
  };
}

export type DashboardController = ReturnType<typeof useDashboardController>;
