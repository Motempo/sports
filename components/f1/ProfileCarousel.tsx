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
  /** When set, the matching card is scrolled to the horizontal center on load and resize. */
  activeCardId?: string;
}

export function ProfileCarousel({
  label,
  children,
  className,
  activeCardId,
}: ProfileCarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const centersActive = Boolean(activeCardId);

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(el.scrollLeft < maxScroll - 4);
  }, []);

  const centerActiveCard = useCallback(() => {
    if (!activeCardId) return;
    const el = scrollerRef.current;
    const track = trackRef.current;
    if (!el || !track) return;

    const sampleCard = track.querySelector<HTMLElement>("[data-carousel-card]");
    if (sampleCard) {
      const pad = Math.max(0, el.clientWidth / 2 - sampleCard.offsetWidth / 2);
      track.style.paddingLeft = `${pad}px`;
      track.style.paddingRight = `${pad}px`;
    }

    const active = track.querySelector<HTMLElement>('[data-carousel-active="true"]');
    if (!active) return;

    const scrollerRect = el.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    const relativeLeft = activeRect.left - scrollerRect.left + el.scrollLeft;
    const scrollLeft = relativeLeft - el.clientWidth / 2 + active.offsetWidth / 2;
    const maxScroll = el.scrollWidth - el.clientWidth;
    el.scrollTo({
      left: Math.min(maxScroll, Math.max(0, scrollLeft)),
      behavior: "auto",
    });
  }, [activeCardId]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;

    const syncScroll = () => {
      centerActiveCard();
      updateEdges();
    };

    syncScroll();
    const frame = requestAnimationFrame(syncScroll);
    el.addEventListener("scroll", updateEdges, { passive: true });
    const ro = new ResizeObserver(syncScroll);
    ro.observe(el);

    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", updateEdges);
      ro.disconnect();
    };
  }, [centerActiveCard, updateEdges, children]);

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
          "scrollbar-hide overflow-x-auto overscroll-x-contain pb-1",
          !centersActive && "flex snap-x snap-mandatory gap-4",
          "touch-pan-x focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        )}
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div
          ref={trackRef}
          className={cn("flex gap-4", !centersActive && "contents")}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
