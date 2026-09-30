"use client";

import { useCallback, useEffect } from "react";
import { api, WS } from "../lib/api";
import type {
  OrganizationMembership,
  Invitation,
  SocketMessage,
} from "../lib/types";
import type { DashboardState } from "./use-dashboard-state";
import { messageOf } from "./errors";

export function useAccountSync(state: DashboardState) {
  const {
    setMemberships,
    setInvitations,
    setOrganizationId,
    setSignedIn,
    setChecking,
    setError,
    setAuthMessage,
  } = state;
  const refreshAccount = useCallback(async () => {
    const [organizations, inbox] = await Promise.all([
      api<{ allOrganization: OrganizationMembership[] }>("/v1/organizations"),
      api<{ invitations: Invitation[] }>("/v1/invites"),
    ]);
    const memberships = organizations.allOrganization ?? [];
    setMemberships(memberships);
    setInvitations(inbox.invitations ?? []);
    setOrganizationId((current) =>
      memberships.some((item) => item.organization.id === current)
        ? current
        : (memberships[0]?.organization.id ?? ""),
    );
    setSignedIn(true);
  }, [setMemberships, setInvitations, setOrganizationId, setSignedIn]);

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(refreshAccount)
      .catch((cause) => {
        if (!active) return;
        if (cause instanceof Error && /401|unauthorized/i.test(cause.message))
          setSignedIn(false);
        else if (cause instanceof Error && cause.message.includes("(401)"))
          setSignedIn(false);
        else {
          const message = messageOf(cause);
          setError(message);
          setAuthMessage(message);
        }
      })
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [refreshAccount, setSignedIn, setError, setAuthMessage, setChecking]);

  useEffect(() => {
    if (!state.signedIn) return;
    let active = true;
    let socket: WebSocket | undefined;
    let timer = 0;
    let attempts = 0;
    const connect = () => {
      if (!active) return;
      socket = new WebSocket(`${WS.replace(/\/$/, "")}/users/me`);
      socket.onopen = () => {
        attempts = 0;
        void refreshAccount().catch((cause) => setError(messageOf(cause)));
      };
      socket.onmessage = (event) => {
        let message: SocketMessage;
        try {
          message = JSON.parse(String(event.data));
        } catch {
          return;
        }
        if (message.type === "invitation_changed")
          void refreshAccount().catch((cause) => setError(messageOf(cause)));
      };
      socket.onclose = () => {
        if (!active) return;
        attempts += 1;
        timer = window.setTimeout(
          connect,
          Math.min(1000 * 2 ** Math.min(attempts, 4), 15000),
        );
      };
    };
    connect();
    return () => {
      active = false;
      window.clearTimeout(timer);
      socket?.close();
    };
  }, [state.signedIn, refreshAccount, setError]);

  return refreshAccount;
}
