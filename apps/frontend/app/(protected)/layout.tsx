import type { ReactNode } from "react";
import { AuthProvider } from "../components/auth-provider";
import { requireAccount } from "../lib/server-api";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const account = await requireAccount();

  return (
    <AuthProvider key={account.user.id} initialUser={account.user}>
      {children}
    </AuthProvider>
  );
}
