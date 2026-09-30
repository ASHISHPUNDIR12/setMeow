import { PawLogo } from "./components/paw-logo";

export default function Loading() {
  return <main className="grid min-h-screen place-content-center justify-items-center gap-4 text-muted" role="status">
    <PawLogo /><p>Getting your space ready…</p>
  </main>;
}
