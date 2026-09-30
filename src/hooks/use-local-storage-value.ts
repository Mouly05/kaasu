import { useSyncExternalStore } from "react";

function subscribe() {
  // A private, single-tab convenience value (Quick Add's last-used category/
  // account) — no cross-tab sync needed, so there's nothing to subscribe to.
  return () => {};
}

/** SSR-safe read of a localStorage string; null on the server and until hydrated. */
export function useLocalStorageValue(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    () => null,
  );
}

/** Best-effort write; silently no-ops in a private window or when storage is blocked. */
export function writeLocalStorageValue(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignored — this is a convenience default, not durable state.
  }
}
