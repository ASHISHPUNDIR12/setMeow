"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="grid min-h-screen place-content-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-semibold">We couldn’t load this page.</h1>
      <p>Please try again in a moment.</p>
      <button onClick={reset} className="underline">
        Try again
      </button>
      <Link href="/dashboard" className="underline">
        Go to dashboard
      </Link>
    </main>
  );
}
