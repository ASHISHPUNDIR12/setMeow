"use client";

import type { FormEvent } from "react";

type Props = {
  kind: "organization" | "board" | "section";
  onCreateOrganization: () => void;
  onCreateBoard: () => void;
  onCreateSection: (event: FormEvent<HTMLFormElement>) => void;
};

const copy = {
  organization: [
    "✳",
    "A fresh start",
    "Create your first workspace",
    "A workspace keeps your boards, projects, and people in one place.",
  ],
  board: [
    "▦",
    "A space for your next idea",
    "No boards here yet",
    "Start with a board. We’ll add a few useful sections for you.",
  ],
  section: [
    "＋",
    "Make it yours",
    "Add the first section",
    "Sections give your work a simple flow, like Backlog, In progress, and Done.",
  ],
} as const;

export function BoardWelcome({
  kind,
  onCreateOrganization,
  onCreateBoard,
  onCreateSection,
}: Props) {
  const [icon, eyebrow, title, description] = copy[kind];
  return (
    <div className="welcome-panel clay-panel">
      <div className="welcome-icon">{icon}</div>
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p className="muted">{description}</p>
      {kind === "organization" && (
        <button
          className="button button-primary"
          onClick={onCreateOrganization}
        >
          Create workspace <span>↗</span>
        </button>
      )}
      {kind === "board" && (
        <button className="button button-primary" onClick={onCreateBoard}>
          Create a board <span>↗</span>
        </button>
      )}
      {kind === "section" && (
        <form className="inline-form centered-form" onSubmit={onCreateSection}>
          <input
            name="title"
            aria-label="Section name"
            placeholder="Section name"
            maxLength={50}
            required
          />
          <button className="button button-primary">Add section</button>
        </form>
      )}
    </div>
  );
}
