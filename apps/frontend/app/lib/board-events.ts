import { api } from "./api";
import type {
  Assignment,
  Board,
  Comment,
  Issue,
  Person,
  Section,
  SocketMessage,
} from "./types";
import type {
  BoardEventActions,
  PendingMove,
  SelectedIssueRef,
} from "../hooks/board-event-types";

export function handleBoardEvent(
  message: SocketMessage,
  boardId: string,
  actions: BoardEventActions,
  selectedIssue: SelectedIssueRef,
  pendingMoves: Map<string, PendingMove>,
  signal?: AbortSignal,
) {
  if (
    signal?.aborted ||
    (message.boardId !== undefined && message.boardId !== boardId)
  )
    return;
  if (
    handleBoardContentEvent(
      message,
      boardId,
      actions,
      selectedIssue,
      pendingMoves,
      signal,
    )
  )
    return;
  if (handleDiscussionEvent(message, actions, selectedIssue, signal)) return;
  handleMoveEvent(message, actions, pendingMoves);
}

function handleBoardContentEvent(
  message: SocketMessage,
  boardId: string,
  actions: BoardEventActions,
  selectedIssue: SelectedIssueRef,
  pendingMoves: Map<string, PendingMove>,
  signal?: AbortSignal,
): boolean {
  if (message.type === "board_snapshot") {
    actions.setLoadingBoard(false);
    actions.setSections((message.sections as Section[] | undefined) ?? []);
    actions.setIssues(
      preservePendingMoves(
        (message.issues as Issue[] | undefined) ?? [],
        pendingMoves,
      ),
    );
    actions.setActiveUsers((message.activeUsers as Person[] | undefined) ?? []);
    return true;
  }
  if (message.type === "presence") {
    actions.setActiveUsers((message.activeUsers as Person[] | undefined) ?? []);
    return true;
  }
  if (message.type === "board_refresh") {
    void Promise.all([
      api<{ sections: Section[] }>(`/v1/sections?boardId=${boardId}`, {
        signal,
      }),
      api<{ issues: Issue[] }>(`/v1/issues?boardId=${boardId}`, { signal }),
    ])
      .then(([sections, issues]) => {
        if (signal?.aborted) return;
        actions.setSections(sections.sections ?? []);
        actions.setIssues(
          preservePendingMoves(issues.issues ?? [], pendingMoves),
        );
      })
      .catch((cause) => {
        if (signal?.aborted) return;
        actions.setError(
          cause instanceof Error
            ? cause.message
            : "Could not refresh this board.",
        );
      });
    return true;
  }
  if (message.type === "issue_created" || message.type === "issue_updated") {
    const issue = message.issue as Issue | undefined;
    if (issue?.id)
      actions.setIssues((current) =>
        current.some((item) => item.id === issue.id)
          ? preservePendingMoves(
              current.map((item) => (item.id === issue.id ? issue : item)),
              pendingMoves,
            )
          : preservePendingMoves([...current, issue], pendingMoves),
      );
    return true;
  }
  if (message.type === "issue_deleted" && typeof message.issueId === "string") {
    actions.setIssues((current) =>
      current.filter((item) => item.id !== message.issueId),
    );
    if (selectedIssue.current?.id === message.issueId)
      actions.setSelectedIssueId(null);
    return true;
  }
  if (
    message.type === "section_created" ||
    message.type === "section_updated"
  ) {
    const section = message.section as Section | undefined;
    if (section?.id)
      actions.setSections((current) =>
        current.some((item) => item.id === section.id)
          ? current.map((item) => (item.id === section.id ? section : item))
          : [...current, section],
      );
    return true;
  }
  if (
    message.type === "section_deleted" &&
    typeof message.sectionId === "string"
  ) {
    actions.setSections((current) =>
      current.filter((item) => item.id !== message.sectionId),
    );
    return true;
  }
  if (message.type === "board_updated") {
    const board = message.board as Board | undefined;
    if (board?.id)
      actions.setBoards((current) =>
        current.map((item) => (item.id === board.id ? board : item)),
      );
    return true;
  }
  return false;
}

export function preservePendingMoves(
  issues: Issue[],
  pendingMoves: Map<string, PendingMove>,
) {
  return issues.map((issue) => {
    const pending = pendingMoves.get(issue.id);
    return pending ? { ...issue, sectionId: pending.targetSectionId } : issue;
  });
}

function handleDiscussionEvent(
  message: SocketMessage,
  actions: BoardEventActions,
  selectedIssue: SelectedIssueRef,
  signal?: AbortSignal,
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
      { signal },
    )
      .then(({ assignees }) => {
        if (!signal?.aborted && selectedIssue.current?.id === message.issueId)
          actions.setIssueAssignments(assignees);
      })
      .catch((cause) => {
        if (signal?.aborted || selectedIssue.current?.id !== message.issueId)
          return;
        actions.setError(
          cause instanceof Error ? cause.message : "Could not load assignees.",
        );
      });
    return true;
  }
  return message.type.startsWith("comment_");
}

function handleMoveEvent(
  message: SocketMessage,
  actions: BoardEventActions,
  pendingMoves: Map<string, PendingMove>,
) {
  if (
    message.type !== "issue_moved" ||
    typeof message.issueId !== "string" ||
    typeof message.sectionId !== "string"
  )
    return;
  const pending = pendingMoves.get(String(message.issueId));
  if (pending) {
    pending.confirmedSectionId = String(message.sectionId);
    return;
  }
  actions.setIssues((current) =>
    current.map((issue) =>
      issue.id === message.issueId
        ? { ...issue, sectionId: String(message.sectionId) }
        : issue,
    ),
  );
}
