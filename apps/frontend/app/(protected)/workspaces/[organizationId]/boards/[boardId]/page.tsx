import { notFound } from "next/navigation";
import WorkspaceApp from "../../../../../components/workspace-app";
import { getWorkspace } from "../../../../../lib/server-api";
import { boardPath } from "../../../../../lib/routes";

export default async function Page({
  params,
}: {
  params: Promise<{ organizationId: string; boardId: string }>;
}) {
  const { organizationId, boardId } = await params;
  const workspace = await getWorkspace(
    organizationId,
    boardPath(organizationId, boardId),
  );
  if (!workspace.boards.some((board) => board.id === boardId)) notFound();
  return (
    <WorkspaceApp
      key={`${organizationId}/${boardId}`}
      initial={{
        memberships: workspace.memberships,
        organizationId,
        boards: workspace.boards,
        boardId,
      }}
    />
  );
}
