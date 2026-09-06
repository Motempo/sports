"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface ProfileCarouselProps {
  label: string;
  children: ReactNode;
  className?: string;
  /** Zero-based card to sit in the middle of the scroller on load. */
  centerIndex?: number;
}

export function ProfileCarousel({ label, children, className, centerIndex }: ProfileCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < maxScroll - 4);
  }, []);

  const centerCard = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      const el = scrollerRef.current;
      if (!el || centerIndex == null || centerIndex < 0) return;
      const cards = el.querySelectorAll<HTMLElement>("[data-carousel-card]");
      const card = cards[centerIndex];
      if (!card) return;

      const scrollerRect = el.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      const relativeLeft = cardRect.left - scrollerRect.left + el.scrollLeft;
      const scrollLeft = relativeLeft - el.clientWidth / 2 + card.clientWidth / 2;
      const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth);
      el.scrollTo({
        left: Math.min(maxScroll, Math.max(0, scrollLeft)),
        behavior,
      });
      updateEdges();
    },
    [centerIndex, updateEdges]
  );

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    updateEdges();
    el.addEventListener("scroll", updateEdges, { passive: true });
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", updateEdges);
      ro.disconnect();
    };
  }, [updateEdges, children]);

  useEffect(() => {
    if (centerIndex == null) return;
    centerCard("auto");
    const frame = requestAnimationFrame(() => centerCard("auto"));
    const timeout = window.setTimeout(() => centerCard("auto"), 80);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [centerCard, centerIndex, children]);

  const scrollByPage = useCallback((direction: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const firstCard = el.querySelector<HTMLElement>("[data-carousel-card]");
    const gap = 16;
    const step = firstCard ? firstCard.offsetWidth + gap : el.clientWidth * 0.8;
    el.scrollBy({ left: direction * step, behavior: "smooth" });
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByPage(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByPage(1);
    }
  };

  const navButtonClass = cn(
    "absolute top-1/2 z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full",
    "border border-border/80 bg-background/95 text-foreground shadow-md backdrop-blur-sm transition",
    "hover:border-foreground/25 hover:bg-background hover:shadow-lg",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/40",
    "disabled:pointer-events-none disabled:opacity-0 sm:inline-flex"
  );

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-label={`Previous ${label}`}
        disabled={!canPrev}
        onClick={() => scrollByPage(-1)}
        className={cn(navButtonClass, "left-0 -translate-x-1/2")}
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </button>
      <button
        type="button"
        aria-label={`Next ${label}`}
        disabled={!canNext}
        onClick={() => scrollByPage(1)}
        className={cn(navButtonClass, "right-0 translate-x-1/2")}
      >
        <ChevronRight className="h-4 w-4" strokeWidth={1.75} aria-hidden />
      </button>

      {/* Mobile-friendly controls when side buttons are hidden */}
      <div className="mb-3 flex items-center justify-end gap-2 sm:hidden">
        <button
          type="button"
          aria-label={`Previous ${label}`}
          disabled={!canPrev}
          onClick={() => scrollByPage(-1)}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition",
            "disabled:pointer-events-none disabled:opacity-35"
          )}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          aria-label={`Next ${label}`}
          disabled={!canNext}
          onClick={() => scrollByPage(1)}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-foreground shadow-sm transition",
            "disabled:pointer-events-none disabled:opacity-35"
          )}
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div
        ref={scrollerRef}
        role="region"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className={cn(
          "scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-1",
          "touch-pan-x focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {children}
      </div>
    </div>
  );
}
