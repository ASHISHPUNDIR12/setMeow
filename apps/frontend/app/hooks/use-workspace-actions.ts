"use client";

import { useRouter } from "next/navigation";
import { boardPath, workspacePath } from "../lib/routes";
import type { FormEvent } from "react";
import { api } from "../lib/api";
import type { Board, Organization, Section } from "../lib/types";
import type { DashboardState } from "./use-dashboard-state";
import { messageOf } from "./errors";

export function useWorkspaceActions(
  state: DashboardState,
  announce: (message: string) => void,
  refreshAccount: () => Promise<void>,
) {
  const router = useRouter();

  async function createOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    state.setError("");
    try {
      const { organization } = await api<{ organization: Organization }>(
        "/v1/organization",
        {
          method: "POST",
          body: JSON.stringify({
            name: state.newOrgName.trim(),
            description: state.newOrgDescription.trim(),
          }),
        },
      );
      state.setNewOrgName("");
      state.setNewOrgDescription("");
      state.setShowCreateOrg(false);
      await refreshAccount();
      router.push(workspacePath(organization.id));
      announce("Organization created");
    } catch (cause) {
      state.setError(messageOf(cause));
    }
  }

  async function createBoard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.organizationId) return;
    state.setError("");
    try {
      const { board } = await api<{ board: Board }>(
        `/v1/organization/${state.organizationId}/board`,
        {
          method: "POST",
          body: JSON.stringify({ title: state.newBoardTitle.trim() }),
        },
      );
      for (const title of ["Backlog", "In progress", "Done"]) {
        await api<{ section: Section }>("/v1/section", {
          method: "POST",
          body: JSON.stringify({ boardId: board.id, title }),
        });
      }
      state.setNewBoardTitle("");
      state.setShowCreateBoard(false);
      announce("Board created");
      router.push(boardPath(state.organizationId, board.id));
    } catch (cause) {
      state.setError(
        `${messageOf(cause)} If the board was created, refresh and add its sections before creating issues.`,
      );
    }
  }

  async function createSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.boardId) return;
    const form = event.currentTarget;
    const title = String(new FormData(form).get("title") ?? "").trim();
    if (!title) return;
    try {
      const { section } = await api<{ section: Section }>("/v1/section", {
        method: "POST",
        body: JSON.stringify({ boardId: state.boardId, title }),
      });
      state.setSections((current) => [...current, section]);
      form.reset();
      state.setAddingSection(false);
      announce("Section added");
    } catch (cause) {
      state.setError(messageOf(cause));
    }
  }

  return { createOrganization, createBoard, createSection };
}
