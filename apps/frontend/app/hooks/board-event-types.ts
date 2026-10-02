import type { MutableRefObject } from "react";
import type { WorkspaceState } from "./use-workspace-state";
import type { Issue } from "../lib/types";

export type PendingMove = {
  issueId: string;
  targetSectionId: string;
  confirmedSectionId: string;
  completion: Promise<void>;
  controller: AbortController;
};
export type BoardEventActions = Pick<
  WorkspaceState,
  | "setLoadingBoard"
  | "setSections"
  | "setIssues"
  | "setActiveUsers"
  | "setIssueComments"
  | "setIssueAssignments"
  | "setSelectedIssueId"
  | "setBoards"
  | "setError"
>;
export type SelectedIssueRef = MutableRefObject<Issue | null>;
