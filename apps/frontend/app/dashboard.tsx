"use client";

import { AuthScreen } from "./components/auth-screen";
import { WorkspaceScreen } from "./components/workspace-screen";
import { useDashboardController } from "./hooks/use-dashboard-controller";

export default function Dashboard() {
  const app = useDashboardController();
  const { state } = app;

  if (state.checking) return <LoadingScreen />;
  if (!state.signedIn)
    return (
      <AuthScreen
        mode={state.authMode}
        busy={state.authBusy}
        message={state.authMessage}
        email={state.email}
        password={state.password}
        username={state.username}
        theme={app.theme}
        onThemeToggle={() =>
          app.setTheme((theme) => (theme === "dark" ? "light" : "dark"))
        }
        onSubmit={app.submitAuth}
        onEmailChange={state.setEmail}
        onPasswordChange={state.setPassword}
        onUsernameChange={state.setUsername}
        onModeChange={() => {
          state.setAuthMode((mode) =>
            mode === "signin" ? "signup" : "signin",
          );
          state.setAuthMessage("");
        }}
      />
    );

  return <WorkspaceScreen app={app} />;
}

function LoadingScreen() {
  return (
    <main className="loading-screen">
      <div className="brand-mark">s</div>
      <p>Getting your space ready…</p>
    </main>
  );
}
