"use client";

import type { Person } from "../lib/types";
import { Avatar, ThemeToggle } from "./ui";

type Props = {
  organizationName: string;
  boardTitle: string;
  connection: "offline" | "connecting" | "live";
  activeUsers: Person[];
  isAdmin: boolean;
  theme: "light" | "dark";
  error: string;
  notice: string;
  onThemeToggle: () => void;
  onInvite: () => void;
  onNewIssue: () => void;
  onDismissMessage: () => void;
};

export function BoardHeader(props: Props) {
  const {
    organizationName,
    boardTitle,
    connection,
    activeUsers,
    isAdmin,
    theme,
    error,
    notice,
    onThemeToggle,
    onInvite,
    onNewIssue,
    onDismissMessage,
  } = props;
  return (
    <>
      <header className="topbar">
        <div className="breadcrumb">
          <span>{organizationName || "Workspace"}</span>
          <b>/</b>
          <strong>{boardTitle || "Board"}</strong>
        </div>
        <div className="topbar-right">
          <ThemeToggle theme={theme} onToggle={onThemeToggle} />
          <span className={`live-status ${connection}`}>
            <i />
            {connection === "live"
              ? "Live"
              : connection === "connecting"
                ? "Connecting"
                : "Offline"}
          </span>
          <div
            className="presence-stack"
            aria-label={`${activeUsers.length} members active on this board`}
          >
            {activeUsers.slice(0, 4).map((person) => (
              <Avatar key={person.id} name={person.username} small />
            ))}
            {activeUsers.length > 4 && (
              <span className="avatar avatar-small avatar-more">
                +{activeUsers.length - 4}
              </span>
            )}
            <span className="active-label">
              {activeUsers.length
                ? `${activeUsers.length} here`
                : "No one else here"}
            </span>
          </div>
          {isAdmin && (
            <button
              className="button button-soft invite-top"
              onClick={onInvite}
            >
              <span>＋</span> Invite
            </button>
          )}
        </div>
      </header>
      <div className="board-heading">
        <div>
          <p className="eyebrow">{organizationName || "Your workspace"}</p>
          <h1>{boardTitle || "Your board"}</h1>
          <p className="muted">
            A clear view of what’s moving and what’s next.
          </p>
        </div>
        <div className="board-heading-actions">
          <span className="today-chip">
            <span>✳</span> Keep it moving
          </span>
          <button
            className="button button-primary"
            onClick={onNewIssue}
            disabled={!boardTitle}
          >
            <span>＋</span> New issue
          </button>
        </div>
      </div>
      {(error || notice) && (
        <div
          className={`toast ${error ? "toast-error" : "toast-success"}`}
          role={error ? "alert" : "status"}
        >
          {error || notice}
          <button onClick={onDismissMessage} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
    </>
  );
}
