"use client";

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
  onModeChange: () => void;
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
    onModeChange,
  } = props;
  return (
    <main className="auth-shell">
      <div className="auth-art" aria-hidden="true">
        <div className="art-orbit orbit-one" />
        <div className="art-orbit orbit-two" />
        <div className="art-sticky">
          <span>today</span>
          <strong>
            Make room
            <br />
            for good work.
          </strong>
          <i>✳</i>
        </div>
        <div className="art-dot dot-one" />
        <div className="art-dot dot-two" />
        <div className="art-dot dot-three" />
      </div>
      <section className="auth-card clay-panel">
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />
        <div className="brand-lockup">
          <div className="brand-mark">s</div>
          <span>setmeow</span>
        </div>
        <p className="eyebrow">A calmer way to get things done</p>
        <h1>{mode === "signin" ? "Welcome back." : "Start your workspace."}</h1>
        <p className="muted">Bring your people and your projects together.</p>
        <form className="stack auth-form" onSubmit={onSubmit}>
          {mode === "signup" && (
            <label>
              Your name
              <input
                autoComplete="name"
                required
                maxLength={80}
                value={username}
                onChange={(event) => onUsernameChange(event.target.value)}
                placeholder="Alex Morgan"
              />
            </label>
          )}
          <label>
            Email address
            <input
              autoComplete="email"
              type="email"
              required
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="you@company.com"
            />
          </label>
          <label>
            Password
            <input
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
          {message && (
            <p className="form-error" role="alert">
              {message}
            </p>
          )}
          <button className="button button-primary full-width" disabled={busy}>
            {busy
              ? "One moment…"
              : mode === "signin"
                ? "Sign in"
                : "Create account"}
            <span>↗</span>
          </button>
        </form>
        <p className="auth-switch">
          {mode === "signin" ? "New around here?" : "Already have an account?"}{" "}
          <button onClick={onModeChange}>
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </p>
        <p className="fine-print">
          By continuing, you agree to keep work thoughtful and kind.
        </p>
      </section>
    </main>
  );
}
