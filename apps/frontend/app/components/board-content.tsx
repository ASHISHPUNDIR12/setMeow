"use client";

import { useState, type FormEvent } from "react";
import type { Issue, Section } from "../lib/types";
import { BoardColumn } from "./board-column";
import { BoardWelcome } from "./board-welcome";

type Props = {
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

export function BoardContent(props: Props) {
  const [draggingIssueId, setDraggingIssueId] = useState("");
  if (!props.hasOrganization)
    return (
      <BoardWelcome
        kind="organization"
        onCreateOrganization={props.onCreateOrganization}
        onCreateBoard={props.onCreateBoard}
        onCreateSection={props.onCreateSection}
      />
    );
  if (!props.hasBoard)
    return (
      <BoardWelcome
        kind="board"
        onCreateOrganization={props.onCreateOrganization}
        onCreateBoard={props.onCreateBoard}
        onCreateSection={props.onCreateSection}
      />
    );
  if (props.loading && props.sections.length === 0)
    return (
      <div className="board-loading">
        <span className="loader" /> Loading your board…
      </div>
    );
  if (props.sections.length === 0)
    return (
      <BoardWelcome
        kind="section"
        onCreateOrganization={props.onCreateOrganization}
        onCreateBoard={props.onCreateBoard}
        onCreateSection={props.onCreateSection}
      />
    );

  return (
    <div className="board-area">
      <div className="board-toolbar">
        <span>
          <b>{props.issues.length}</b>{" "}
          {props.issues.length === 1 ? "issue" : "issues"}
        </span>
        <span className="drag-hint">Drag a card or use its move menu</span>
      </div>
      <div className="columns" aria-label="Issue board">
        {props.sections.map((section, index) => (
          <BoardColumn
            key={section.id}
            section={section}
            index={index}
            sectionCount={props.sections.length}
            issues={props.issuesBySection.get(section.id) ?? []}
            sections={props.sections}
            draggingIssueId={draggingIssueId}
            onDragIssue={setDraggingIssueId}
            onOpenIssue={props.onOpenIssue}
            onMoveIssue={props.onMoveIssue}
            onCreateIssue={props.onCreateIssue}
          />
        ))}
        {props.addingSection ? (
          <form
            className="add-column add-column-form"
            onSubmit={props.onCreateSection}
          >
            <input
              autoFocus
              name="title"
              aria-label="Section name"
              placeholder="Section name"
              maxLength={50}
              required
            />
            <button type="submit" aria-label="Save section">
              ↵
            </button>
            <button
              type="button"
              aria-label="Cancel"
              onClick={() => props.onAddingSectionChange(false)}
            >
              ×
            </button>
          </form>
        ) : (
          <button
            className="add-column"
            onClick={() => props.onAddingSectionChange(true)}
          >
            <span>＋</span>
            <b>Add section</b>
          </button>
        )}
      </div>
    </div>
  );
}
