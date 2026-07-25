"use client";

import { useSyncExternalStore } from "react";

function subscribe(onTick: () => void) {
  const t = setInterval(onTick, 1000);
  return () => clearInterval(t);
}

// Returns null on the server and during hydration — clock text derived from
// Date.now() can never match across environments (React #418), so consumers
// render a blank placeholder until the client takes over.
export function useTime(): Date | null {
  const seconds = useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 1000),
    () => null
  );
  return seconds === null ? null : new Date(seconds * 1000);
}
