import { useEffect, useState } from "react";

const CLOCK_TICK_MS = 1000;

/** Current time in ms, refreshed every second. A timer is an external system, so useEffect fits. */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);

  return now;
}
