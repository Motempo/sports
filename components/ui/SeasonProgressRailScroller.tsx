"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SeasonProgressRailScrollerProps {
  activeStepId: string;
  children: ReactNode;
  className?: string;
}

/** Horizontally scroll a season rail so the active step sits in the middle. */
export function SeasonProgressRailScroller({
  activeStepId,
  children,
  className,
}: SeasonProgressRailScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const centerActive = () => {
      const active = scroller.querySelector<HTMLElement>('[data-rail-active="true"]');
      if (!active) return;

      const scrollerRect = scroller.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const relativeLeft = activeRect.left - scrollerRect.left + scroller.scrollLeft;
      const scrollLeft =
        relativeLeft - scroller.clientWidth / 2 + active.clientWidth / 2;
      const maxScroll = scroller.scrollWidth - scroller.clientWidth;
      scroller.scrollTo({
        left: Math.min(maxScroll, Math.max(0, scrollLeft)),
        behavior: "auto",
      });
    };

    centerActive();
    // Layout may settle after fonts/images; re-center once on the next frame.
    const frame = requestAnimationFrame(centerActive);
    const observer = new ResizeObserver(centerActive);
    observer.observe(scroller);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [activeStepId]);

  return (
    <div
      ref={scrollerRef}
      className={cn("scrollbar-hide min-w-0 flex-1 overflow-x-auto", className)}
    >
      <div className="flex gap-1 pb-1">{children}</div>
    </div>
  );
}
