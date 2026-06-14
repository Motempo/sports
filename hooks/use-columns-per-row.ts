"use client";

import { useEffect, useState } from "react";

/** Matches ScheduleByDay grid: 1 col default, 2 at md, 3 at xl. */
export function useColumnsPerRow() {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const xl = window.matchMedia("(min-width: 1280px)");
    const md = window.matchMedia("(min-width: 768px)");

    const update = () => {
      if (xl.matches) setColumns(3);
      else if (md.matches) setColumns(2);
      else setColumns(1);
    };

    update();
    xl.addEventListener("change", update);
    md.addEventListener("change", update);
    return () => {
      xl.removeEventListener("change", update);
      md.removeEventListener("change", update);
    };
  }, []);

  return columns;
}
