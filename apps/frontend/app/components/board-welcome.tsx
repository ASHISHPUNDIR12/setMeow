"use client";

import { buttonStyles } from "../lib/ui-styles";

import type { FormEvent } from "react";

type BoardWelcomeProps = {
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
}: BoardWelcomeProps) {
  const [icon, eyebrow, title, description] = copy[kind];
  return (
    <div className="mx-auto my-[7vh] flex max-w-[510px] flex-col items-start p-9 max-sm:my-[5vh] max-sm:p-7 rounded-3xl border border-white/85 bg-surface shadow-sm dark:border-line dark:shadow-none">
      <div className="mb-7 grid size-12 place-items-center rounded-2xl bg-[#f3e5b0] text-2xl text-[#a18531] shadow-sm dark:bg-[#463d27] dark:text-[#e4c75f]">
        {icon}
      </div>
      <p className="mb-2 text-[10px] font-extrabold tracking-[0.15em] text-[#9b895a] uppercase">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-2.5 mb-6 max-w-[365px] text-xs leading-relaxed text-muted">
        {description}
      </p>
      {kind === "organization" && (
        <button className={buttonStyles.primary} onClick={onCreateOrganization}>
          Create workspace <span>↗</span>
        </button>
      )}
      {kind === "board" && (
        <button className={buttonStyles.primary} onClick={onCreateBoard}>
          Create a board <span>↗</span>
        </button>
      )}
      {kind === "section" && (
        <form
          className="flex flex-wrap gap-2 w-full"
          onSubmit={onCreateSection}
        >
          <input
            className="min-h-11 min-w-0 basis-36 flex-1 rounded-xl border border-line bg-input px-3 text-xs"
            name="title"
            aria-label="Section name"
            placeholder="Section name"
            maxLength={50}
            required
          />
          <button className={buttonStyles.primary}>Add section</button>
        </form>
      )}
    </div>
  );
}
