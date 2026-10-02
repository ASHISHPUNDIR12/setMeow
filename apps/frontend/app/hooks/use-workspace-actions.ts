"use client";

import { useRouter } from "next/navigation";
import { boardPath, workspacePath } from "../lib/routes";
import { api } from "../lib/api";
import type { Board, Organization, Section } from "../lib/types";
import type { WorkspaceState } from "./use-workspace-state";
import { messageOf } from "../lib/errors";
import { usePendingActions } from "./use-pending-actions";

export function useWorkspaceActions(
  state: WorkspaceState,
  announce: (message: string) => void,
  refreshAccount: () => Promise<void>,
) {
  const router = useRouter();
  const { pending, run } = usePendingActions();

  async function createOrganization(values: {
    name: string;
    description: string;
  }) {
    state.setError("");
    try {
      const { organization } = await api<{ organization: Organization }>(
        "/v1/organization",
        {
          method: "POST",
          body: JSON.stringify({
            name: values.name.trim(),
            description: values.description.trim(),
          }),
        },
      );
      state.setShowCreateOrg(false);
      await refreshAccount();
      router.push(workspacePath(organization.id));
      announce("Organization created");
      return true;
    } catch (cause) {
      state.setError(messageOf(cause));
      return false;
    }
  }

  async function createBoard(title: string) {
    if (!state.organizationId) return false;
    state.setError("");
    try {
      const { board } = await api<{ board: Board }>(
        `/v1/organization/${state.organizationId}/board`,
        {
          method: "POST",
          body: JSON.stringify({ title: title.trim() }),
        },
      );
      for (const title of ["Backlog", "In progress", "Done"]) {
        await api<{ section: Section }>("/v1/section", {
          method: "POST",
          body: JSON.stringify({ boardId: board.id, title }),
        });
      }
      state.setShowCreateBoard(false);
      announce("Board created");
      router.push(boardPath(state.organizationId, board.id));
      return true;
    } catch (cause) {
      state.setError(
        `${messageOf(cause)} If the board was created, refresh and add its sections before creating issues.`,
      );
      return false;
    }
  }

  async function createSection(title: string) {
    if (!state.boardId || !title.trim()) return false;
    try {
      const { section } = await api<{ section: Section }>("/v1/section", {
        method: "POST",
        body: JSON.stringify({ boardId: state.boardId, title: title.trim() }),
      });
      state.setSections((current) =>
        current.some((item) => item.id === section.id)
          ? current
          : [...current, section],
      );
      state.setAddingSection(false);
      announce("Section added");
      return true;
    } catch (cause) {
      state.setError(messageOf(cause));
      return false;
    }
  }

  return {
    creatingOrganization: pending.has("organization"),
    creatingBoard: pending.has("board"),
    creatingSection: pending.has("section"),
    createOrganization: (values: { name: string; description: string }) =>
      run("organization", () => createOrganization(values)),
    createBoard: (title: string) => run("board", () => createBoard(title)),
    createSection: (title: string) =>
      run("section", () => createSection(title)),
  };
}
