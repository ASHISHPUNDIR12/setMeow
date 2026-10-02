"use client";

import { useCallback, useEffect, useRef } from "react";
import { api } from "../lib/api";
import { openRealtimeSocket, parseRealtimeMessage } from "../lib/realtime";
import type { OrganizationMembership, Invitation } from "../lib/types";
import type { WorkspaceState } from "./use-workspace-state";
import { messageOf } from "../lib/errors";

export function useAccountSync(state: WorkspaceState) {
  const { signedIn, setMemberships, setInvitations, setError } = state;
  const lifecycle = useRef<AbortController | null>(null);
  const latestRefresh = useRef(0);
  const refreshAccount = useCallback(async () => {
    const signal = lifecycle.current?.signal;
    if (!signal || signal.aborted) return;
    const refreshId = ++latestRefresh.current;
    const [organizations, inbox] = await Promise.all([
      api<{ allOrganization: OrganizationMembership[] }>("/v1/organizations", {
        signal,
      }),
      api<{ invitations: Invitation[] }>("/v1/invites", { signal }),
    ]);
    // Ignore responses from an earlier refresh or a workspace that unmounted.
    if (signal.aborted || refreshId !== latestRefresh.current) return;
    const memberships = organizations.allOrganization ?? [];
    setMemberships(memberships);
    setInvitations(inbox.invitations ?? []);
  }, [setMemberships, setInvitations]);

  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    let socket: WebSocket | undefined;
    let timer = 0;
    let attempts = 0;
    const controller = new AbortController();
    lifecycle.current = controller;
    const refresh = () => {
      void refreshAccount().catch((cause) => {
        if (active) setError(messageOf(cause));
      });
    };
    const reconnect = () => {
      if (!active) return;
      attempts += 1;
      timer = window.setTimeout(
        () => void connect(),
        Math.min(1000 * 2 ** Math.min(attempts, 4), 15000),
      );
    };
    const connect = async () => {
      if (!active) return;
      try {
        socket = await openRealtimeSocket("/users/me", controller.signal);
      } catch {
        reconnect();
        return;
      }
      if (!active) {
        socket.close();
        return;
      }
      socket.onopen = () => {
        attempts = 0;
        refresh();
      };
      socket.onmessage = (event) => {
        if (!active) return;
        const message = parseRealtimeMessage(String(event.data));
        if (!message) return;
        if (message.type === "invitation_changed") refresh();
      };
      socket.onclose = reconnect;
    };
    // Defer startup so Strict Mode can discard its first effect without requests.
    void Promise.resolve().then(() => {
      if (!active) return;
      refresh();
      void connect();
    });
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
      socket?.close();
    };
  }, [signedIn, refreshAccount, setError]);

  return refreshAccount;
}
