"use client";

import { buttonStyles } from "../lib/ui-styles";

import type { Person } from "../lib/types";
import { Avatar, ThemeToggle } from "./ui";

type BoardHeaderProps = {
  organizationName: string;
  boardTitle: string;
  connection: "offline" | "connecting" | "live";
  activeUsers: Person[];
  isAdmin: boolean;
  theme: "light" | "dark";
  error: string;
  notice: string;
  onThemeToggle: () => void;
  onInvite: () => void;
  onNewIssue: () => void;
  onDismissMessage: () => void;
};

const connectionStyles = {
  offline: "bg-[#c3bdaa]",
  live: "bg-[#7f9b72] ring-3 ring-[#7f9b72]/15",
  connecting: "bg-[#ddb941] animate-pulse motion-reduce:animate-none",
};

export function BoardHeader(props: BoardHeaderProps) {
  const {
    organizationName,
    boardTitle,
    connection,
    activeUsers,
    isAdmin,
    theme,
    error,
    notice,
    onThemeToggle,
    onInvite,
    onNewIssue,
    onDismissMessage,
  } = props;
  return (
    <>
      <header className="flex min-h-18 items-center justify-between gap-5 border-b border-line max-sm:min-h-14 max-sm:flex-wrap max-sm:gap-2 max-sm:py-2">
        <div className="flex items-center gap-2.5 text-[11px] text-[#9c9789]">
          <span>{organizationName || "Workspace"}</span>
          <b className="font-medium text-[#d0caba]">/</b>
          <strong className="font-bold text-[#575345] dark:text-[#e1dac8]">
            {boardTitle || "Board"}
          </strong>
        </div>
        <div className="flex items-center gap-[clamp(13px,2vw,25px)] max-sm:gap-2">
          <ThemeToggle theme={theme} onToggle={onThemeToggle} />
          <span className="flex items-center gap-1.5 text-[10px] text-[#a19b8c]">
            <i
              className={`size-2 rounded-full ${connectionStyles[connection]}`}
            />
            {connection === "live"
              ? "Live"
              : connection === "connecting"
                ? "Connecting"
                : "Offline"}
          </span>
          <div
            className="flex items-center pl-1"
            aria-label={`${activeUsers.length} members active on this board`}
          >
            {activeUsers.slice(0, 4).map((person) => (
              <Avatar key={person.id} name={person.username} small />
            ))}
            {activeUsers.length > 4 && (
              <span className="inline-grid shrink-0 place-items-center rounded-full border-2 border-surface bg-[#e9e5d9] font-extrabold -ml-1 size-7 text-[8px] text-[#716d61] dark:bg-[#403b30] dark:text-[#c2baa8]">
                +{activeUsers.length - 4}
              </span>
            )}
            <span className="ml-2 text-[10px] whitespace-nowrap text-[#898474] max-sm:hidden">
              {activeUsers.length
                ? `${activeUsers.length} here`
                : "No one else here"}
            </span>
          </div>
          {isAdmin && (
            <button
              className="inline-flex min-h-8.5 cursor-pointer items-center justify-center gap-2 rounded-xl border-0 px-3 text-[11px] font-bold bg-[#f4f0e1] shadow-sm dark:bg-[#403b30] dark:text-[#e1dac8] max-sm:min-h-8"
              onClick={onInvite}
            >
              <span>＋</span> Invite
            </button>
          )}
        </div>
      </header>
      <div className="flex items-end justify-between gap-5 pt-11 pb-8 max-lg:pt-8 max-sm:items-start max-sm:pt-7 max-sm:pb-5">
        <div>
          <p className="mb-2 text-[10px] font-extrabold tracking-[0.15em] text-[#9b895a] uppercase">
            {organizationName || "Your workspace"}
          </p>
          <h1 className="text-[clamp(29px,3.3vw,40px)] leading-tight font-semibold tracking-[-0.065em] max-sm:text-3xl">
            {boardTitle || "Your board"}
          </h1>
          <p className="mt-2 text-xs text-muted max-sm:max-w-[230px] max-sm:leading-normal">
            A clear view of what’s moving and what’s next.
          </p>
        </div>
        <div className="flex items-center gap-4 max-sm:pt-5">
          <span className="flex items-center gap-2 text-[10px] whitespace-nowrap text-[#8d866f] max-lg:hidden">
            <span className="text-base text-[#d7ae32]">✳</span> Keep it moving
          </span>
          <button
            className={`${buttonStyles.primary} max-sm:min-h-9! max-sm:px-2.5! max-sm:text-[10px]! max-sm:whitespace-nowrap!`}
            onClick={onNewIssue}
            disabled={!boardTitle}
          >
            <span>＋</span> New issue
          </button>
        </div>
      </div>
      {(error || notice) && (
        <div
          className={`-mt-3 mb-5 flex items-center justify-between gap-4 rounded-xl border bg-surface px-3.5 py-3 text-xs shadow-sm max-sm:-mt-1 ${error ? "border-[#efd6ca] text-[#9a4e3c] dark:border-[#69463d] dark:text-[#edb5a5]" : "border-line text-[#687c5f] dark:text-[#bed0ae]"}`}
          role={error ? "alert" : "status"}
        >
          {error || notice}
          <button
            className="cursor-pointer border-0 bg-transparent text-lg"
            onClick={onDismissMessage}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
