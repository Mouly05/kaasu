import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True once the client has hydrated. Avoids the `setState`-in-effect pattern for this. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}
