"use client";

import { useEffect, useRef } from "react";
import { ActionSpinner, Avatar } from "./ui";

type AccountMenuProps = {
  username: string;
  email?: string;
  signingOut: boolean;
  onSignOut: () => void;
};

export function AccountMenu({
  username,
  email,
  signingOut,
  onSignOut,
}: AccountMenuProps) {
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
  return (
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
            onSignOut();
          }}
          disabled={signingOut}
        >
          {signingOut ? (
            <>
              Signing out… <ActionSpinner />
            </>
          ) : (
            <>
              Sign out <span aria-hidden="true">↗</span>
            </>
          )}
        </button>
      </div>
    </details>
  );
}
