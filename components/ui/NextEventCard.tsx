import type { ReactNode } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface NextEventCardProps {
  heading?: string;
  live?: boolean;
  emblems: ReactNode;
  title: string;
  kicker?: string | null;
  whenLabel: string;
  location?: string | null;
  paragraphs: string[];
  imageUrl?: string | null;
  imageAlt?: string;
  className?: string;
  /** When true, render only the card (no section heading/wrapper). */
  embedded?: boolean;
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
  imageUrl,
  imageAlt = "",
  className,
  embedded = false,
}: NextEventCardProps) {
  const card = (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-background shadow-sm",
        live && "ring-1 ring-link/40",
        className
      )}
    >
      <div
        className={cn(
          "grid grid-cols-1",
          imageUrl && "lg:grid-cols-2 lg:items-stretch"
        )}
      >
        <div className="flex min-w-0 flex-col gap-3 px-4 py-5 text-left sm:gap-3.5 sm:px-6 sm:py-6">
          {kicker && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted sm:text-[12px]">
              {kicker}
            </p>
          )}

          <div className="min-w-0">{emblems}</div>

          <div className="min-w-0">
            <p className="text-[20px] font-extrabold leading-tight sm:text-[24px]">{title}</p>
            <p className="mt-1.5 text-[13px] text-muted sm:text-[14px]">{whenLabel}</p>
            {location && (
              <p className="mt-1 text-[13px] font-medium text-foreground/80 sm:text-[14px]">
                {location}
              </p>
            )}
          </div>

          {paragraphs.length > 0 && (
            <div className="space-y-3 text-[14px] leading-relaxed text-foreground/90 sm:text-[15px]">
              {paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          )}
        </div>

        {imageUrl && (
          <div className="relative isolate min-h-[12.5rem] w-full overflow-hidden bg-surface sm:min-h-[16rem] lg:min-h-0 lg:h-full">
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover object-center"
              unoptimized
            />
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) return card;

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
        {card}
      </div>
    </section>
  );
}
