"use client";

import Link from "next/link";
import { AuthArtwork } from "./auth-artwork";
import { PawLogo } from "./paw-logo";

import { formStyles } from "../lib/ui-styles";

import type { FormEvent } from "react";
import { ThemeToggle } from "./ui";

type AuthScreenProps = {
  mode: "signin" | "signup";
  busy: boolean;
  message: string;
  email: string;
  password: string;
  username: string;
  theme: "light" | "dark";
  onThemeToggle: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onUsernameChange: (value: string) => void;
  alternateHref: string;
  oauthReturnTo: string;
  oauthMessage: string;
};

export function AuthScreen(props: AuthScreenProps) {
  const {
    mode,
    busy,
    message,
    email,
    password,
    username,
    theme,
    onThemeToggle,
    onSubmit,
    onEmailChange,
    onPasswordChange,
    onUsernameChange,
    alternateHref,
    oauthReturnTo,
    oauthMessage,
  } = props;
  return (
    <main className="relative grid min-h-svh grid-cols-[minmax(0,1fr)_minmax(360px,500px)] items-center gap-[clamp(28px,6vw,80px)] overflow-x-clip p-[clamp(20px,4vw,56px)] max-lg:grid-cols-[minmax(0,0.8fr)_minmax(350px,1fr)] max-lg:gap-8 max-lg:p-8 max-sm:flex max-sm:justify-center max-sm:p-4 short:py-4.5">
      <AuthArtwork />
      <section className="w-full max-w-[460px] p-[clamp(25px,3vw,38px)] max-sm:max-w-[440px] max-sm:px-5.5 max-sm:py-7 short:px-7.5 short:py-5.5 rounded-3xl border border-white/85 bg-surface shadow-clay dark:border-line dark:shadow-none">
        <div className="absolute top-5 right-6 max-sm:top-3 max-sm:right-3">
          <ThemeToggle theme={theme} onToggle={onThemeToggle} />
        </div>
        <div className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-[#514b38] dark:text-[#e4decd]">
          <PawLogo />
          <span>setmeow</span>
        </div>
        <p className="mt-6 mb-2 short:mt-4 text-[10px] font-extrabold tracking-[0.15em] text-[#9b895a] uppercase">
          A calmer way to get things done
        </p>
        <h1 className="text-[clamp(30px,4vw,39px)] font-semibold tracking-[-0.06em]">
          {mode === "signin" ? "Welcome back." : "Start your workspace."}
        </h1>
        <p className="mt-2.5 mb-6 text-[13px] text-muted short:mb-4">
          Bring your people and your projects together.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <a
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white/70 px-3 text-xs font-bold text-foreground transition hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
            href={`/api/auth/oauth/google?next=${encodeURIComponent(oauthReturnTo)}`}
          >
            <span aria-hidden="true" className="text-sm font-black">
              G
            </span>{" "}
            Google
          </a>
          <a
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-white/70 px-3 text-xs font-bold text-foreground transition hover:bg-white dark:bg-white/5 dark:hover:bg-white/10"
            href={`/api/auth/oauth/github?next=${encodeURIComponent(oauthReturnTo)}`}
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-4 w-4 fill-current"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.33c-2.23.49-2.7-.95-2.7-.95-.36-.92-.89-1.16-.89-1.16-.73-.5.06-.49.06-.49.8.06 1.22.82 1.22.82.71 1.21 1.87.86 2.33.66.07-.52.28-.86.51-1.06-1.78-.2-3.64-.89-3.64-3.96 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82A7.65 7.65 0 0 1 8 4.01c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.28.82 2.15 0 3.08-1.87 3.76-3.65 3.96.29.25.55.74.55 1.5v2.23c0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" />
            </svg>{" "}
            GitHub
          </a>
        </div>
        <div className="my-5 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-[#9a968a]">
          <span className="h-px flex-1 bg-line" />
          <span>or continue with email</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <form
          className="flex flex-col gap-4 mt-6 short:mt-4 short:gap-2.5"
          onSubmit={onSubmit}
        >
          {mode === "signup" && (
            <label className={formStyles.label}>
              Your name
              <input
                className={formStyles.input}
                autoComplete="name"
                required
                maxLength={80}
                value={username}
                onChange={(event) => onUsernameChange(event.target.value)}
                placeholder="Alex Morgan"
              />
            </label>
          )}
          <label className={formStyles.label}>
            Email address
            <input
              className={formStyles.input}
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="you@company.com"
            />
          </label>
          <label className={formStyles.label}>
            Password
            <input
              className={formStyles.input}
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              type="password"
              minLength={mode === "signup" ? 8 : undefined}
              required
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder={
                mode === "signup" ? "At least 8 characters" : "Your password"
              }
            />
          </label>
          {(message || oauthMessage) && (
            <p
              className="text-xs text-[#a74636] dark:text-[#efb3a0]"
              role="alert"
            >
              {message || oauthMessage}
            </p>
          )}
          <button
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl border-0 px-4 text-xs font-bold transition duration-150 enabled:hover:-translate-y-px motion-reduce:transform-none motion-reduce:transition-none bg-linear-to-br from-[#f4d65f] to-[#eec443] text-[#423a21] shadow-sm hover:from-[#f6d95f] hover:to-[#f6d95f] w-full min-h-12 justify-between"
            disabled={busy}
          >
            {busy
              ? "One moment…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
            <span className="text-[15px]">↗</span>
          </button>
        </form>
        <p className="mt-5 text-center text-xs text-[#827d70]">
          {mode === "signin" ? "New around here?" : "Already have an account?"}{" "}
          <Link
            className="cursor-pointer border-0 bg-transparent font-extrabold text-[#8b6c16] dark:text-[#f0d16f]"
            href={alternateHref}
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </Link>
        </p>
        <p className="mt-4 text-center short:mt-3 text-[11px] leading-relaxed text-[#9a968a]">
          By continuing, you agree to keep work thoughtful and kind.
        </p>
      </section>
    </main>
  );
}
