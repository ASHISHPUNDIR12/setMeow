"use client";

import { useEffect, useMemo, useRef } from "react";
import { api } from "../lib/api";
import { openRealtimeSocket } from "../lib/realtime";
import type { Issue, Section, SocketMessage } from "../lib/types";
import type { DashboardState } from "./use-dashboard-state";
import { handleBoardEvent } from "./board-event-handler";
import { type PendingMove } from "./board-event-types";
import { useIssueMover } from "./use-issue-mover";
import { messageOf } from "./errors";

export function useBoardRealtime(state: DashboardState) {
  const socket = useRef<WebSocket | null>(null);
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
    setSelectedIssue,
    setBoards,
    setError,
  } = state;
  const actions = useMemo(
    () => ({
      setLoadingBoard,
      setSections,
      setIssues,
      setActiveUsers,
      setIssueComments,
      setIssueAssignments,
      setSelectedIssue,
      setBoards,
      setError,
    }),
    [
      setLoadingBoard,
      setSections,
      setIssues,
      setActiveUsers,
      setIssueComments,
      setIssueAssignments,
      setSelectedIssue,
      setBoards,
      setError,
    ],
  );
  const { signedIn, boardId, setConnection } = state;

  useEffect(() => {
    if (!signedIn || !boardId) return;
    const moves = pendingMoves.current;
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
      socket.current = nextSocket;
      nextSocket.onopen = () => {
        attempts = 0;
        if (active) setConnection("live");
      };
      nextSocket.onmessage = (event) => {
        let message: SocketMessage;
        try {
          message = JSON.parse(String(event.data));
        } catch {
          return;
        }
        if (message.type === "board_snapshot") receivedSnapshot = true;
        handleBoardEvent(message, boardId, actions, selectedIssue, moves);
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
        setIssues(issues.issues ?? []);
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
      socket.current?.close();
      socket.current = null;
      for (const move of moves.values()) window.clearTimeout(move.timer);
      moves.clear();
    };
  }, [
    signedIn,
    boardId,
    actions,
    setConnection,
    setSections,
    setIssues,
    setError,
    setLoadingBoard,
  ]);

  return { moveIssue: useIssueMover(state, socket, pendingMoves) };
}
