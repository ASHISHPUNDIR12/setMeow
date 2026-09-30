"use client";

import { useCallback, useEffect } from "react";
import { api } from "../lib/api";
import { openRealtimeSocket } from "../lib/realtime";
import type {
  OrganizationMembership,
  Invitation,
  SocketMessage,
} from "../lib/types";
import type { DashboardState } from "./use-dashboard-state";
import { messageOf } from "./errors";

export function useAccountSync(state: DashboardState) {
  const { setMemberships, setInvitations, setSignedIn, setError } = state;
  const refreshAccount = useCallback(async () => {
    const [organizations, inbox] = await Promise.all([
      api<{ allOrganization: OrganizationMembership[] }>("/v1/organizations"),
      api<{ invitations: Invitation[] }>("/v1/invites"),
    ]);
    const memberships = organizations.allOrganization ?? [];
    setMemberships(memberships);
    setInvitations(inbox.invitations ?? []);
    setSignedIn(true);
  }, [setMemberships, setInvitations, setSignedIn]);

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(refreshAccount)
      .catch((cause) => {
        if (!active) return;
        setError(messageOf(cause));
      });
    return () => {
      active = false;
    };
  }, [refreshAccount, setSignedIn, setError]);

  useEffect(() => {
    if (!state.signedIn) return;
    let active = true;
    let socket: WebSocket | undefined;
    let timer = 0;
    let attempts = 0;
    const controller = new AbortController();
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
        void refreshAccount().catch((cause) => {
          if (active) setError(messageOf(cause));
        });
      };
      socket.onmessage = (event) => {
        let message: SocketMessage;
        try {
          message = JSON.parse(String(event.data));
        } catch {
          return;
        }
        if (message.type === "invitation_changed")
          void refreshAccount().catch((cause) => {
            if (active) setError(messageOf(cause));
          });
      };
      socket.onclose = reconnect;
    };
    void connect();
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
      socket?.close();
    };
  }, [state.signedIn, refreshAccount, setError]);

  return refreshAccount;
}
