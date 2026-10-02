"use client";

import type { Issue, Section } from "../lib/types";

type IssueCardProps = {
  issue: Issue;
  index: number;
  sectionIndex: number;
  sectionCount: number;
  sections: Section[];
  dragging: boolean;
  saving: boolean;
  onDragStart: (issue: Issue, dataTransfer: DataTransfer) => void;
  onDragEnd: () => void;
  onOpen: (issue: Issue) => void;
  onMove: (issueId: string, sectionId: string) => void;
};

const tagColors = [
  "bg-[#f7edcc] text-[#9a7c28]",
  "bg-[#edf0e7] text-[#718368]",
  "bg-[#f5e9e3] text-[#b47862]",
];

export function IssueCard({
  issue,
  index,
  sectionIndex,
  sectionCount,
  sections,
  dragging,
  saving,
  onDragStart,
  onDragEnd,
  onOpen,
  onMove,
}: IssueCardProps) {
  const tag =
    sectionIndex === 0
      ? "PLAN"
      : sectionIndex === sectionCount - 1
        ? "DONE"
        : "IN FLIGHT";
  return (
    <article
      className={`cursor-grab p-3 transition duration-150 hover:-translate-y-0.5 hover:shadow-md dark:hover:shadow-[0_4px_10px_rgba(0,0,0,0.2)] active:cursor-grabbing motion-reduce:transform-none motion-reduce:transition-none rounded-2xl border border-white/95 bg-[#fffefa] shadow-clay-sm dark:border-line dark:bg-[#343128] dark:shadow-[0_3px_8px_rgba(0,0,0,0.16)] ${dragging ? "opacity-50" : ""}`}
      draggable
      aria-busy={saving}
      onDragStart={(event) => onDragStart(issue, event.dataTransfer)}
      onDragEnd={onDragEnd}
    >
      <div className="mb-1 flex items-center justify-between">
        <span
          className={`inline-flex min-h-4.5 items-center rounded-md px-2 text-[8px] font-extrabold tracking-[0.08em] ${tagColors[index % tagColors.length]}`}
        >
          {tag}
        </span>
        <button
          className="h-5.5 w-6 max-sm:size-9 cursor-pointer rounded-lg border-0 bg-transparent text-[19px] leading-none text-[#aaa491] hover:bg-[#f2eedf] dark:hover:bg-[#39352a]"
          onClick={() => onOpen(issue)}
          aria-label={`Open ${issue.title}`}
        >
          ···
        </button>
      </div>
      <button
        className="block w-full cursor-pointer [overflow-wrap:anywhere] border-0 bg-transparent p-0 text-left text-xs leading-normal font-bold text-[#46443a] dark:text-[#e8e1d0]"
        onClick={() => onOpen(issue)}
      >
        {issue.title}
      </button>
      {issue.description && (
        <p className="mt-1 mb-2.5 line-clamp-2 text-[10px] [overflow-wrap:anywhere] leading-normal text-[#969182]">
          {issue.description}
        </p>
      )}
      <div className="mt-3.5 flex items-center justify-between border-t border-[#f0ede3] pt-2 dark:border-line">
        <span className="text-[8px] font-bold tracking-[0.06em] text-[#aaa595]">
          {saving ? (
            <span className="inline-flex items-center gap-1.5" role="status">
              <span
                aria-hidden="true"
                className="size-2.5 animate-spin rounded-full border border-current border-t-transparent motion-reduce:animate-none"
              />
              Saving…
            </span>
          ) : (
            issue.id.slice(0, 7).toUpperCase()
          )}
        </span>
        <label className="relative flex min-h-9 min-w-9 items-center justify-center rounded-lg text-[11px] max-sm:min-h-11 max-sm:min-w-11 text-[#9a927b] hover:text-[#7f6a2c]">
          <span className="sr-only">Move {issue.title}</span>
          <select
            className="absolute inset-0 w-full cursor-pointer opacity-0"
            value={issue.sectionId}
            onChange={(event) => onMove(issue.id, event.target.value)}
            aria-label={`Move ${issue.title}`}
          >
            <option value={issue.sectionId}>Move to…</option>
            {sections
              .filter((section) => section.id !== issue.sectionId)
              .map((section) => (
                <option key={section.id} value={section.id}>
                  {section.title}
                </option>
              ))}
          </select>
          <span aria-hidden="true">↗</span>
        </label>
      </div>
    </article>
  );
}
