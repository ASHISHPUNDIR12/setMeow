"use client";

import { Modal } from "./ui";
import type { WorkspaceDialogProps } from "./workspace-dialog-types";

export function InvitationViews({ props }: { props: WorkspaceDialogProps }) {
  return (
    <>
      {props.inviteOpen && (
        <Modal title="Bring your people in" close={props.onCloseInvite}>
          <p className="modal-copy">
            Invites are for people who already have a Setmeow account.
          </p>
          {props.isAdmin ? (
            <form className="stack modal-form" onSubmit={props.onSendInvite}>
              <label>
                Workspace
                <select
                  value={props.organizationId}
                  onChange={(event) =>
                    props.onOrganizationChange(event.target.value)
                  }
                >
                  {props.memberships
                    .filter((item) => item.role === "admin")
                    .map((item) => (
                      <option
                        key={item.organization.id}
                        value={item.organization.id}
                      >
                        {item.organization.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Email address
                <input
                  autoFocus
                  type="email"
                  required
                  value={props.inviteEmail}
                  onChange={(event) =>
                    props.onInviteEmailChange(event.target.value)
                  }
                  placeholder="teammate@company.com"
                />
              </label>
              <div className="modal-actions">
                <button
                  type="button"
                  className="button button-quiet"
                  onClick={props.onCloseInvite}
                >
                  Cancel
                </button>
                <button className="button button-primary">
                  Send invitation <span>↗</span>
                </button>
              </div>
            </form>
          ) : (
            <p className="muted">
              An organization admin can invite members to this workspace.
            </p>
          )}
        </Modal>
      )}
      {props.inboxOpen && (
        <div className="invite-inbox-card clay-panel">
          <div className="modal-heading">
            <div>
              <p className="eyebrow">YOUR INBOX</p>
              <h2>Workspace invitations</h2>
            </div>
            <button
              className="icon-button"
              onClick={props.onCloseInbox}
              aria-label="Close invitations"
            >
              ×
            </button>
          </div>
          {props.invitations.length ? (
            props.invitations.map((invite) => (
              <div className="invite-row" key={invite.id}>
                <div>
                  <strong>{invite.organization.name}</strong>
                  <span>Invited by {invite.invitedBy.username}</span>
                </div>
                <button
                  className="button button-soft"
                  onClick={() => props.onAnswerInvite(invite.id, "decline")}
                >
                  Decline
                </button>
                <button
                  className="button button-primary"
                  onClick={() => props.onAnswerInvite(invite.id, "accept")}
                >
                  Join <span>↗</span>
                </button>
              </div>
            ))
          ) : (
            <p className="muted small-copy">
              You’re all caught up. New invitations will appear here.
            </p>
          )}
        </div>
      )}
    </>
  );
}
