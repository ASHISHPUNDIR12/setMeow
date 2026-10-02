"use client";

import { type FormEvent, useRef, useState } from "react";
import type { Issue, Section } from "../lib/types";
import { IssueCard } from "./issue-card";

type BoardColumnProps = {
  section: Section;
  index: number;
  sectionCount: number;
  issues: Issue[];
  movingIssueIds: Set<string>;
  sections: Section[];
  draggingIssueId: string;
  onDragIssue: (issueId: string) => void;
  onOpenIssue: (issue: Issue) => void;
  onMoveIssue: (issueId: string, targetSectionId: string) => void;
  onCreateIssue: (title: string, sectionId: string) => Promise<boolean>;
};

const columnColors = [
  "bg-[#eeece3]",
  "bg-[#eaece4]",
  "bg-[#eee9df]",
  "bg-[#ece9e5]",
];
const dotColors = [
  "bg-[#c4a344]",
  "bg-[#8b9a80]",
  "bg-[#d49374]",
  "bg-[#8a9ab4]",
];

export function BoardColumn(props: BoardColumnProps) {
  const [creatingIssue, setCreatingIssue] = useState(false);
  const submitting = useRef(false);
  const {
    section,
    index,
    sectionCount,
    issues,
    sections,
    draggingIssueId,
    onDragIssue,
    onOpenIssue,
    onMoveIssue,
    onCreateIssue,
  } = props;

  async function handleCreateIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const title = String(new FormData(form).get("title") ?? "").trim();
    if (!title) return;
    // Block repeated submissions immediately, before React renders disabled controls.
    if (submitting.current) return;
    submitting.current = true;
    setCreatingIssue(true);
    try {
      if (await onCreateIssue(title, section.id)) form.reset();
    } finally {
      submitting.current = false;
      setCreatingIssue(false);
    }
  }
  return (
    <section
      className={`min-h-80 min-w-0 shrink-0 snap-start w-[275px] rounded-[19px] border border-white/65 p-3 dark:border-line dark:bg-[#2b2923] max-sm:w-[min(81vw,292px)] ${columnColors[index % columnColors.length]}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const issueId = event.dataTransfer.getData("text/issue-id");
        onDragIssue("");
        if (issueId) onMoveIssue(issueId, section.id);
      }}
    >
      <header className="flex items-center justify-between px-1 pt-0.5 pb-3">
        <div className="flex min-w-0 items-start gap-2">
          <span
            className={`mt-1 size-2 shrink-0 rounded-full ${dotColors[index % dotColors.length]}`}
          />
          <h2 className="min-w-0 text-[11px] font-extrabold [overflow-wrap:anywhere] text-[#615d50] dark:text-[#e1dac8]">
            {section.title}
          </h2>
          <span className="inline-grid h-5 min-w-5 shrink-0 place-items-center rounded-lg bg-white/60 px-1 text-[9px] font-bold text-[#938d7d] dark:bg-[#403b30] dark:text-[#c2baa8]">
            {issues.length}
          </span>
        </div>
      </header>
      <form
        className="mb-3 flex items-center gap-2 rounded-xl px-2 text-[#9b9585] focus-within:bg-white/60 dark:focus-within:bg-white/5 [&:focus-within_button]:opacity-100 [&:hover_button]:opacity-100"
        onSubmit={handleCreateIssue}
        aria-busy={creatingIssue}
      >
        <span className="text-lg">＋</span>
        <input
          className="h-9 w-full min-w-0 border-0 bg-transparent text-[10px] text-ink outline-none placeholder:text-[#a7a292]"
          id={index === 0 ? "quick-add-issue" : undefined}
          name="title"
          aria-label={`Add issue to ${section.title}`}
          placeholder="Add an issue…"
          maxLength={100}
          required
          disabled={creatingIssue}
        />
        <button
          className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border-0 bg-[#e6e1d2] text-[#817967] disabled:cursor-wait dark:bg-[#494333] dark:text-[#d0c6af] ${creatingIssue ? "h-7 px-2 text-[10px] opacity-100" : "size-6 cursor-pointer opacity-0 max-sm:size-9 max-sm:opacity-100"}`}
          type="submit"
          disabled={creatingIssue}
          aria-label={
            creatingIssue
              ? `Creating issue in ${section.title}`
              : `Add issue to ${section.title}`
          }
        >
          {creatingIssue ? (
            <>
              <span
                aria-hidden="true"
                className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
              />
              Creating…
            </>
          ) : (
            "↵"
          )}
        </button>
        <span className="sr-only" role="status">
          {creatingIssue ? `Creating issue in ${section.title}…` : ""}
        </span>
      </form>
      <div className="flex min-h-15 flex-col gap-2.5">
        {issues.map((issue, issueIndex) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            index={issueIndex}
            sectionIndex={index}
            sectionCount={sectionCount}
            sections={sections}
            dragging={draggingIssueId === issue.id}
            saving={props.movingIssueIds.has(issue.id)}
            onDragStart={(item, transfer) => {
              onDragIssue(item.id);
              transfer.setData("text/issue-id", item.id);
              transfer.effectAllowed = "move";
            }}
            onDragEnd={() => onDragIssue("")}
            onOpen={onOpenIssue}
            onMove={onMoveIssue}
          />
        ))}
        {issues.length === 0 && (
          <div className="rounded-xl border border-dashed border-[#d8d4c7] px-2.5 py-4.5 text-center text-[10px] leading-relaxed text-[#aaa595] dark:border-line">
            Drop an issue here
            <br />
            when it’s ready.
          </div>
        )}
      </div>
    </section>
  );
}
