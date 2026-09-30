import Dashboard from "../../dashboard";
import { requireAccount } from "../../lib/server-api";

export default async function Page() {
  const account = await requireAccount("/invitations");
  return <Dashboard initial={{ ...account, organizationId: "", boards: [], boardId: "" }} view="invitations" />;
}
