"use client";

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
      state.setOrganizationId(organization.id);
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
      const sections: Section[] = [];
      for (const title of ["Backlog", "In progress", "Done"]) {
        const result = await api<{ section: Section }>("/v1/section", {
          method: "POST",
          body: JSON.stringify({ boardId: board.id, title }),
        });
        sections.push(result.section);
      }
      state.setBoards((current) => [...current, board]);
      state.setLoadingBoard(true);
      state.setConnection("connecting");
      state.setBoardId(board.id);
      state.setSections(sections);
      state.setNewBoardTitle("");
      state.setShowCreateBoard(false);
      announce("Board created");
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
