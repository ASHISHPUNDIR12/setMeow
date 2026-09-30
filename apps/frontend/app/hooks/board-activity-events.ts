import { api } from "../lib/api";
import type { Assignment, Comment, SocketMessage } from "../lib/types";
import type {
  BoardEventActions,
  PendingMove,
  SelectedIssueRef,
} from "./board-event-types";

export function handleBoardActivityEvent(
  message: SocketMessage,
  actions: BoardEventActions,
  selectedIssue: SelectedIssueRef,
  pendingMoves: Map<string, PendingMove>,
) {
  if (handleDiscussionEvent(message, actions, selectedIssue)) return;
  handleMoveEvent(message, actions, pendingMoves);
}

function handleDiscussionEvent(
  message: SocketMessage,
  actions: BoardEventActions,
  selectedIssue: SelectedIssueRef,
) {
  if (message.issueId !== selectedIssue.current?.id) return false;
  if (message.type === "comment_created") {
    const comment = message.comment as Comment | undefined;
    if (comment?.id)
      actions.setIssueComments((current) =>
        current.some((item) => item.id === comment.id)
          ? current
          : [...current, comment],
      );
  } else if (message.type === "comment_updated") {
    const comment = message.comment as Partial<Comment> | undefined;
    if (comment?.id)
      actions.setIssueComments((current) =>
        current.map((item) =>
          item.id === comment.id ? { ...item, ...comment } : item,
        ),
      );
  } else if (message.type === "comment_deleted") {
    actions.setIssueComments((current) =>
      current.filter((item) => item.id !== message.commentId),
    );
  } else if (
    message.type === "assignee_added" ||
    message.type === "assignee_removed"
  ) {
    void api<{ assignees: Assignment[] }>(
      `/v1/issue/${String(message.issueId)}/assignees`,
    )
      .then(({ assignees }) => {
        if (selectedIssue.current?.id === message.issueId)
          actions.setIssueAssignments(assignees);
      })
      .catch((cause) =>
        actions.setError(
          cause instanceof Error ? cause.message : "Could not load assignees.",
        ),
      );
    return true;
  }
  return message.type.startsWith("comment_");
}

function handleMoveEvent(
  message: SocketMessage,
  actions: BoardEventActions,
  pendingMoves: Map<string, PendingMove>,
) {
  if (message.type === "issue_moved") {
    actions.setIssues((current) =>
      current.map((issue) =>
        issue.id === message.issueId
          ? { ...issue, sectionId: String(message.sectionId) }
          : issue,
      ),
    );
    if (typeof message.requestId === "string")
      clearPendingMove(message.requestId, pendingMoves);
  } else if (
    (message.type === "move_ack" || message.type === "error") &&
    typeof message.requestId === "string"
  ) {
    const pending = pendingMoves.get(message.requestId);
    if (!pending) return;
    clearPendingMove(message.requestId, pendingMoves);
    if (message.type === "error") {
      actions.setIssues((current) =>
        current.map((issue) =>
          issue.id === pending.issueId
            ? { ...issue, sectionId: pending.previousSectionId }
            : issue,
        ),
      );
      actions.setError(
        message.code === "invalid_section"
          ? "That section is not on this board."
          : "The move could not be saved.",
      );
    }
  }
}

function clearPendingMove(
  requestId: string,
  pendingMoves: Map<string, PendingMove>,
) {
  const pending = pendingMoves.get(requestId);
  if (pending) {
    window.clearTimeout(pending.timer);
    pendingMoves.delete(requestId);
  }
}
