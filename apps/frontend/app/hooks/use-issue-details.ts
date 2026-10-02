"use client";

import { useEffect } from "react";
import { api } from "../lib/api";
import type { Assignment, Comment, Person } from "../lib/types";
import type { WorkspaceState } from "./use-workspace-state";
import { messageOf } from "../lib/errors";

export function useIssueDetails(state: WorkspaceState) {
  const {
    selectedIssue,
    organizationId,
    setIssueComments,
    setIssueAssignments,
    setOrganizationPeople,
    setError,
    setLoadingIssueDetails,
  } = state;
  const issueId = selectedIssue?.id;
  useEffect(() => {
    if (!issueId) return;
    const controller = new AbortController();
    const signal = controller.signal;
    void Promise.all([
      api<{ comments: Comment[] }>(`/v1/issue/${issueId}/comments`, { signal }),
      api<{ assignees: Assignment[] }>(`/v1/issue/${issueId}/assignees`, {
        signal,
      }),
      api<{ memberships: Array<{ userId: string; user: Person }> }>(
        `/v1/organization/${organizationId}/memberships`,
        { signal },
      ),
    ])
      .then(([comments, assignments, members]) => {
        if (signal.aborted) return;
        setIssueComments(comments.comments ?? []);
        setIssueAssignments(assignments.assignees ?? []);
        setOrganizationPeople(
          (members.memberships ?? []).map((member) => ({
            ...member.user,
            id: member.userId,
          })),
        );
      })
      .catch((cause) => {
        if (!signal.aborted) setError(messageOf(cause));
      })
      .finally(() => {
        if (!signal.aborted) setLoadingIssueDetails(false);
      });
    return () => {
      controller.abort();
    };
  }, [
    issueId,
    organizationId,
    setIssueComments,
    setIssueAssignments,
    setOrganizationPeople,
    setError,
    setLoadingIssueDetails,
  ]);
}
