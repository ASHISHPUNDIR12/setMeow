"use client";

import { useRouter } from "next/navigation";
import { workspacePath } from "../lib/routes";
import { useAuth } from "../components/auth-provider";
import { messageOf } from "../lib/errors";
import type { WorkspaceInitialState } from "./use-workspace-state";
import { useEffect, useMemo, useRef } from "react";
import type { Issue } from "../lib/types";
import { useAccountSync } from "./use-account-sync";
import { useBoardRealtime } from "./use-board-realtime";
import { useWorkspaceState } from "./use-workspace-state";
import { useInvitationActions } from "./use-invitation-actions";
import { createIssue, deleteIssue, saveIssue } from "../lib/issue-actions";
import {
  addComment,
  assignUser,
  removeAssignment,
} from "../lib/issue-collaboration";
import { useIssueDetails } from "./use-issue-details";
import { useThemePreference } from "./use-theme-preference";
import { useWorkspaceActions } from "./use-workspace-actions";
import { usePendingActions } from "./use-pending-actions";

const NOTICE_DURATION_MS = 3200;

export function useWorkspaceController(initial: WorkspaceInitialState) {
  const router = useRouter();
  const auth = useAuth();
  const { pending, run } = usePendingActions();
  const state = useWorkspaceState(initial);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (noticeTimer.current) clearTimeout(noticeTimer.current);
    },
    [],
  );
  const { theme, setTheme } = useThemePreference();
  const refreshAccount = useAccountSync(state);
  useIssueDetails(state);
  const { moveIssue } = useBoardRealtime(state);

  function chooseOrganization(id: string) {
    router.push(workspacePath(id));
  }

  async function signOut() {
    try {
      await auth.signOut();
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
    state.setError("");
    state.setIssueComments([]);
    state.setIssueAssignments([]);
    state.setOrganizationPeople([]);
    state.setLoadingIssueDetails(true);
    state.setSelectedIssueId(issue.id);
  }
  function announce(message: string) {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    state.setNotice(message);
    noticeTimer.current = setTimeout(
      () => state.setNotice(""),
      NOTICE_DURATION_MS,
    );
  }

  const workspaceActions = useWorkspaceActions(state, announce, refreshAccount);
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
    user: auth.user,
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
    createIssue: (title: string, sectionId: string) =>
      createIssue(state, title, sectionId),
    deleteIssue: (issue: Issue) => deleteIssue(state, issue, announce),
    saveIssue: (values: { title: string; description: string }) =>
      saveIssue(state, values, announce),
    addComment: (content: string) => addComment(state, content),
    assignUser: (userId: string) => assignUser(state, userId),
    removeAssignment: (userId: string) => removeAssignment(state, userId),
    ...invitationActions,
    signingOut: pending.has("signout"),
    signOut: () => run("signout", signOut),
  };
}

export type WorkspaceController = ReturnType<typeof useWorkspaceController>;
