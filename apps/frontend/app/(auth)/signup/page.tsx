import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "../../components/auth-form";
import { getAccount } from "../../lib/server-api";
import { safeReturnTo } from "../../lib/routes";

export const metadata: Metadata = { title: "Create an account — Setmeow" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const returnTo = safeReturnTo((await searchParams).next);
  if (await getAccount()) redirect(returnTo);
  return <AuthForm mode="signup" returnTo={returnTo} />;
}
