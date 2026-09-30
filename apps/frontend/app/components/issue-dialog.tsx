"use client";

import { buttonStyles, formStyles } from "../lib/ui-styles";

import { Avatar, Modal } from "./ui";
import type { IssueDialogProps } from "./workspace-dialog-types";

export function IssueDialog(props: IssueDialogProps) {
  const issue = props.selectedIssue;
  if (!issue) return null;

  const unassignedPeople = props.organizationPeople.filter(
    (person) =>
      !props.issueAssignments.some(
        (assignment) => assignment.userId === person.id,
      ),
  );

  return (
    <Modal title="Issue details" close={props.onCloseIssue}>
      <div className="pt-4">
        <form className="flex flex-col gap-3.5" onSubmit={props.onSaveIssue}>
          <label className={formStyles.label}>
            Title
            <input
              className={formStyles.input}
              autoFocus
              required
              maxLength={100}
              value={props.editTitle}
              onChange={(event) => props.onEditTitleChange(event.target.value)}
            />
          </label>
          <label className={formStyles.label}>
            Description
            <textarea
              className={formStyles.textarea}
              rows={4}
              value={props.editDescription}
              onChange={(event) =>
                props.onEditDescriptionChange(event.target.value)
              }
              placeholder="Add a little more context…"
            />
          </label>
          <div className="mt-1.5 flex justify-end gap-2">
            <button
              type="button"
              className={buttonStyles.danger}
              onClick={() => props.onDeleteIssue(issue)}
            >
              Delete issue
            </button>
            <button className={buttonStyles.primary}>Save changes</button>
          </div>
        </form>
        <div className="my-5 h-px bg-line" />
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-[#5b574a] dark:text-[#e1dac8]">
              People
            </h3>
            <select
              className="rounded-lg border-0 bg-[#f4f0e2] p-2 text-[10px] text-[#7b704e] dark:bg-[#39352b] dark:text-[#d4cbb8]"
              aria-label="Assign a member"
              value=""
              onChange={(event) => props.onAssignUser(event.target.value)}
            >
              <option value="">＋ Assign</option>
              {unassignedPeople.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.username}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap gap-2">
            {props.issueAssignments.length ? (
              props.issueAssignments.map((assignment) => (
                <span
                  className="flex items-center gap-1.5 rounded-full border border-line bg-[#fbf9f0] py-1 pr-2 pl-0.5 text-[10px] text-[#716b5b] dark:bg-[#39352b] dark:text-[#d4cbb8]"
                  key={assignment.userId}
                >
                  <Avatar name={assignment.user.username} small />
                  {assignment.user.username}
                  <button
                    className="size-4 cursor-pointer rounded-full border-0 bg-[#eeeadd] leading-none text-[#8b8474] dark:bg-[#494333] dark:text-[#d4cbb8]"
                    onClick={() => props.onRemoveAssignment(assignment.userId)}
                    aria-label={`Remove ${assignment.user.username}`}
                  >
                    ×
                  </button>
                </span>
              ))
            ) : (
              <span className="text-muted text-xs">No one assigned yet.</span>
            )}
          </div>
        </div>
        <div className="my-5 h-px bg-line" />
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-[#5b574a] dark:text-[#e1dac8]">
              Conversation{" "}
              <span className="inline-grid h-5 min-w-5 place-items-center rounded-lg bg-white/60 px-1 text-[9px] font-bold text-[#938d7d] dark:bg-[#403b30] dark:text-[#c2baa8]">
                {props.issueComments.length}
              </span>
            </h3>
          </div>
          <div className="flex max-h-45 flex-col gap-3 overflow-y-auto">
            {props.issueComments.map((comment) => (
              <article className="flex items-start gap-2" key={comment.id}>
                <Avatar name={comment.user.username} small />
                <div className="min-w-0">
                  <strong className="text-[10px] text-[#615c4f] dark:text-[#d4cbb8]">
                    {comment.user.username}
                  </strong>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#7e796c] [overflow-wrap:anywhere] dark:text-muted">
                    {comment.content}
                  </p>
                </div>
              </article>
            ))}
            {props.issueComments.length === 0 && (
              <p className="text-muted text-xs">
                No comments yet. Start the conversation.
              </p>
            )}
          </div>
          <form
            className="mt-3.5 flex items-end gap-2"
            onSubmit={props.onAddComment}
          >
            <textarea
              className="min-w-0 flex-1 resize-y rounded-xl border border-line bg-input p-2.5 text-[11px]"
              rows={2}
              value={props.commentText}
              onChange={(event) =>
                props.onCommentTextChange(event.target.value)
              }
              placeholder="Write a comment…"
              aria-label="Write a comment"
            />
            <button
              className={buttonStyles.primary}
              disabled={!props.commentText.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </Modal>
  );
}
