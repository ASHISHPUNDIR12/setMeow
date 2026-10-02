import WorkspaceApp from "../../components/workspace-app";
import { getWorkspace, requireAccount } from "../../lib/server-api";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ organizationId?: string | string[] }>;
}) {
  const account = await requireAccount("/invitations");
  const { organizationId: requestedOrganizationId } = await searchParams;
  const membership =
    account.memberships.find(
      (item) => item.organization.id === requestedOrganizationId,
    ) ?? account.memberships[0];
  const workspace = membership
    ? await getWorkspace(membership.organization.id, "/invitations")
    : { ...account, organizationId: "", boards: [] };
  return (
    <WorkspaceApp
      key={workspace.organizationId}
      initial={{
        memberships: workspace.memberships,
        organizationId: workspace.organizationId,
        boards: workspace.boards,
        boardId: "",
      }}
      view="invitations"
    />
  );
}
