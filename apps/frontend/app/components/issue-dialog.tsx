"use client";

import { type FormEvent, useRef, useState } from "react";
import { buttonStyles, formStyles } from "../lib/ui-styles";

import { ActionSpinner } from "./ui";
import { Modal } from "./modal";
import { IssueAssignees } from "./issue-assignees";
import { IssueComments } from "./issue-comments";

import type { Assignment, Comment, Issue, Person } from "../lib/types";

type IssueDialogProps = {
  loadingDetails: boolean;
  selectedIssue: Issue | null;
  onCloseIssue: () => void;
  onSaveIssue: (values: {
    title: string;
    description: string;
  }) => Promise<void>;
  error: string;
  onDeleteIssue: (issue: Issue) => Promise<void>;
  onAssignUser: (userId: string) => Promise<void>;
  organizationPeople: Person[];
  issueAssignments: Assignment[];
  onRemoveAssignment: (userId: string) => Promise<void>;
  issueComments: Comment[];
  onAddComment: (content: string) => Promise<boolean>;
};

export function IssueDialog(props: IssueDialogProps) {
  const issue = props.selectedIssue;
  const [title, setTitle] = useState(issue?.title ?? "");
  const [description, setDescription] = useState(issue?.description ?? "");
  const [comment, setComment] = useState("");
  const [editingDescription, setEditingDescription] = useState(
    !issue?.description,
  );
  const [pendingAction, setPendingAction] = useState<
    "save" | "comment" | "delete" | "assign" | "remove" | null
  >(null);
  const [pendingMemberId, setPendingMemberId] = useState("");
  const submitting = useRef(false);
  const busy = pendingAction !== null;
  if (!issue) return null;

  async function runAction(
    action: "save" | "comment" | "delete" | "assign" | "remove",
    submit: () => Promise<void>,
  ) {
    if (submitting.current) return;
    submitting.current = true;
    setPendingAction(action);
    try {
      await submit();
    } finally {
      submitting.current = false;
      setPendingAction(null);
    }
  }

  function saveIssue(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void runAction("save", () => props.onSaveIssue({ title, description }));
  }

  function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!comment.trim()) return;
    void runAction("comment", async () => {
      if (await props.onAddComment(comment)) setComment("");
    });
  }

  return (
    <Modal
      title="Issue details"
      close={() => {
        if (!submitting.current) props.onCloseIssue();
      }}
      closeDisabled={busy}
    >
      <div className="pt-4">
        {props.error && (
          <p
            role="alert"
            className="mb-4 rounded-xl border border-[#efd6ca] bg-[#faeee9] p-3 text-xs text-[#9a4e3c] dark:border-[#69463d] dark:bg-[#4a302a] dark:text-[#edb5a5]"
          >
            {props.error}
          </p>
        )}
        <form
          className="flex flex-col gap-3.5"
          onSubmit={saveIssue}
          aria-busy={pendingAction === "save"}
        >
          <label className={formStyles.label}>
            Title
            <input
              className={formStyles.input}
              autoFocus
              required
              disabled={busy}
              maxLength={100}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <label
                className="text-[11px] font-bold text-[#5f5a4c] dark:text-[#d2cbb9]"
                htmlFor={editingDescription ? "issue-description" : undefined}
              >
                Description
              </label>
              <button
                type="button"
                className={`${buttonStyles.soft} min-h-8! px-2.5! text-[10px]! disabled:cursor-wait disabled:opacity-60`}
                disabled={busy}
                onClick={() => {
                  if (editingDescription) setDescription(issue.description);
                  setEditingDescription(!editingDescription);
                }}
              >
                {editingDescription ? "Cancel editing" : "Edit description"}
              </button>
            </div>
            {editingDescription ? (
              <textarea
                id="issue-description"
                className={formStyles.textarea}
                rows={4}
                disabled={busy}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add a little more context…"
              />
            ) : (
              <p className="rounded-xl border border-line bg-input p-3 text-xs leading-relaxed whitespace-pre-wrap text-ink [overflow-wrap:anywhere]">
                {issue.description || "No description yet."}
              </p>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className={`${buttonStyles.danger} disabled:cursor-wait disabled:opacity-60`}
              disabled={busy}
              onClick={() =>
                void runAction("delete", () => props.onDeleteIssue(issue))
              }
            >
              {pendingAction === "delete" && <ActionSpinner />}
              {pendingAction === "delete" ? "Deleting…" : "Delete issue"}
            </button>
            <button
              type="submit"
              className={`${buttonStyles.primary} disabled:cursor-wait disabled:opacity-60`}
              disabled={busy || !title.trim()}
            >
              {pendingAction === "save" && <ActionSpinner />}
              {pendingAction === "save" ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
        <div className="my-5 h-px bg-line" />
        <IssueAssignees
          people={props.organizationPeople}
          assignments={props.issueAssignments}
          disabled={busy}
          assigning={pendingAction === "assign"}
          loading={props.loadingDetails}
          removingUserId={pendingAction === "remove" ? pendingMemberId : null}
          onAssign={(userId) =>
            void runAction("assign", () => props.onAssignUser(userId))
          }
          onRemove={(userId) => {
            if (submitting.current) return;
            setPendingMemberId(userId);
            void runAction("remove", () => props.onRemoveAssignment(userId));
          }}
        />
        <div className="my-5 h-px bg-line" />
        <IssueComments
          comments={props.issueComments}
          comment={comment}
          disabled={busy || props.loadingDetails}
          sending={pendingAction === "comment"}
          loading={props.loadingDetails}
          onCommentChange={setComment}
          onSubmit={addComment}
        />
      </div>
    </Modal>
  );
}
