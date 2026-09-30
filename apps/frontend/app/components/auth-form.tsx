"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AuthScreen } from "./auth-screen";
import { api } from "../lib/api";
import { useThemePreference } from "../hooks/use-theme-preference";
import { messageOf } from "../hooks/errors";

export function AuthForm({
  mode,
  returnTo,
  oauthError,
}: {
  mode: "signin" | "signup";
  returnTo: string;
  oauthError?: string;
}) {
  const router = useRouter();
  const { theme, setTheme } = useThemePreference();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const oauthMessage =
    oauthError === "cancelled"
      ? "Sign-in was cancelled."
      : oauthError === "invalid_state"
        ? "Your sign-in session expired. Please try again."
        : oauthError
          ? "We couldn’t sign you in. Please try again."
          : "";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await api(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          password,
          ...(mode === "signup" ? { username: username.trim() } : {}),
        }),
      });
      setPassword("");
      router.replace(returnTo);
      router.refresh();
    } catch (cause) {
      setMessage(messageOf(cause));
      setBusy(false);
    }
  }

  return (
    <AuthScreen
      mode={mode}
      busy={busy}
      message={message}
      email={email}
      password={password}
      username={username}
      theme={theme}
      onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
      onSubmit={submit}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onUsernameChange={setUsername}
      alternateHref={`/${mode === "signin" ? "signup" : "signin"}?next=${encodeURIComponent(returnTo)}`}
      oauthReturnTo={returnTo}
      oauthMessage={oauthMessage}
    />
  );
}
