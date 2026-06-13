"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersLight = stored === "light";
    setLight(prefersLight);
    document.documentElement.classList.toggle("light", prefersLight);
  }, []);

  const toggle = () => {
    const next = !light;
    setLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("theme", next ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className="touch-target flex shrink-0 items-center justify-center rounded-full hover:bg-surface active:bg-surface"
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
    >
      {light ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </button>
  );
}
