"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";

export function Modal({
  title,
  close,
  children,
  closeDisabled = false,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
  closeDisabled?: boolean;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const closeRef = useRef({ close, disabled: closeDisabled });
  useEffect(() => {
    closeRef.current = { close, disabled: closeDisabled };
  }, [close, closeDisabled]);
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex='0']",
        ) ?? [],
      );
    focusable()[0]?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!closeRef.current.disabled) closeRef.current.close();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) {
        event.preventDefault();
        dialog?.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div
      className="fixed inset-0 z-20 grid place-items-center overscroll-contain overflow-y-auto bg-stone-900/15 p-6 backdrop-blur-[2px] dark:bg-black/60 max-sm:items-end max-sm:p-2.5 max-sm:pb-[max(0.625rem,env(safe-area-inset-bottom))]"
      onMouseDown={(event) => {
        if (!closeDisabled && event.target === event.currentTarget) close();
      }}
    >
      <section
        ref={dialogRef}
        className="max-h-[min(90dvh,850px)] min-w-0 w-full max-w-[490px] overscroll-contain overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-modal max-sm:max-h-[calc(100dvh-2rem)] max-sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id={titleId}
            className="min-w-0 text-[21px] font-semibold tracking-tight [overflow-wrap:anywhere]"
          >
            {title}
          </h2>
          <button
            type="button"
            className="inline-grid size-8 max-sm:size-11 shrink-0 cursor-pointer place-items-center rounded-xl border-0 bg-transparent p-0 text-[22px] leading-none text-[#817c6c] hover:bg-[#f2eedf] dark:hover:bg-[#383429]"
            onClick={close}
            disabled={closeDisabled}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}
