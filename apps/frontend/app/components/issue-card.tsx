"use client";

import type { Issue, Section } from "../lib/types";

type Props = {
  issue: Issue;
  index: number;
  sectionIndex: number;
  sectionCount: number;
  sections: Section[];
  dragging: boolean;
  onDragStart: (issue: Issue, dataTransfer: DataTransfer) => void;
  onDragEnd: () => void;
  onOpen: (issue: Issue) => void;
  onMove: (issueId: string, sectionId: string) => void;
};

export function IssueCard({
  issue,
  index,
  sectionIndex,
  sectionCount,
  sections,
  dragging,
  onDragStart,
  onDragEnd,
  onOpen,
  onMove,
}: Props) {
  const tag =
    sectionIndex === 0
      ? "PLAN"
      : sectionIndex === sectionCount - 1
        ? "DONE"
        : "IN FLIGHT";
  return (
    <article
      className={`issue-card clay-card${dragging ? " dragging" : ""}`}
      draggable
      onDragStart={(event) => onDragStart(issue, event.dataTransfer)}
      onDragEnd={onDragEnd}
    >
      <div className="issue-card-top">
        <span className={`issue-tag tag-${index % 3}`}>{tag}</span>
        <button
          className="dots-button"
          onClick={() => onOpen(issue)}
          aria-label={`Open ${issue.title}`}
        >
          ···
        </button>
      </div>
      <button className="issue-title" onClick={() => onOpen(issue)}>
        {issue.title}
      </button>
      {issue.description && (
        <p className="issue-description">{issue.description}</p>
      )}
      <div className="issue-card-bottom">
        <span className="issue-id">{issue.id.slice(0, 7).toUpperCase()}</span>
        <label className="move-select-label">
          <span className="sr-only">Move {issue.title}</span>
          <select
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
