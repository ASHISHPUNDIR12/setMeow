import type { MutableRefObject } from "react";
import { api, ApiError } from "./api";
import type { Issue } from "./types";
import type { WorkspaceState } from "../hooks/use-workspace-state";
import type { PendingMove } from "../hooks/board-event-types";

export function createIssueMover(
  state: Pick<
    WorkspaceState,
    "issues" | "setIssues" | "setMovingIssueIds" | "setError"
  >,
  pendingMoves: MutableRefObject<Map<string, PendingMove>>,
) {
  return function moveIssue(issueId: string, targetSectionId: string) {
    const pending = pendingMoves.current.get(issueId);
    const issue = state.issues.find((item) => item.id === issueId);
    if (
      !issue ||
      (pending?.targetSectionId ?? issue.sectionId) === targetSectionId
    )
      return pending?.completion ?? Promise.resolve();

    state.setIssues((items) =>
      items.map((item) =>
        item.id === issueId ? { ...item, sectionId: targetSectionId } : item,
      ),
    );
    if (pending) {
      // Keep the newest destination visible while the current save finishes.
      pending.targetSectionId = targetSectionId;
      return pending.completion;
    }

    const move: PendingMove = {
      issueId,
      targetSectionId,
      confirmedSectionId: issue.sectionId,
      completion: Promise.resolve(),
      controller: new AbortController(),
    };
    pendingMoves.current.set(issueId, move);
    state.setMovingIssueIds((ids) => new Set(ids).add(issueId));
    move.completion = saveMoves(move, state, pendingMoves.current);
    return move.completion;
  };
}

async function saveMoves(
  move: PendingMove,
  state: Pick<
    WorkspaceState,
    "issues" | "setIssues" | "setMovingIssueIds" | "setError"
  >,
  pendingMoves: Map<string, PendingMove>,
) {
  const active = () =>
    pendingMoves.get(move.issueId) === move && !move.controller.signal.aborted;
  try {
    while (active()) {
      const target = move.targetSectionId;
      try {
        const issue = await persistMove(move, target);
        if (!active()) return;
        move.confirmedSectionId = issue.sectionId;
        if (move.targetSectionId !== target) continue;
        state.setIssues((items) =>
          items.map((item) =>
            item.id === move.issueId
              ? { ...item, sectionId: issue.sectionId }
              : item,
          ),
        );
        return;
      } catch {
        if (!active()) return;
        // A lost HTTP response can still mean the move committed. Read the saved
        // destination before deciding whether to restore the card.
        try {
          const { issue } = await api<{ issue: Issue }>(
            `/v1/issue/${move.issueId}`,
            {
              signal: AbortSignal.any([
                move.controller.signal,
                AbortSignal.timeout(10_000),
              ]),
            },
          );
          if (!active()) return;
          move.confirmedSectionId = issue.sectionId;
        } catch {
          if (!active()) return;
        }
        if (move.targetSectionId !== target) continue;
        state.setIssues((items) =>
          items.map((item) =>
            item.id === move.issueId
              ? { ...item, sectionId: move.confirmedSectionId }
              : item,
          ),
        );
        if (move.confirmedSectionId !== target)
          state.setError(
            "Could not save the move. Please check your connection and try again.",
          );
        return;
      }
    }
  } finally {
    if (pendingMoves.get(move.issueId) === move) {
      pendingMoves.delete(move.issueId);
      state.setMovingIssueIds((ids) => {
        const next = new Set(ids);
        next.delete(move.issueId);
        return next;
      });
    }
  }
}

async function persistMove(move: PendingMove, sectionId: string) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const { issue } = await api<{ issue: Issue }>(
        `/v1/issue/${move.issueId}/move`,
        {
          method: "PUT",
          body: JSON.stringify({ sectionId }),
          signal: AbortSignal.any([
            move.controller.signal,
            AbortSignal.timeout(15_000),
          ]),
        },
      );
      return issue;
    } catch (cause) {
      const transient =
        cause instanceof TypeError ||
        (cause instanceof ApiError && cause.status >= 500);
      if (move.controller.signal.aborted || attempt >= 1 || !transient)
        throw cause;
    }
  }
}
