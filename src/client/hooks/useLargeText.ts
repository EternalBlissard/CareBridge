import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "carebridge-large-text";

function readLargeTextPreference(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function applyLargeTextClass(enabled: boolean) {
  document.documentElement.classList.toggle("large-text", enabled);
}

export function useLargeText() {
  const [largeText, setLargeText] = useState(() => {
    const enabled = readLargeTextPreference();
    applyLargeTextClass(enabled);
    return enabled;
  });

  useEffect(() => {
    applyLargeTextClass(largeText);
    try {
      localStorage.setItem(STORAGE_KEY, String(largeText));
    } catch {
      /* private browsing */
    }
  }, [largeText]);

  const toggle = useCallback(() => setLargeText((v) => !v), []);

  return { largeText, toggle };
}
