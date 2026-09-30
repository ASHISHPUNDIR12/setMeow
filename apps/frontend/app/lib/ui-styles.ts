// Shared Tailwind utilities for controls used across authentication and dialogs.
const buttonBase =
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl border-0 px-4 text-xs font-bold transition duration-150 enabled:hover:-translate-y-px motion-reduce:transform-none motion-reduce:transition-none";

export const buttonStyles = {
  primary: `${buttonBase} bg-linear-to-br from-[#f4d65f] to-[#eec443] text-[#423a21] shadow-sm hover:from-[#f6d95f] hover:to-[#f6d95f] [&_span]:text-[15px]`,
  soft: `${buttonBase} bg-[#f4f0e1] shadow-sm dark:bg-[#403b30] dark:text-[#e1dac8]`,
  quiet: `${buttonBase} bg-[#f3f0e5] text-[#746f60] dark:bg-[#403b30] dark:text-[#e1dac8]`,
  danger: `${buttonBase} bg-[#faeee9] text-[#a45f4d] dark:bg-[#4a302a] dark:text-[#efb3a0]`,
};

export const formStyles = {
  label:
    "flex flex-col gap-2 text-[11px] font-bold text-[#5f5a4c] dark:text-[#d2cbb9]",
  input:
    "min-h-11 w-full rounded-xl border border-line bg-input px-3 py-2.5 text-[13px] font-normal text-ink placeholder:text-[#aaa594]",
  textarea:
    "min-h-11 w-full resize-y rounded-xl border border-line bg-input px-3 py-2.5 text-[13px] font-normal text-ink placeholder:text-[#aaa594]",
};
