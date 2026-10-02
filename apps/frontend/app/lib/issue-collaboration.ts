import { api } from "./api";
import type { Assignment, Comment } from "./types";
import type { WorkspaceState } from "../hooks/use-workspace-state";
import { messageOf } from "./errors";

type IssueCollaborationState = Pick<
  WorkspaceState,
  "selectedIssue" | "setIssueComments" | "setIssueAssignments" | "setError"
>;

export async function addComment(
  state: IssueCollaborationState,
  content: string,
) {
  if (!state.selectedIssue || !content.trim()) return false;
  state.setError("");
  try {
    const { comment } = await api<{ comment: Comment }>("/v1/comment", {
      method: "POST",
      body: JSON.stringify({
        issueId: state.selectedIssue.id,
        content: content.trim(),
      }),
    });
    state.setIssueComments((current) =>
      current.some((item) => item.id === comment.id)
        ? current
        : [...current, comment],
    );
    return true;
  } catch (cause) {
    state.setError(messageOf(cause));
    return false;
  }
}

export async function assignUser(
  state: IssueCollaborationState,
  userId: string,
) {
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

export async function removeAssignment(
  state: IssueCollaborationState,
  userId: string,
) {
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
