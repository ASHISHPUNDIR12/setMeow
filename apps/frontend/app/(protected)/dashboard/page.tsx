import { redirect } from "next/navigation";
import WorkspaceApp from "../../components/workspace-app";
import { requireAccount } from "../../lib/server-api";
import { workspacePath } from "../../lib/routes";

export default async function Page() {
  const account = await requireAccount();
  const first = account.memberships[0];
  if (first) redirect(workspacePath(first.organization.id));
  return (
    <WorkspaceApp
      initial={{
        memberships: account.memberships,
        organizationId: "",
        boards: [],
        boardId: "",
      }}
    />
  );
}
