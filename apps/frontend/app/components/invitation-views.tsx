"use client";

import { buttonStyles, formStyles } from "../lib/ui-styles";

import { Modal } from "./ui";
import type { InvitationViewsProps } from "./workspace-dialog-types";

export function InvitationViews(props: InvitationViewsProps) {
  const adminMemberships = props.memberships.filter(
    (membership) => membership.role === "admin",
  );

  return (
    <>
      {props.inviteOpen && (
        <Modal title="Bring your people in" close={props.onCloseInvite}>
          <p className="mt-2 mb-5 text-xs leading-relaxed text-[#8f8979] dark:text-muted">
            Invites are for people who already have a Setmeow account.
          </p>
          {props.isAdmin ? (
            <form
              className="flex flex-col gap-3.5"
              onSubmit={props.onSendInvite}
            >
              <label className={formStyles.label}>
                Workspace
                <select
                  className={formStyles.input}
                  value={props.organizationId}
                  onChange={(event) =>
                    props.onOrganizationChange(event.target.value)
                  }
                >
                  {adminMemberships.map((membership) => (
                    <option
                      key={membership.organization.id}
                      value={membership.organization.id}
                    >
                      {membership.organization.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className={formStyles.label}>
                Email address
                <input
                  className={formStyles.input}
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
              <div className="mt-1.5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className={buttonStyles.quiet}
                  onClick={props.onCloseInvite}
                >
                  Cancel
                </button>
                <button className={buttonStyles.primary}>
                  Send invitation <span>↗</span>
                </button>
              </div>
            </form>
          ) : (
            <p className="text-muted">
              An organization admin can invite members to this workspace.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
