"use client";

import type { FormEvent } from "react";
import { api } from "../lib/api";
import type { Assignment, Comment } from "../lib/types";
import type { DashboardState } from "./use-dashboard-state";
import { messageOf } from "./errors";

export function useIssueCollaboration(state: DashboardState) {
  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.selectedIssue || !state.commentText.trim()) return;
    try {
      await api("/v1/comment", {
        method: "POST",
        body: JSON.stringify({
          issueId: state.selectedIssue.id,
          content: state.commentText.trim(),
        }),
      });
      const result = await api<{ comments: Comment[] }>(
        `/v1/issue/${state.selectedIssue.id}/comments`,
      );
      state.setIssueComments(result.comments);
      state.setCommentText("");
    } catch (cause) {
      state.setError(messageOf(cause));
    }
  }

  async function assignUser(userId: string) {
    if (!state.selectedIssue || !userId) return;
    try {
      await api(`/v1/issue/${state.selectedIssue.id}/assignees`, {
        method: "POST",
        body: JSON.stringify({ userId }),
      });
      const result = await api<{ assignees: Assignment[] }>(
        `/v1/issue/${state.selectedIssue.id}/assignees`,
      );
      state.setIssueAssignments(result.assignees);
    } catch (cause) {
      state.setError(messageOf(cause));
    }
  }

  async function removeAssignment(userId: string) {
    if (!state.selectedIssue) return;
    try {
      await api(`/v1/issue/${state.selectedIssue.id}/assignees/${userId}`, {
        method: "DELETE",
      });
      state.setIssueAssignments((current) =>
        current.filter((item) => item.userId !== userId),
      );
    } catch (cause) {
      state.setError(messageOf(cause));
    }
  }

  return { addComment, assignUser, removeAssignment };
}
