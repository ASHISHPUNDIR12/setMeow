"use client";

export function ActionSpinner() {
  return (
    <span
      aria-hidden="true"
      className="inline-block size-3 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
    />
  );
}

export function ThemeToggle({
  theme,
  onToggle,
}: {
  theme: "light" | "dark";
  onToggle: () => void;
}) {
  return (
    <button
      className="inline-flex min-h-8.5 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 text-[11px] font-bold whitespace-nowrap text-ink shadow-sm max-sm:min-h-11 max-sm:px-3"
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
