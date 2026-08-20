import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface NextEventCardProps {
  heading: string;
  live?: boolean;
  emblems: ReactNode;
  title: string;
  kicker?: string | null;
  whenLabel: string;
  location?: string | null;
  paragraphs: string[];
  watch?: ReactNode;
  className?: string;
}

export function NextEventCard({
  heading,
  live = false,
  emblems,
  title,
  kicker,
  whenLabel,
  location,
  paragraphs,
  watch,
  className,
}: NextEventCardProps) {
  return (
    <section className="border-b border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <div className="mb-3 flex items-center gap-2 sm:mb-4">
          <h2 className="text-[18px] font-extrabold sm:text-[20px]">{heading}</h2>
          {live && (
            <span className="inline-flex items-center gap-1 rounded-full bg-link/10 px-2 py-0.5 text-[11px] font-semibold text-link sm:text-[12px]">
              <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-link" />
              Live
            </span>
          )}
        </div>

        <div
          className={cn(
            "rounded-2xl border border-border bg-background px-4 py-5 shadow-sm sm:px-6 sm:py-6",
            live && "ring-1 ring-link/40",
            className
          )}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            <div className="flex shrink-0 justify-center sm:pt-1">{emblems}</div>
            <div className="min-w-0 flex-1 text-center sm:text-left">
              {kicker && (
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted sm:text-[12px]">
                  {kicker}
                </p>
              )}
              <p className="mt-1 text-[20px] font-extrabold leading-tight sm:text-[24px]">{title}</p>
              <p className="mt-1 text-[13px] text-muted sm:text-[14px]">
                {whenLabel}
                {location ? ` · ${location}` : ""}
              </p>
              {paragraphs.length > 0 && (
                <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-foreground/90 sm:text-[15px]">
                  {paragraphs.map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              )}
              {watch && <div className="mt-3 flex justify-center sm:justify-start">{watch}</div>}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
