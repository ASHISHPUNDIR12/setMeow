"use client";

import type { FormEvent } from "react";
import type { Issue, Section } from "../lib/types";
import { IssueCard } from "./issue-card";

type Props = {
  section: Section;
  index: number;
  sectionCount: number;
  issues: Issue[];
  sections: Section[];
  draggingIssueId: string;
  onDragIssue: (issueId: string) => void;
  onOpenIssue: (issue: Issue) => void;
  onMoveIssue: (issueId: string, targetSectionId: string) => void;
  onCreateIssue: (event: FormEvent<HTMLFormElement>, sectionId: string) => void;
};

export function BoardColumn(props: Props) {
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
  return (
    <section
      className={`board-column column-tone-${index % 4}`}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const issueId = event.dataTransfer.getData("text/issue-id");
        onDragIssue("");
        if (issueId) onMoveIssue(issueId, section.id);
      }}
    >
      <header className="column-heading">
        <div>
          <span className={`column-dot dot-tone-${index % 4}`} />
          <h2>{section.title}</h2>
          <span className="column-count">{issues.length}</span>
        </div>
      </header>
      <div className="issue-list">
        {issues.map((issue, issueIndex) => (
          <IssueCard
            key={issue.id}
            issue={issue}
            index={issueIndex}
            sectionIndex={index}
            sectionCount={sectionCount}
            sections={sections}
            dragging={draggingIssueId === issue.id}
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
          <div className="empty-column">
            Drop an issue here
            <br />
            when it’s ready.
          </div>
        )}
      </div>
      <form
        className="quick-add"
        onSubmit={(event) => onCreateIssue(event, section.id)}
      >
        <span>＋</span>
        <input
          id={index === 0 ? "quick-add-issue" : undefined}
          name="title"
          aria-label={`Add issue to ${section.title}`}
          placeholder="Add an issue…"
          maxLength={100}
        />
        <button type="submit" aria-label={`Add issue to ${section.title}`}>
          ↵
        </button>
      </form>
    </section>
  );
}
