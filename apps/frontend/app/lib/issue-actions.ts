import { api } from "./api";
import type { Issue } from "./types";
import type { WorkspaceState } from "../hooks/use-workspace-state";
import { messageOf } from "./errors";

type IssueActionState = Pick<
  WorkspaceState,
  "boardId" | "selectedIssue" | "setIssues" | "setSelectedIssueId" | "setError"
>;

export async function createIssue(
  state: IssueActionState,
  title: string,
  sectionId: string,
) {
  if (!state.boardId || !title.trim()) return false;
  try {
    const { issue } = await api<{ issue: Issue }>("/v1/issue", {
      method: "POST",
      body: JSON.stringify({
        boardId: state.boardId,
        sectionId,
        title: title.trim(),
        description: "",
      }),
    });
    // The create response can race with the realtime `issue_created` event.
    // Upsert by id so the same issue is not rendered twice.
    state.setIssues((current) =>
      current.some((item) => item.id === issue.id)
        ? current.map((item) => (item.id === issue.id ? issue : item))
        : [...current, issue],
    );
    return true;
  } catch (cause) {
    state.setError(messageOf(cause));
    return false;
  }
}

export async function deleteIssue(
  state: IssueActionState,
  issue: Issue,
  announce: (message: string) => void,
) {
  if (
    !window.confirm(
      `Delete “${issue.title}”? This also deletes its comments and assignees.`,
    )
  )
    return;
  try {
    await api(`/v1/issue/${issue.id}`, { method: "DELETE" });
    state.setIssues((current) =>
      current.filter((item) => item.id !== issue.id),
    );
    state.setSelectedIssueId(null);
    announce("Issue deleted");
  } catch (cause) {
    state.setError(messageOf(cause));
  }
}

export async function saveIssue(
  state: IssueActionState,
  values: { title: string; description: string },
  announce: (message: string) => void,
) {
  if (!state.selectedIssue) return;
  state.setError("");
  try {
    const { issue } = await api<{ issue: Issue }>(
      `/v1/issue/${state.selectedIssue.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          title: values.title.trim(),
          description: values.description.trim(),
        }),
      },
    );
    state.setIssues((current) =>
      current.map((item) =>
        item.id === issue.id
          ? { ...item, title: issue.title, description: issue.description }
          : item,
      ),
    );
    state.setSelectedIssueId((current) =>
      current === issue.id ? null : current,
    );
    announce("Issue updated");
  } catch (cause) {
    state.setError(messageOf(cause));
  }
}
