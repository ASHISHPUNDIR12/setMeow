"use client";

import Link from "next/link";
import { buttonStyles } from "../lib/ui-styles";
import type { InvitationInboxProps } from "./workspace-dialog-types";

export function InvitationInbox(props: InvitationInboxProps) {
  return (
        <div className="my-8 rounded-3xl border border-line bg-surface p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-2 text-[10px] font-extrabold tracking-[0.15em] text-[#9b895a] uppercase">
                YOUR INBOX
              </p>
              <h2 className="text-[21px] font-semibold tracking-tight">
                Workspace invitations
              </h2>
            </div>
            <Link href="/dashboard" className="text-xs underline">Back to dashboard</Link>
          </div>
          {props.invitations.length ? (
            props.invitations.map((invite) => (
              <div
                className="mt-3 flex items-center gap-2 border-t border-line pt-3"
                key={invite.id}
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <strong className="truncate text-[11px] text-[#514d41] dark:text-[#e1dac8]">
                    {invite.organization.name}
                  </strong>
                  <span className="text-[10px] text-[#928c7c]">
                    Invited by {invite.invitedBy.username}
                  </span>
                </div>
                <button
                  className={`${buttonStyles.soft} min-h-8! px-2.5! text-[10px]!`}
                  onClick={() => props.onAnswerInvite(invite.id, "decline")}
                >
                  Decline
                </button>
                <button
                  className={`${buttonStyles.primary} min-h-8! px-2.5! text-[10px]!`}
                  onClick={() => props.onAnswerInvite(invite.id, "accept")}
                >
                  Join <span className="text-[10px] text-[#928c7c]">↗</span>
                </button>
              </div>
            ))
          ) : (
            <p className="text-muted text-xs">
              You’re all caught up. New invitations will appear here.
            </p>
          )}
        </div>
  );
}
