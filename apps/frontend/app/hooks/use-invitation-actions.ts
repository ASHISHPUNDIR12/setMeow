"use client";

import { api } from "../lib/api";
import type { WorkspaceState } from "./use-workspace-state";
import { messageOf } from "../lib/errors";
import { usePendingActions } from "./use-pending-actions";

export function useInvitationActions(
  state: WorkspaceState,
  refreshAccount: () => Promise<void>,
  announce: (message: string) => void,
  chooseOrganization: (id: string) => void,
) {
  const { pending, run } = usePendingActions();
  async function sendInvite(email: string) {
    try {
      await api("/v1/invite", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          orgId: state.organizationId,
        }),
      });
      state.setShowInvite(false);
      announce("Invitation sent");
      return true;
    } catch (cause) {
      state.setError(messageOf(cause));
      return false;
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

  return {
    sendingInvite: pending.has("send"),
    answeringInvites: pending,
    sendInvite: (email: string) => run("send", () => sendInvite(email)),
    answerInvite: (id: string, answer: "accept" | "decline") =>
      run(id, () => answerInvite(id, answer), answer),
  };
}
