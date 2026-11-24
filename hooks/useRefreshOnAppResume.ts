import { useEffect, useRef } from "react";
import { AppState } from "react-native";
import type { QueryClient } from "@tanstack/react-query";

// Short trips away (a notification, Control Center) shouldn't trigger a refetch.
const MIN_BACKGROUND_MS = 30 * 1000;

/**
 * Realtime events that arrive while the app is in the background are dropped,
 * so changes another household member made in the meantime would otherwise
 * stay hidden until each query's staleTime runs out. When the app comes back
 * after a while, mark everything stale: on-screen queries refetch right away
 * and the rest refetch when their screen next mounts.
 */
export function useRefreshOnAppResume(queryClient: QueryClient) {
  const backgroundedAt = useRef<number | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        const leftAt = backgroundedAt.current;
        backgroundedAt.current = null;
        if (leftAt !== null && Date.now() - leftAt >= MIN_BACKGROUND_MS) {
          queryClient.invalidateQueries();
        }
      } else if (backgroundedAt.current === null) {
        backgroundedAt.current = Date.now();
      }
    });

    return () => subscription.remove();
  }, [queryClient]);
}
