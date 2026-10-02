"use client";

import { useState } from "react";

import { buttonStyles, formStyles } from "../lib/ui-styles";

import { ActionSpinner } from "./ui";
import { Modal } from "./modal";

import type { OrganizationMembership } from "../lib/types";

type InviteDialogProps = {
  sendingInvite: boolean;
  inviteOpen: boolean;
  onCloseInvite: () => void;
  isAdmin: boolean;
  onSendInvite: (email: string) => Promise<boolean | undefined>;
  organizationId: string;
  onOrganizationChange: (id: string) => void;
  memberships: OrganizationMembership[];
};

export function InviteDialog(props: InviteDialogProps) {
  const [email, setEmail] = useState("");
  const adminMemberships = props.memberships.filter(
    (membership) => membership.role === "admin",
  );

  return (
    <>
      {props.inviteOpen && (
        <Modal
          title="Bring your people in"
          close={() => {
            if (!props.sendingInvite) props.onCloseInvite();
          }}
          closeDisabled={props.sendingInvite}
        >
          <p className="mt-2 mb-5 text-xs leading-relaxed text-[#8f8979] dark:text-muted">
            Invites are for people who already have a Setmeow account.
          </p>
          {props.isAdmin ? (
            <form
              className="flex flex-col gap-3.5"
              onSubmit={async (event) => {
                event.preventDefault();
                if (await props.onSendInvite(email)) setEmail("");
              }}
              aria-busy={props.sendingInvite}
            >
              <label className={formStyles.label}>
                Workspace
                <select
                  className={formStyles.input}
                  value={props.organizationId}
                  disabled={props.sendingInvite}
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
                  value={email}
                  disabled={props.sendingInvite}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="teammate@company.com"
                />
              </label>
              <div className="mt-1.5 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className={buttonStyles.quiet}
                  onClick={props.onCloseInvite}
                  disabled={props.sendingInvite}
                >
                  Cancel
                </button>
                <button
                  className={buttonStyles.primary}
                  disabled={props.sendingInvite}
                >
                  {props.sendingInvite && <ActionSpinner />}
                  {props.sendingInvite ? (
                    "Sending…"
                  ) : (
                    <>
                      Send invitation <span>↗</span>
                    </>
                  )}
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
