"use client";

import { useEffect, useRef } from "react";
import { api } from "../lib/api";
import { openRealtimeSocket, parseRealtimeMessage } from "../lib/realtime";
import type { Issue, Section } from "../lib/types";
import type { WorkspaceState } from "./use-workspace-state";
import { handleBoardEvent, preservePendingMoves } from "../lib/board-events";
import { type PendingMove } from "./board-event-types";
import { createIssueMover } from "../lib/issue-mover";
import { messageOf } from "../lib/errors";

export function useBoardRealtime(state: WorkspaceState) {
  const selectedIssue = useRef<Issue | null>(state.selectedIssue);
  const pendingMoves = useRef(new Map<string, PendingMove>());
  useEffect(() => {
    selectedIssue.current = state.selectedIssue;
  }, [state.selectedIssue]);

  const {
    setLoadingBoard,
    setSections,
    setIssues,
    setActiveUsers,
    setIssueComments,
    setIssueAssignments,
    setSelectedIssueId,
    setBoards,
    setError,
  } = state;
  const { signedIn, boardId, setConnection } = state;

  useEffect(() => {
    if (!signedIn || !boardId) return;
    const moves = pendingMoves.current;
    let socket: WebSocket | undefined;
    const actions = {
      setLoadingBoard,
      setSections,
      setIssues,
      setActiveUsers,
      setIssueComments,
      setIssueAssignments,
      setSelectedIssueId,
      setBoards,
      setError,
    };
    let active = true;
    let reconnectTimer = 0;
    let attempts = 0;
    let receivedSnapshot = false;
    const controller = new AbortController();
    const reconnect = () => {
      if (!active) return;
      setConnection("connecting");
      attempts += 1;
      reconnectTimer = window.setTimeout(
        () => void connect(),
        Math.min(1000 * 2 ** Math.min(attempts, 4), 15000),
      );
    };
    const connect = async () => {
      if (!active) return;
      setConnection("connecting");
      let nextSocket: WebSocket;
      try {
        nextSocket = await openRealtimeSocket(
          `/boards/${boardId}`,
          controller.signal,
        );
      } catch {
        reconnect();
        return;
      }
      if (!active) {
        nextSocket.close();
        return;
      }
      socket = nextSocket;
      nextSocket.onopen = () => {
        attempts = 0;
        if (active) setConnection("live");
      };
      nextSocket.onmessage = (event) => {
        if (!active) return;
        const message = parseRealtimeMessage(String(event.data));
        if (!message) return;
        if (message.type === "board_snapshot") receivedSnapshot = true;
        handleBoardEvent(
          message,
          boardId,
          actions,
          selectedIssue,
          moves,
          controller.signal,
        );
      };
      nextSocket.onerror = () => {
        if (active) setConnection("connecting");
      };
      nextSocket.onclose = reconnect;
    };
    // Presence must not wait for the REST fallback to finish loading.
    void connect();
    void Promise.all([
      api<{ sections: Section[] }>(`/v1/sections?boardId=${boardId}`, {
        signal: controller.signal,
      }),
      api<{ issues: Issue[] }>(`/v1/issues?boardId=${boardId}`, {
        signal: controller.signal,
      }),
    ])
      .then(([sections, issues]) => {
        if (!active || receivedSnapshot) return;
        setSections(sections.sections ?? []);
        setIssues(preservePendingMoves(issues.issues ?? [], moves));
      })
      .catch((cause) => {
        if (active && !receivedSnapshot) setError(messageOf(cause));
      })
      .finally(() => {
        if (!active) return;
        setLoadingBoard(false);
      });
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(reconnectTimer);
      socket?.close();
      for (const move of moves.values()) move.controller.abort();
      moves.clear();
    };
  }, [
    signedIn,
    boardId,
    setActiveUsers,
    setIssueComments,
    setIssueAssignments,
    setSelectedIssueId,
    setBoards,
    setConnection,
    setSections,
    setIssues,
    setError,
    setLoadingBoard,
  ]);

  return {
    moveIssue: (issueId: string, targetSectionId: string) =>
      createIssueMover(state, pendingMoves)(issueId, targetSectionId),
  };
}
