"use client";

import { useEffect } from "react";
import { api } from "../lib/api";
import type { Assignment, Comment, Person } from "../lib/types";
import type { DashboardState } from "./use-dashboard-state";
import { messageOf } from "./errors";

export function useIssueDetails(state: DashboardState) {
  const {
    selectedIssue,
    organizationId,
    setIssueComments,
    setIssueAssignments,
    setOrganizationPeople,
    setError,
  } = state;
  const issueId = selectedIssue?.id;
  useEffect(() => {
    if (!issueId) return;
    let active = true;
    void Promise.all([
      api<{ comments: Comment[] }>(`/v1/issue/${issueId}/comments`),
      api<{ assignees: Assignment[] }>(`/v1/issue/${issueId}/assignees`),
      api<{ memberships: Array<{ userId: string; user: Person }> }>(
        `/v1/organization/${organizationId}/memberships`,
      ),
    ])
      .then(([comments, assignments, members]) => {
        if (!active) return;
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
        if (active) setError(messageOf(cause));
      });
    return () => {
      active = false;
    };
  }, [
    issueId,
    organizationId,
    setIssueComments,
    setIssueAssignments,
    setOrganizationPeople,
    setError,
  ]);
}
