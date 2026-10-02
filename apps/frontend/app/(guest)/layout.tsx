import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { safeReturnTo } from "../lib/routes";
import { getAccount } from "../lib/server-api";

export default async function GuestLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (await getAccount()) {
    const requestUrl = (await headers()).get("x-auth-request-url") ?? "/signin";
    const destinations = new URL(
      requestUrl,
      "http://localhost",
    ).searchParams.getAll("next");
    redirect(
      safeReturnTo(destinations.length === 1 ? destinations[0] : undefined),
    );
  }

  return children;
}
