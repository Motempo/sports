"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { light, toggle, mounted } = useTheme();

  return (
    <button
      type="button"
      onClick={toggle}
      className="touch-target flex shrink-0 items-center justify-center rounded-full hover:bg-surface active:bg-surface"
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
    >
      {!mounted ? (
        <Sun className="h-5 w-5 opacity-0" aria-hidden />
      ) : light ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </button>
  );
}
