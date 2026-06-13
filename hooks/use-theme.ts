"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyTheme,
  getStoredTheme,
  getSystemPrefersLight,
  resolveLightTheme,
  type StoredTheme,
} from "@/lib/theme";

export function useTheme() {
  const [stored, setStored] = useState<StoredTheme>(null);
  const [systemLight, setSystemLight] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initialStored = getStoredTheme();
    const initialSystem = getSystemPrefersLight();
    setStored(initialStored);
    setSystemLight(initialSystem);
    applyTheme(initialStored, initialSystem);
    setMounted(true);

    const media = window.matchMedia("(prefers-color-scheme: light)");
    const onSystemChange = (event: MediaQueryListEvent) => {
      setSystemLight(event.matches);
      if (getStoredTheme() === null) {
        applyTheme(null, event.matches);
      }
    };

    media.addEventListener("change", onSystemChange);
    return () => media.removeEventListener("change", onSystemChange);
  }, []);

  const light = resolveLightTheme(stored, systemLight);
  const followingSystem = stored === null;

  const toggle = useCallback(() => {
    const nextStored: StoredTheme = light ? "dark" : "light";
    localStorage.setItem("theme", nextStored);
    setStored(nextStored);
    applyTheme(nextStored, systemLight);
  }, [light, systemLight]);

  return { light, toggle, followingSystem, mounted };
}
