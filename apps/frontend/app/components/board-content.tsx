"use client";

import { useState, type FormEvent } from "react";
import type { Issue, Section } from "../lib/types";
import { BoardColumn } from "./board-column";
import { BoardWelcome } from "./board-welcome";

type BoardContentProps = {
  hasOrganization: boolean;
  hasBoard: boolean;
  loading: boolean;
  issues: Issue[];
  sections: Section[];
  issuesBySection: Map<string, Issue[]>;
  addingSection: boolean;
  onAddingSectionChange: (adding: boolean) => void;
  onCreateOrganization: () => void;
  onCreateBoard: () => void;
  onCreateSection: (event: FormEvent<HTMLFormElement>) => void;
  onCreateIssue: (event: FormEvent<HTMLFormElement>, sectionId: string) => void;
  onMoveIssue: (issueId: string, targetSectionId: string) => void;
  onOpenIssue: (issue: Issue) => void;
};

export function BoardContent(props: BoardContentProps) {
  const [draggingIssueId, setDraggingIssueId] = useState("");
  const orderedSections = [...props.sections].sort((left, right) => {
    const rank = (title: string) => {
      const normalized = title.trim().toLowerCase().replace(/[ _-]/g, "");
      if (normalized === "todo" || normalized === "backlog") return 0;
      if (normalized === "inprogress") return 1;
      if (normalized === "done") return 2;
      return 3;
    };
    return rank(left.title) - rank(right.title);
  });
  if (!props.hasOrganization) {
    return (
      <BoardWelcome
        kind="organization"
        onCreateOrganization={props.onCreateOrganization}
        onCreateBoard={props.onCreateBoard}
        onCreateSection={props.onCreateSection}
      />
    );
  }

  if (!props.hasBoard) {
    return (
      <BoardWelcome
        kind="board"
        onCreateOrganization={props.onCreateOrganization}
        onCreateBoard={props.onCreateBoard}
        onCreateSection={props.onCreateSection}
      />
    );
  }

  if (props.loading && props.sections.length === 0) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-xs text-[#958f7e]">
        <span className="size-4.5 animate-spin rounded-full border-2 border-[#e4dec9] border-t-[#c39e36] motion-reduce:animate-none" />{" "}
        Loading your board…
      </div>
    );
  }

  if (props.sections.length === 0) {
    return (
      <BoardWelcome
        kind="section"
        onCreateOrganization={props.onCreateOrganization}
        onCreateBoard={props.onCreateBoard}
        onCreateSection={props.onCreateSection}
      />
    );
  }

  return (
    <div className="min-w-0 w-full">
      <div className="flex items-center justify-between px-px pb-3 text-[10px] text-[#9b9686]">
        <span>
          <b className="font-extrabold text-[#635d4c] dark:text-[#e1dac8]">
            {props.issues.length}
          </b>{" "}
          {props.issues.length === 1 ? "issue" : "issues"}
        </span>
        <span className="text-[#aaa596] max-sm:hidden">
          Drag a card or use its move menu
        </span>
      </div>
      <div
        className="flex max-w-full items-start gap-4.5 overflow-x-auto overscroll-x-contain snap-x snap-proximity px-1 pt-2 pb-8 [scrollbar-color:#ded7c4_transparent] [scrollbar-width:thin] max-sm:-mx-1 max-sm:gap-3"
        aria-label="Issue board"
      >
        {orderedSections.map((section, index) => (
          <BoardColumn
            key={section.id}
            section={section}
            index={index}
            sectionCount={orderedSections.length}
            issues={props.issuesBySection.get(section.id) ?? []}
            sections={orderedSections}
            draggingIssueId={draggingIssueId}
            onDragIssue={setDraggingIssueId}
            onOpenIssue={props.onOpenIssue}
            onMoveIssue={props.onMoveIssue}
            onCreateIssue={props.onCreateIssue}
          />
        ))}
        {props.addingSection ? (
          <form
            className="flex min-h-12 w-40 min-w-40 cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-[#d4cebc] bg-white/20 text-[10px] text-[#98917e] hover:bg-white/55 dark:border-[#514b3e] dark:bg-white/3 dark:text-[#b3aa96] dark:hover:bg-[#39352a] justify-start p-1.5 max-sm:w-60 max-sm:min-w-60"
            onSubmit={props.onCreateSection}
          >
            <input
              className="w-23 min-w-0 max-sm:flex-1 border-0 bg-transparent text-[10px] outline-none"
              autoFocus
              name="title"
              aria-label="Section name"
              placeholder="Section name"
              maxLength={50}
              required
            />
            <button
              className="size-6 shrink-0 max-sm:size-9 cursor-pointer rounded-lg border-0 bg-[#e9e4d4] text-[#7c745f] dark:bg-[#494333] dark:text-[#d0c6af]"
              type="submit"
              aria-label="Save section"
            >
              ↵
            </button>
            <button
              className="size-6 shrink-0 max-sm:size-9 cursor-pointer rounded-lg border-0 bg-[#e9e4d4] text-[#7c745f] dark:bg-[#494333] dark:text-[#d0c6af]"
              type="button"
              aria-label="Cancel"
              onClick={() => props.onAddingSectionChange(false)}
            >
              ×
            </button>
          </form>
        ) : (
          <button
            className="flex min-h-12 w-40 min-w-40 cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#d4cebc] bg-white/20 text-[10px] text-[#98917e] hover:bg-white/55 dark:border-[#514b3e] dark:bg-white/3 dark:text-[#b3aa96] dark:hover:bg-[#39352a]"
            onClick={() => props.onAddingSectionChange(true)}
          >
            <span className="text-base">＋</span>
            <b>Add section</b>
          </button>
        )}
      </div>
    </div>
  );
}
