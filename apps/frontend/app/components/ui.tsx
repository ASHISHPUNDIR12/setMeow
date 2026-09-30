"use client";

import { type ReactNode, useEffect, useRef } from "react";

export function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: "light" | "dark";
  onToggle: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-8.5 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 text-[11px] font-bold whitespace-nowrap text-ink shadow-sm max-sm:min-h-8 max-sm:px-2"
      onClick={onToggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      aria-pressed={theme === "dark"}
    >
      <span className="text-[15px] text-amber-500" aria-hidden="true">
        {theme === "dark" ? "☀" : "☾"}
      </span>
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}

export function Avatar({
  name,
  small = false,
}: {
  name: string;
  small?: boolean;
}) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?";
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-full border-2 border-surface bg-linear-to-br from-[#ecd177] to-[#e6bb43] font-extrabold text-[#665522] ${small ? "-ml-1 size-7 text-[8px]" : "size-8.5 text-[10px]"}`}
      title={name}
    >
      {initials}
    </span>
  );
}

export function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  }, [close]);
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const dialog = dialogRef.current;
    const focusable = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex='0']",
        ) ?? [],
      );
    focusable()[0]?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) return;
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
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <div
      className="fixed inset-0 z-20 grid place-items-center overflow-y-auto bg-stone-900/15 p-6 backdrop-blur-[2px] dark:bg-black/60 max-sm:items-end max-sm:p-2.5"
      onMouseDown={(event) => event.target === event.currentTarget && close()}
    >
      <section
        ref={dialogRef}
        className="max-h-[min(90vh,850px)] w-full max-w-[490px] overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-modal max-sm:max-h-[88vh] max-sm:p-5"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-[21px] font-semibold tracking-tight">{title}</h2>
          <button
            className="inline-grid size-8 shrink-0 cursor-pointer place-items-center rounded-xl border-0 bg-transparent p-0 text-[22px] leading-none text-[#817c6c] hover:bg-[#f2eedf] dark:hover:bg-[#383429]"
            onClick={close}
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
