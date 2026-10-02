import type { Metadata } from "next";
import { AuthForm } from "../../components/auth-form";
import { safeReturnTo } from "../../lib/routes";

export const metadata: Metadata = { title: "Create an account — Setmeow" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const returnTo = safeReturnTo((await searchParams).next);
  return <AuthForm mode="signup" returnTo={returnTo} />;
}
