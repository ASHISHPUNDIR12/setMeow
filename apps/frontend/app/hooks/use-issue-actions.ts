"use client";

import type { FormEvent } from "react";
import { api } from "../lib/api";
import type { Issue } from "../lib/types";
import type { DashboardState } from "./use-dashboard-state";
import { messageOf } from "./errors";

export function useIssueActions(
  state: DashboardState,
  announce: (message: string) => void,
) {
  async function createIssue(
    event: FormEvent<HTMLFormElement>,
    sectionId: string,
  ) {
    event.preventDefault();
    if (!state.boardId) return;
    const form = event.currentTarget;
    const title = String(new FormData(form).get("title") ?? "").trim();
    if (!title) return;
    try {
      const { issue } = await api<{ issue: Issue }>("/v1/issue", {
        method: "POST",
        body: JSON.stringify({
          boardId: state.boardId,
          sectionId,
          title,
          description: "",
        }),
      });
      state.setIssues((current) => [...current, issue]);
      form.reset();
    } catch (cause) {
      state.setError(messageOf(cause));
    }
  }

  async function deleteIssue(issue: Issue) {
    if (
      !window.confirm(
        `Delete “${issue.title}”? This also deletes its comments and assignees.`,
      )
    )
      return;
    try {
      await api(`/v1/issue/${issue.id}`, { method: "DELETE" });
      state.setIssues((current) =>
        current.filter((item) => item.id !== issue.id),
      );
      state.setSelectedIssue(null);
      announce("Issue deleted");
    } catch (cause) {
      state.setError(messageOf(cause));
    }
  }

  async function saveIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!state.selectedIssue) return;
    try {
      const { issue } = await api<{ issue: Issue }>(
        `/v1/issue/${state.selectedIssue.id}`,
        {
          method: "PUT",
          body: JSON.stringify({
            title: state.editTitle.trim(),
            description: state.editDescription.trim(),
          }),
        },
      );
      state.setIssues((current) =>
        current.map((item) => (item.id === issue.id ? issue : item)),
      );
      state.setSelectedIssue(issue);
      announce("Issue updated");
    } catch (cause) {
      state.setError(messageOf(cause));
    }
  }

  return { createIssue, deleteIssue, saveIssue };
}
