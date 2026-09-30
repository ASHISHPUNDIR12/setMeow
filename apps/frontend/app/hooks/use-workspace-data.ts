"use client";

import { useEffect } from "react";
import { api } from "../lib/api";
import type { Board } from "../lib/types";
import type { DashboardState } from "./use-dashboard-state";
import { messageOf } from "./errors";

export function useWorkspaceData(state: DashboardState) {
  const {
    signedIn,
    organizationId,
    setBoards,
    setLoadingBoard,
    setConnection,
    setBoardId,
    setError,
  } = state;
  useEffect(() => {
    if (!signedIn || !organizationId) return;
    let active = true;
    void api<{ allBoards: Board[] }>(
      `/v1/organization/${organizationId}/boards`,
    )
      .then(({ allBoards }) => {
        if (!active) return;
        const boards = allBoards ?? [];
        setBoards(boards);
        setLoadingBoard(Boolean(boards[0]));
        setConnection(boards[0] ? "connecting" : "offline");
        setBoardId(boards[0]?.id ?? "");
      })
      .catch((cause) => {
        if (active) setError(messageOf(cause));
      });
    return () => {
      active = false;
    };
  }, [
    signedIn,
    organizationId,
    setBoards,
    setLoadingBoard,
    setConnection,
    setBoardId,
    setError,
  ]);
}
