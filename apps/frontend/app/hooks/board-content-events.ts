import { api } from "../lib/api";
import type {
  Board,
  Issue,
  Person,
  Section,
  SocketMessage,
} from "../lib/types";
import type { BoardEventActions, SelectedIssueRef } from "./board-event-types";

export function handleBoardContentEvent(
  message: SocketMessage,
  boardId: string,
  actions: BoardEventActions,
  selectedIssue: SelectedIssueRef,
): boolean {
  if (message.type === "board_snapshot") {
    actions.setLoadingBoard(false);
    actions.setSections((message.sections as Section[] | undefined) ?? []);
    actions.setIssues((message.issues as Issue[] | undefined) ?? []);
    actions.setActiveUsers((message.activeUsers as Person[] | undefined) ?? []);
    return true;
  }
  if (message.type === "presence") {
    actions.setActiveUsers((message.activeUsers as Person[] | undefined) ?? []);
    return true;
  }
  if (message.type === "board_refresh") {
    void Promise.all([
      api<{ sections: Section[] }>(`/v1/sections?boardId=${boardId}`),
      api<{ issues: Issue[] }>(`/v1/issues?boardId=${boardId}`),
    ])
      .then(([sections, issues]) => {
        actions.setSections(sections.sections ?? []);
        actions.setIssues(issues.issues ?? []);
      })
      .catch((cause) =>
        actions.setError(
          cause instanceof Error
            ? cause.message
            : "Could not refresh this board.",
        ),
      );
    return true;
  }
  if (message.type === "issue_created" || message.type === "issue_updated") {
    const issue = message.issue as Issue | undefined;
    if (issue?.id)
      actions.setIssues((current) =>
        current.some((item) => item.id === issue.id)
          ? current.map((item) => (item.id === issue.id ? issue : item))
          : [...current, issue],
      );
    return true;
  }
  if (message.type === "issue_deleted" && typeof message.issueId === "string") {
    actions.setIssues((current) =>
      current.filter((item) => item.id !== message.issueId),
    );
    if (selectedIssue.current?.id === message.issueId)
      actions.setSelectedIssue(null);
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
