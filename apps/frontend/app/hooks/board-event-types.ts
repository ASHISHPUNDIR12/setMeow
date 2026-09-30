import type { MutableRefObject } from "react";
import type { DashboardState } from "./use-dashboard-state";
import type { Issue } from "../lib/types";

export type PendingMove = {
  issueId: string;
  previousSectionId: string;
  timer: number;
};
export type BoardEventActions = Pick<
  DashboardState,
  | "setLoadingBoard"
  | "setSections"
  | "setIssues"
  | "setActiveUsers"
  | "setIssueComments"
  | "setIssueAssignments"
  | "setSelectedIssue"
  | "setBoards"
  | "setError"
>;
export type SelectedIssueRef = MutableRefObject<Issue | null>;
