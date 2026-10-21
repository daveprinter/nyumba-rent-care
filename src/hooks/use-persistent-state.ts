import { useEffect, useState } from "react";

/** State saved to localStorage (survives closing) or sessionStorage (survives refresh). Read after mount to avoid hydration mismatch. */
export function usePersistentState<T>(key: string, initial: T, kind: "local" | "session" = "local") {
  const [value, setValue] = useState<T>(initial);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    try {
      const store = kind === "local" ? window.localStorage : window.sessionStorage;
      const raw = store.getItem(key);
      if (raw != null) setValue(JSON.parse(raw) as T);
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, [key, kind]);
  useEffect(() => {
    if (!loaded) return;
    try {
      const store = kind === "local" ? window.localStorage : window.sessionStorage;
      store.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [key, kind, value, loaded]);
  return [value, setValue] as const;
}