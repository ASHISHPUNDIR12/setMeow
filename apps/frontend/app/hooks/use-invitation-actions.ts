"use client";

import type { FormEvent } from "react";
import { api } from "../lib/api";
import type { DashboardState } from "./use-dashboard-state";
import { messageOf } from "./errors";

export function useInvitationActions(
  state: DashboardState,
  refreshAccount: () => Promise<void>,
  announce: (message: string) => void,
  chooseOrganization: (id: string) => void,
) {
  async function sendInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await api("/v1/invite", {
        method: "POST",
        body: JSON.stringify({
          email: state.inviteEmail.trim(),
          orgId: state.organizationId,
        }),
      });
      state.setInviteEmail("");
      state.setShowInvite(false);
      announce("Invitation sent");
    } catch (cause) {
      state.setError(messageOf(cause));
    }
  }

  async function answerInvite(id: string, answer: "accept" | "decline") {
    try {
      const result = await api<{ membership?: { organizationId: string } }>(
        `/v1/invite/${id}/${answer}`,
        { method: "POST" },
      );
      await refreshAccount();
      if (answer === "accept" && result.membership?.organizationId)
        chooseOrganization(result.membership.organizationId);
      announce(
        answer === "accept" ? "Invitation accepted" : "Invitation declined",
      );
    } catch (cause) {
      state.setError(messageOf(cause));
    }
  }

  return { sendInvite, answerInvite };
}
