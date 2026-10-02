"use client";

import { useRef, useState } from "react";

export function usePendingActions() {
  const inFlight = useRef(new Set<string>());
  const [pending, setPending] = useState(new Map<string, string>());

  async function run<Result>(
    key: string,
    action: () => Promise<Result>,
    label = key,
  ) {
    if (inFlight.current.has(key)) return;
    inFlight.current.add(key);
    setPending((current) => new Map(current).set(key, label));
    try {
      return await action();
    } finally {
      inFlight.current.delete(key);
      setPending((current) => {
        const next = new Map(current);
        next.delete(key);
        return next;
      });
    }
  }

  return { pending, run };
}
