"use client";

import type { MutableRefObject } from "react";
import { api } from "../lib/api";
import type { Issue } from "../lib/types";
import type { DashboardState } from "./use-dashboard-state";
import type { PendingMove } from "./board-event-types";
import { messageOf } from "./errors";

const MOVE_CONFIRMATION_TIMEOUT_MS = 6000;

export function useIssueMover(
  state: DashboardState,
  socket: MutableRefObject<WebSocket | null>,
  pendingMoves: MutableRefObject<Map<string, PendingMove>>,
) {
  async function moveIssue(issueId: string, targetSectionId: string) {
    const issue = state.issues.find((item) => item.id === issueId);
    if (!issue || issue.sectionId === targetSectionId) return;
    if (socket.current?.readyState === WebSocket.OPEN) {
      moveThroughSocket(issue, targetSectionId, state, socket, pendingMoves);
      return;
    }
    // Show the move immediately; restore the previous section if saving fails.
    state.setIssues((items) =>
      items.map((item) =>
        item.id === issueId ? { ...item, sectionId: targetSectionId } : item,
      ),
    );
    try {
      await api(`/v1/issue/${issueId}/move`, {
        method: "PUT",
        body: JSON.stringify({ sectionId: targetSectionId }),
      });
    } catch (cause) {
      state.setIssues((items) =>
        items.map((item) =>
          item.id === issueId ? { ...item, sectionId: issue.sectionId } : item,
        ),
      );
      state.setError(messageOf(cause));
    }
  }

  return moveIssue;
}

function moveThroughSocket(
  issue: Issue,
  targetSectionId: string,
  state: DashboardState,
  socket: MutableRefObject<WebSocket | null>,
  pendingMoves: MutableRefObject<Map<string, PendingMove>>,
) {
  const requestId = crypto.randomUUID();
  const timer = window.setTimeout(() => {
    if (!pendingMoves.current.has(requestId)) return;
    pendingMoves.current.delete(requestId);
    state.setIssues((items) =>
      items.map((item) =>
        item.id === issue.id ? { ...item, sectionId: issue.sectionId } : item,
      ),
    );
    state.setError("The server did not confirm that move. Try again.");
  }, MOVE_CONFIRMATION_TIMEOUT_MS);
  pendingMoves.current.set(requestId, {
    issueId: issue.id,
    previousSectionId: issue.sectionId,
    timer,
  });
  state.setIssues((items) =>
    items.map((item) =>
      item.id === issue.id ? { ...item, sectionId: targetSectionId } : item,
    ),
  );
  socket.current?.send(
    JSON.stringify({
      type: "issue_move",
      issueId: issue.id,
      sectionId: targetSectionId,
      requestId,
    }),
  );
}
