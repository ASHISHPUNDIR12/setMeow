"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { boardPath } from "../lib/routes";
import { PawLogo } from "./paw-logo";

import type { Board, OrganizationMembership } from "../lib/types";
import { Avatar } from "./ui";

type WorkspaceSidebarProps = {
  memberships: OrganizationMembership[];
  organizationId: string;
  boards: Board[];
  boardId: string;
  username: string;
  email?: string;
  inviteCount: number;
  onOrganizationChange: (id: string) => void;
  onCreateOrganization: () => void;
  onCreateBoard: () => void;
  onSignOut: () => void;
};

const boardColors = [
  "text-[#b29543]",
  "text-[#87947b]",
  "text-[#cf8d76]",
  "text-[#8b96ae]",
];

export function WorkspaceSidebar(props: WorkspaceSidebarProps) {
  const accountRef = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    function closeOnOutsideClick(event: PointerEvent) {
      const account = accountRef.current;
      if (
        account &&
        event.target instanceof Node &&
        !account.contains(event.target)
      ) {
        account.open = false;
      }
    }
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);
  const {
    memberships,
    organizationId,
    boards,
    boardId,
    username,
    email,
    inviteCount,
    onOrganizationChange,
    onCreateOrganization,
    onCreateBoard,
    onSignOut,
  } = props;
  const selectedMembership = memberships.find(
    (item) => item.organization.id === organizationId,
  );
  return (
    <aside className="sticky top-0 flex h-dvh min-w-0 flex-col border-r border-line bg-[#f8f5eb] px-4 pt-7 pb-4 dark:bg-[#26241f] max-sm:relative max-sm:h-auto max-sm:border-r-0 max-sm:border-b max-sm:px-4 max-sm:pt-3.5 max-sm:pb-2">
      <div className="flex items-center gap-2 text-[17px] font-extrabold tracking-tight text-[#514b38] dark:text-[#e4decd] px-2 max-sm:hidden">
        <PawLogo />
        <span>setmeow</span>
      </div>
      <div className="mt-9 mb-8 flex h-14 shrink-0 items-center gap-2 rounded-2xl border border-white/90 bg-[#f6f2e3] px-2 shadow-inner dark:border-line dark:bg-[#302d26] max-sm:mt-0 max-sm:mb-3 max-sm:h-11">
        <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-linear-to-br from-[#eed372] to-[#e8bd3f] text-[13px] font-extrabold text-[#615126]">
          {(selectedMembership?.organization.name ?? "S")
            .slice(0, 1)
            .toUpperCase()}
        </div>
        <label className="sr-only" htmlFor="workspace-select">
          Workspace
        </label>
        <select
          className="w-full min-w-0 cursor-pointer appearance-none border-0 bg-transparent text-xs font-bold text-ink"
          id="workspace-select"
          value={organizationId}
          onChange={(event) => onOrganizationChange(event.target.value)}
          aria-label="Choose organization"
        >
          {memberships.map((item) => (
            <option key={item.organization.id} value={item.organization.id}>
              {item.organization.name}
            </option>
          ))}
        </select>
        <button
          className="inline-grid size-7 max-sm:size-9 shrink-0 cursor-pointer place-items-center rounded-xl border-0 bg-transparent p-0 text-lg leading-none text-[#817c6c] hover:bg-[#f2eedf] dark:hover:bg-[#383429]"
          onClick={onCreateOrganization}
          aria-label="Create organization"
        >
          ＋
        </button>
      </div>
      <div className="flex items-center justify-between px-2 pb-2 max-sm:pb-1">
        <span className="text-[9px] font-extrabold tracking-[0.14em] text-[#a09a88]">
          YOUR BOARDS
        </span>
        <button
          className="inline-grid size-7 max-sm:size-9 shrink-0 cursor-pointer place-items-center rounded-xl border-0 bg-transparent p-0 text-lg leading-none text-[#817c6c] hover:bg-[#f2eedf] dark:hover:bg-[#383429]"
          onClick={onCreateBoard}
          disabled={!organizationId}
          aria-label="Create board"
        >
          ＋
        </button>
      </div>
      <nav
        className="flex min-h-0 min-w-0 flex-col gap-1 overflow-y-auto overscroll-contain max-sm:shrink-0 max-sm:flex-row max-sm:overflow-x-auto max-sm:overflow-y-hidden max-sm:pb-1"
        aria-label="Boards"
      >
        {boards.map((board, index) => (
          <Link
            key={board.id}
            className={`flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl border-0 px-2.5 text-left text-xs max-sm:min-h-11 max-sm:min-w-max ${board.id === boardId ? "bg-[#f0e7c6] font-bold text-[#4d4328] shadow-inner dark:bg-[#4a4026] dark:text-[#f4d878]" : "bg-transparent text-[#777365] hover:bg-[#f0ecdd] dark:text-[#b5ad9a] dark:hover:bg-[#383429]"}`}
            href={boardPath(organizationId, board.id)}
            aria-current={board.id === boardId ? "page" : undefined}
          >
            <span
              className={`shrink-0 text-[15px] ${boardColors[index % boardColors.length]}`}
            >
              ▦
            </span>
            <span className="min-w-0 truncate max-sm:max-w-48">
              {board.title}
            </span>
          </Link>
        ))}
        {boards.length === 0 && (
          <p className="px-2.5 py-1 text-[11px] leading-relaxed text-[#a09b8d]">
            No boards yet.
            <br />
            Create one to get started.
          </p>
        )}
      </nav>
      <div className="flex-1 max-sm:hidden" />
      <div className="flex shrink-0 flex-col gap-1 border-t border-line pt-3.5 max-sm:flex-row max-sm:flex-wrap max-sm:items-center max-sm:justify-between max-sm:gap-2 max-sm:border-0 max-sm:pt-2">
        <Link
          className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-xl border-0 bg-transparent px-2 text-left text-[11px] text-[#767162] hover:bg-[#f0ecdf] dark:text-[#b5ad9a] dark:hover:bg-[#383429] min-w-0 max-sm:min-h-11"
          href="/invitations"
        >
          <span className="grid size-6.5 place-items-center rounded-lg bg-[#f3e9c8] text-[#977a29] dark:bg-[#463d27] dark:text-[#e3c361]">
            ✉
          </span>
          <span>Invitations</span>
          {inviteCount > 0 && (
            <b className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-[#edc84c] text-[10px] text-[#534519]">
              {inviteCount}
            </b>
          )}
        </Link>
        <details
          ref={accountRef}
          className="group relative min-w-0 w-full max-sm:w-auto max-sm:basis-36 max-sm:flex-1"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              event.currentTarget.open = false;
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              event.currentTarget.open = false;
              event.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary
            className="flex min-h-11 w-full cursor-pointer list-none items-center gap-2.5 rounded-xl px-2 py-2 text-left text-[11px] hover:bg-[#f0ecdf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 dark:hover:bg-[#383429] [&::-webkit-details-marker]:hidden"
            aria-label="Account options"
          >
            <Avatar name={username || email || "You"} small />
            <span
              className="min-w-0 flex-1 truncate font-bold text-ink"
              title={username || "Your account"}
            >
              {username || "Your account"}
            </span>
            <span
              aria-hidden="true"
              className="shrink-0 text-muted group-open:rotate-180"
            >
              ⌃
            </span>
          </summary>
          <div className="absolute right-0 bottom-full z-30 mb-2 w-full rounded-2xl border border-line bg-surface p-2 shadow-modal max-sm:top-full max-sm:bottom-auto max-sm:mt-2 max-sm:mb-0 max-sm:w-[min(240px,calc(100vw-32px))]">
            {email && (
              <p className="border-b border-line px-2 pt-1 pb-2 text-[11px] text-muted [overflow-wrap:anywhere]">
                {email}
              </p>
            )}
            <button
              type="button"
              className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-2 text-left text-xs font-bold text-[#a45f4d] hover:bg-[#faeee9] dark:text-[#efb3a0] dark:hover:bg-[#4a302a]"
              onClick={() => {
                if (accountRef.current) accountRef.current.open = false;
                onSignOut();
              }}
            >
              Sign out <span aria-hidden="true">↗</span>
            </button>
          </div>
        </details>
        <span className="px-2 pt-4 text-[10px] text-[#aaa696] max-sm:hidden">
          A little more flow, every day.
        </span>
      </div>
    </aside>
  );
}
