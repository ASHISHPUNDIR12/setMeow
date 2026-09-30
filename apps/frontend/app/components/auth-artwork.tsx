import { PawLogo } from "./paw-logo";

export function AuthArtwork() {
  return (
    <div
      className="relative grid min-h-[530px] place-items-center overflow-hidden rounded-[40px] bg-[radial-gradient(ellipse_at_48%_43%,#f9e792_0%,#f2d66e_36%,#edc74e_75%,#e8bd3e_100%)] shadow-art max-lg:min-h-[440px] max-lg:hidden short:min-h-[min(500px,calc(100svh-36px))]"
      aria-hidden="true"
    >
      <div className="absolute size-[420px] rounded-full border border-white/45 scale-x-150 -rotate-24" />
      <div className="absolute size-[420px] rounded-full border border-white/45 scale-x-90 rotate-46" />
      <div className="relative flex h-[300px] w-[260px] -rotate-5 flex-col justify-between rounded-[9px_9px_22px_9px] bg-[#fffbed] p-7 text-[#39382f] shadow-sticky short:h-[260px] short:w-[228px] short:p-6 after:absolute after:-right-px after:-bottom-px after:size-11 after:rounded-br-[21px] after:bg-linear-to-br after:from-[#f6eecf] after:to-[#e6d7aa] after:content-['']">
        <span className="text-[11px] font-extrabold tracking-[0.16em] text-[#a79b77] uppercase">
          one paw at a time
        </span>
        <strong className="text-[28px] leading-tight font-semibold tracking-[-0.06em]">
          Small steps.
          <br />
          Happy teams.
        </strong>
        <PawLogo className="size-10 self-end" />
      </div>
      <div className="absolute size-3.5 rounded-full bg-[#fff7d0] shadow-sm top-[17%] left-[21%]" />
      <div className="absolute rounded-full bg-[#fff7d0] shadow-sm right-[16%] bottom-[23%] size-5" />
      <div className="absolute rounded-full bg-[#fff7d0] shadow-sm top-[17%] right-[26%] size-2" />
    </div>
  );
}
