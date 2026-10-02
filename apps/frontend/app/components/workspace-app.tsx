"use client";

import { WorkspaceScreen } from "./workspace-screen";
import { useWorkspaceController } from "../hooks/use-workspace-controller";
import type { WorkspaceInitialState } from "../hooks/use-workspace-state";

export default function WorkspaceApp({
  initial,
  view = "board",
}: {
  initial: WorkspaceInitialState;
  view?: "board" | "invitations";
}) {
  const app = useWorkspaceController(initial);
  return <WorkspaceScreen app={app} view={view} />;
}
