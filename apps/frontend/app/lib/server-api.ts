import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import type { Board, OrganizationMembership, Person } from "./types";
import { safeReturnTo } from "./routes";

const backendUrl = (
  process.env.API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001"
).replace(/\/$/, "");

export async function serverApi(path: string) {
  const token = (await cookies()).get("accessToken");
  return fetch(`${backendUrl}${path}`, {
    headers: token
      ? { Cookie: `accessToken=${encodeURIComponent(token.value)}` }
      : {},
    cache: "no-store",
  });
}

// The backend verifies the JWT. Cookie presence alone never grants access.
export const getAccount = cache(async () => {
  if (!(await cookies()).has("accessToken")) return null;
  const [userResponse, organizationsResponse] = await Promise.all([
    serverApi("/auth/me"),
    serverApi("/v1/organizations"),
  ]);
  if (userResponse.status === 401 || organizationsResponse.status === 401)
    return null;
  if (!userResponse.ok || !organizationsResponse.ok) {
    throw new Error("Unable to load your account. Please try again.");
  }
  const [{ user }, { allOrganization }] = await Promise.all([
    userResponse.json() as Promise<{ user: Person }>,
    organizationsResponse.json() as Promise<{
      allOrganization: OrganizationMembership[];
    }>,
  ]);
  return { user, memberships: allOrganization ?? [] };
});

export async function requireAccount(returnTo = "/dashboard") {
  // Layouts persist on navigation. Private data reads also verify the session;
  // getAccount's request-scoped cache shares the lookup with the layout.
  const account = await getAccount();
  if (!account) {
    const requestUrl = (await headers()).get("x-auth-request-url");
    redirect(
      `/signin?next=${encodeURIComponent(safeReturnTo(requestUrl ?? returnTo))}`,
    );
  }
  return account;
}

export async function getWorkspace(organizationId: string, returnTo: string) {
  const account = await requireAccount(returnTo);
  if (
    !account.memberships.some((item) => item.organization.id === organizationId)
  )
    notFound();
  const response = await serverApi(
    `/v1/organization/${encodeURIComponent(organizationId)}/boards`,
  );
  if (response.status === 401)
    redirect(`/signin?next=${encodeURIComponent(returnTo)}`);
  if (response.status === 403 || response.status === 404) notFound();
  if (!response.ok)
    throw new Error("Unable to load this workspace. Please try again.");
  const data = (await response.json()) as { allBoards: Board[] };
  return { ...account, organizationId, boards: data.allBoards ?? [] };
}
