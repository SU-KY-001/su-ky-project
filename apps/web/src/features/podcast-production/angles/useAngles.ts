import { useCallback, useEffect, useRef, useState } from "react";
import type { Angle } from "@repo/shared";
import { errorMessage } from "@/lib/apiError";
import { angleService } from "./angleService";

export interface AnglesState {
  angles: Angle[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Angle list (builtin first). Re-fetches when the tab regains focus so a list edited in another tab stays in sync. */
export function useAngles(): AnglesState {
  const [angles, setAngles] = useState<Angle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inflight = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;
    try {
      const { items } = await angleService.list(controller.signal);
      if (controller.signal.aborted) return;
      setAngles(items);
      setError(null);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(errorMessage(e));
    } finally {
      if (inflight.current === controller) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      inflight.current?.abort();
    };
  }, [refresh]);

  return { angles, loading, error, refresh };
}
