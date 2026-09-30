"use client";

import { WorkspaceScreen } from "./components/workspace-screen";
import { useDashboardController } from "./hooks/use-dashboard-controller";
import type { WorkspaceInitialState } from "./hooks/use-dashboard-state";

export default function Dashboard({ initial, view = "board" }: {
  initial: WorkspaceInitialState;
  view?: "board" | "invitations";
}) {
  const app = useDashboardController(initial);
  return <WorkspaceScreen app={app} view={view} />;
}
