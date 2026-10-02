"use client";

import { useState } from "react";
import type { Issue, Section } from "../lib/types";
import { BoardColumn } from "./board-column";
import { BoardWelcome } from "./board-welcome";
import { ActionSpinner } from "./ui";

type BoardContentProps = {
  hasOrganization: boolean;
  hasBoard: boolean;
  loading: boolean;
  issues: Issue[];
  movingIssueIds: Set<string>;
  sections: Section[];
  issuesBySection: Map<string, Issue[]>;
  addingSection: boolean;
  creatingSection: boolean;
  onAddingSectionChange: (adding: boolean) => void;
  onCreateOrganization: () => void;
  onCreateBoard: () => void;
  onCreateSection: (title: string) => Promise<boolean | undefined>;
  onCreateIssue: (title: string, sectionId: string) => Promise<boolean>;
  onMoveIssue: (issueId: string, targetSectionId: string) => void;
  onOpenIssue: (issue: Issue) => void;
};

export function BoardContent(props: BoardContentProps) {
  const [draggingIssueId, setDraggingIssueId] = useState("");
  const orderedSections = [...props.sections].sort(
    (left, right) => sectionRank(left.title) - sectionRank(right.title),
  );
  if (!props.hasOrganization) {
    return (
      <BoardWelcome
        creatingSection={props.creatingSection}
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
        creatingSection={props.creatingSection}
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
        creatingSection={props.creatingSection}
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
            movingIssueIds={props.movingIssueIds}
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
            onSubmit={async (event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const title = String(new FormData(form).get("title") ?? "");
              if (await props.onCreateSection(title)) form.reset();
            }}
            aria-busy={props.creatingSection}
          >
            <input
              className="w-23 min-w-0 max-sm:flex-1 border-0 bg-transparent text-[10px] outline-none"
              autoFocus
              name="title"
              aria-label="Section name"
              placeholder="Section name"
              maxLength={50}
              required
              disabled={props.creatingSection}
            />
            <button
              className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border-0 bg-[#e9e4d4] text-[#7c745f] disabled:cursor-wait disabled:opacity-60 dark:bg-[#494333] dark:text-[#d0c6af] ${props.creatingSection ? "px-2" : "w-6 cursor-pointer max-sm:w-9"}`}
              type="submit"
              disabled={props.creatingSection}
              aria-label={
                props.creatingSection ? "Creating section" : "Save section"
              }
            >
              {props.creatingSection ? (
                <>
                  <ActionSpinner /> Creating…
                </>
              ) : (
                "↵"
              )}
            </button>
            <button
              className="size-6 shrink-0 max-sm:size-9 cursor-pointer rounded-lg border-0 bg-[#e9e4d4] text-[#7c745f] dark:bg-[#494333] dark:text-[#d0c6af]"
              type="button"
              disabled={props.creatingSection}
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
            disabled={props.creatingSection}
          >
            {props.creatingSection ? (
              <ActionSpinner />
            ) : (
              <span className="text-base">＋</span>
            )}
            <b>{props.creatingSection ? "Creating…" : "Add section"}</b>
          </button>
        )}
      </div>
    </div>
  );
}

function sectionRank(title: string) {
  const normalized = title.trim().toLowerCase().replace(/[ _-]/g, "");
  if (normalized === "todo" || normalized === "backlog") return 0;
  if (normalized === "inprogress") return 1;
  if (normalized === "done") return 2;
  return 3;
}
