import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-content-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p>This page does not exist or you do not have access to it.</p>
      <Link href="/dashboard" className="underline">
        Go to dashboard
      </Link>
    </main>
  );
}
