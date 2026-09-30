import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "../../components/auth-form";
import { getAccount } from "../../lib/server-api";
import { safeReturnTo } from "../../lib/routes";

export const metadata: Metadata = { title: "Sign in — Setmeow" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    next?: string | string[];
    oauthError?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnTo(params.next);
  if (await getAccount()) redirect(returnTo);
  return (
    <AuthForm
      mode="signin"
      returnTo={returnTo}
      oauthError={
        typeof params.oauthError === "string" ? params.oauthError : undefined
      }
    />
  );
}
