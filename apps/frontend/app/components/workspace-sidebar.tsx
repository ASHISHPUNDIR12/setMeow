"use client";

import type { Board, OrganizationMembership } from "../lib/types";
import { Avatar } from "./ui";

type Props = {
  memberships: OrganizationMembership[];
  organizationId: string;
  boards: Board[];
  boardId: string;
  email: string;
  inviteCount: number;
  onOrganizationChange: (id: string) => void;
  onBoardChange: (board: Board) => void;
  onCreateOrganization: () => void;
  onCreateBoard: () => void;
  onToggleInbox: () => void;
  onSignOut: () => void;
};

export function WorkspaceSidebar(props: Props) {
  const {
    memberships,
    organizationId,
    boards,
    boardId,
    email,
    inviteCount,
    onOrganizationChange,
    onBoardChange,
    onCreateOrganization,
    onCreateBoard,
    onToggleInbox,
    onSignOut,
  } = props;
  const selectedMembership = memberships.find(
    (item) => item.organization.id === organizationId,
  );
  return (
    <aside className="sidebar">
      <div className="brand-lockup sidebar-brand">
        <div className="brand-mark">s</div>
        <span>setmeow</span>
      </div>
      <div className="workspace-switcher">
        <div className="org-badge">
          {(selectedMembership?.organization.name ?? "S")
            .slice(0, 1)
            .toUpperCase()}
        </div>
        <label className="sr-only" htmlFor="workspace-select">
          Workspace
        </label>
        <select
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
          className="icon-button small"
          onClick={onCreateOrganization}
          aria-label="Create organization"
        >
          ＋
        </button>
      </div>
      <div className="side-label-row">
        <span className="side-label">YOUR BOARDS</span>
        <button
          className="icon-button small"
          onClick={onCreateBoard}
          disabled={!organizationId}
          aria-label="Create board"
        >
          ＋
        </button>
      </div>
      <nav className="board-nav" aria-label="Boards">
        {boards.map((board, index) => (
          <button
            key={board.id}
            className={`board-link${board.id === boardId ? " selected" : ""}`}
            onClick={() => onBoardChange(board)}
          >
            <span className={`board-symbol board-symbol-${index % 4}`}>▦</span>
            <span>{board.title}</span>
          </button>
        ))}
        {boards.length === 0 && (
          <p className="empty-side">
            No boards yet.
            <br />
            Create one to get started.
          </p>
        )}
      </nav>
      <div className="sidebar-spacer" />
      <div className="sidebar-footer">
        <button className="footer-action" onClick={onToggleInbox}>
          <span className="footer-icon">✉</span>
          <span>Invitations</span>
          {inviteCount > 0 && <b className="invite-count">{inviteCount}</b>}
        </button>
        <button className="footer-action" onClick={onSignOut}>
          <Avatar name={email || "You"} small />
          <span>Sign out</span>
          <span className="footer-arrow">↗</span>
        </button>
        <span className="version-label">A little more flow, every day.</span>
      </div>
    </aside>
  );
}
