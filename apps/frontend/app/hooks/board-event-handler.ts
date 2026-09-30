import type { SocketMessage } from "../lib/types";
import type {
  BoardEventActions,
  PendingMove,
  SelectedIssueRef,
} from "./board-event-types";
import { handleBoardActivityEvent } from "./board-activity-events";
import { handleBoardContentEvent } from "./board-content-events";

export function handleBoardEvent(
  message: SocketMessage,
  boardId: string,
  actions: BoardEventActions,
  selectedIssue: SelectedIssueRef,
  pendingMoves: Map<string, PendingMove>,
) {
  if (handleBoardContentEvent(message, boardId, actions, selectedIssue)) return;
  handleBoardActivityEvent(message, actions, selectedIssue, pendingMoves);
}
