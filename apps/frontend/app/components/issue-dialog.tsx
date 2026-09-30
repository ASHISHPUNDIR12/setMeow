"use client";

import { Avatar, Modal } from "./ui";
import type { WorkspaceDialogProps } from "./workspace-dialog-types";

export function IssueDialog({ props }: { props: WorkspaceDialogProps }) {
  const issue = props.selectedIssue;
  if (!issue) return null;
  return (
    <Modal title="Issue details" close={props.onCloseIssue}>
      <div className="issue-modal-content">
        <form className="stack modal-form" onSubmit={props.onSaveIssue}>
          <label>
            Title
            <input
              autoFocus
              required
              maxLength={100}
              value={props.editTitle}
              onChange={(event) => props.onEditTitleChange(event.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              rows={4}
              value={props.editDescription}
              onChange={(event) =>
                props.onEditDescriptionChange(event.target.value)
              }
              placeholder="Add a little more context…"
            />
          </label>
          <div className="modal-actions">
            <button
              type="button"
              className="button button-danger-quiet"
              onClick={() => props.onDeleteIssue(issue)}
            >
              Delete issue
            </button>
            <button className="button button-primary">Save changes</button>
          </div>
        </form>
        <div className="detail-divider" />
        <div className="detail-section">
          <div className="detail-section-heading">
            <h3>People</h3>
            <select
              aria-label="Assign a member"
              value=""
              onChange={(event) => props.onAssignUser(event.target.value)}
            >
              <option value="">＋ Assign</option>
              {props.organizationPeople
                .filter(
                  (person) =>
                    !props.issueAssignments.some(
                      (assignment) => assignment.userId === person.id,
                    ),
                )
                .map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.username}
                  </option>
                ))}
            </select>
          </div>
          <div className="assignee-list">
            {props.issueAssignments.length ? (
              props.issueAssignments.map((assignment) => (
                <span className="assignee-chip" key={assignment.userId}>
                  <Avatar name={assignment.user.username} small />
                  {assignment.user.username}
                  <button
                    onClick={() => props.onRemoveAssignment(assignment.userId)}
                    aria-label={`Remove ${assignment.user.username}`}
                  >
                    ×
                  </button>
                </span>
              ))
            ) : (
              <span className="muted small-copy">No one assigned yet.</span>
            )}
          </div>
        </div>
        <div className="detail-divider" />
        <div className="detail-section">
          <div className="detail-section-heading">
            <h3>
              Conversation{" "}
              <span className="column-count">{props.issueComments.length}</span>
            </h3>
          </div>
          <div className="comment-list">
            {props.issueComments.map((comment) => (
              <article className="comment" key={comment.id}>
                <Avatar name={comment.user.username} small />
                <div>
                  <strong>{comment.user.username}</strong>
                  <p>{comment.content}</p>
                </div>
              </article>
            ))}
            {props.issueComments.length === 0 && (
              <p className="muted small-copy">
                No comments yet. Start the conversation.
              </p>
            )}
          </div>
          <form className="comment-form" onSubmit={props.onAddComment}>
            <textarea
              rows={2}
              value={props.commentText}
              onChange={(event) =>
                props.onCommentTextChange(event.target.value)
              }
              placeholder="Write a comment…"
              aria-label="Write a comment"
            />
            <button
              className="button button-primary"
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
