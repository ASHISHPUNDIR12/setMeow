"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import type { Person } from "../lib/types";

type AuthContextValue = {
  user: Person | null;
  signedIn: boolean;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  initialUser,
  children,
}: {
  initialUser: Person;
  children: ReactNode;
}) {
  // The protected server layout has already verified this user with /auth/me.
  const [user, setUser] = useState<Person | null>(initialUser);
  const router = useRouter();

  async function signOut() {
    // Keep the current account if the request fails. The caller displays errors.
    await api("/auth/signout", { method: "POST" });
    setUser(null);
    router.replace("/signin");
    router.refresh();
  }

  return (
    <AuthContext.Provider value={{ user, signedIn: user !== null, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("useAuth must be used inside AuthProvider.");
  return auth;
}
