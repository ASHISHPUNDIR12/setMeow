import { redirect } from "next/navigation";
import WorkspaceApp from "../../../components/workspace-app";
import { getWorkspace } from "../../../lib/server-api";
import { boardPath, workspacePath } from "../../../lib/routes";

export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = await params;
  const workspace = await getWorkspace(
    organizationId,
    workspacePath(organizationId),
  );
  if (workspace.boards[0])
    redirect(boardPath(organizationId, workspace.boards[0].id));
  return (
    <WorkspaceApp
      key={organizationId}
      initial={{
        memberships: workspace.memberships,
        organizationId,
        boards: workspace.boards,
        boardId: "",
      }}
    />
  );
}
