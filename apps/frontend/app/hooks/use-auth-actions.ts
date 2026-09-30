"use client";

import type { FormEvent } from "react";
import { api } from "../lib/api";
import type { DashboardState } from "./use-dashboard-state";
import { messageOf } from "./errors";

export function useAuthActions(
  state: DashboardState,
  refreshAccount: () => Promise<void>,
) {
  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    state.setAuthBusy(true);
    state.setAuthMessage("");
    state.setError("");
    try {
      if (state.authMode === "signup")
        await api("/auth/signup", {
          method: "POST",
          body: JSON.stringify({
            username: state.username.trim(),
            email: state.email.trim(),
            password: state.password,
          }),
        });
      await api("/auth/signin", {
        method: "POST",
        body: JSON.stringify({
          email: state.email.trim(),
          password: state.password,
        }),
      });
      state.setPassword("");
      await refreshAccount();
    } catch (cause) {
      state.setAuthMessage(messageOf(cause));
    } finally {
      state.setAuthBusy(false);
      state.setChecking(false);
    }
  }

  async function signOut() {
    try {
      await api("/auth/signout", { method: "POST" });
    } catch {
      state.setError(
        "The backend does not provide a sign-out endpoint yet. Your session cookie is still active.",
      );
      return;
    }
    state.setSignedIn(false);
    state.setMemberships([]);
    state.setOrganizationId("");
  }

  return { submitAuth, signOut };
}
