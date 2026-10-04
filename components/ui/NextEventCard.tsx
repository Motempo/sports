import type { ReactNode } from "react";
import Image from "next/image";
import type { VenueImageCredit } from "@/lib/types";
import { cn } from "@/lib/utils";

interface NextEventCardProps {
  heading?: string;
  live?: boolean;
  emblems: ReactNode;
  title: string;
  kicker?: string | null;
  whenLabel: string;
  /** UTC instant for the kickoff, when `whenLabel` is a clock time. */
  whenDateTime?: string;
  location?: string | null;
  paragraphs: string[];
  imageUrl?: string | null;
  imageAlt?: string;
  /** Pixel size of a same-origin stadium photo. Keeps that photo's frame stable. */
  imageWidth?: number;
  imageHeight?: number;
  imageCredit?: VenueImageCredit | null;
  /** `aerial` crops an oblique circuit photo so the track sits in the centre; stadiums stay `cover`. */
  imageFit?: "cover" | "aerial";
  className?: string;
  /** Page section with heading, or just the inner rounded card (modals). */
  chrome?: "section" | "card";
}

function EventCardBody({
  live,
  emblems,
  title,
  kicker,
  whenLabel,
  whenDateTime,
  location,
  paragraphs,
  imageUrl,
  imageAlt,
  imageWidth,
  imageHeight,
  imageCredit,
  imageFit = "cover",
  className,
}: Omit<NextEventCardProps, "heading" | "chrome">) {
  const hasFrame = Boolean(imageUrl && imageWidth && imageHeight && imageWidth > 0 && imageHeight > 0);
  const sourceRatio = hasFrame ? imageWidth! / imageHeight! : 0;
  // Very wide facade panoramas stay fully visible instead of becoming a thin strip.
  const frameRatio = sourceRatio > 2.8 ? 2.4 : sourceRatio;
  const containWide = sourceRatio > 2.8;
  return (
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
          imageUrl && "lg:grid-cols-2",
          imageUrl && (hasFrame ? "lg:items-start" : "lg:items-stretch")
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
            {whenDateTime ? (
              <time
                dateTime={whenDateTime}
                className="mt-1.5 block text-[13px] tabular-nums text-muted sm:text-[14px]"
              >
                {whenLabel}
              </time>
            ) : (
              <p className="mt-1.5 text-[13px] tabular-nums text-muted sm:text-[14px]">{whenLabel}</p>
            )}
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
          <div
            className={cn(
              "relative isolate w-full overflow-hidden bg-surface",
              hasFrame ? "lg:self-start" : "min-h-[14rem] sm:min-h-[18rem] lg:min-h-0 lg:h-full"
            )}
            style={hasFrame ? { aspectRatio: String(frameRatio) } : undefined}
          >
            <Image
              src={imageUrl}
              alt={imageAlt ?? ""}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className={cn(
                containWide
                  ? "object-contain object-center"
                  : imageFit === "aerial"
                    ? "object-cover object-[center_72%]"
                    : "object-cover object-center"
              )}
              unoptimized={!imageUrl.startsWith("/")}
            />
            {imageCredit ? (
              <a
                href={imageCredit.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={`Photo: ${imageCredit.author} / ${imageCredit.license}. Resized for the web.`}
                className="absolute inset-x-0 bottom-0 z-10 truncate bg-black/55 px-2 py-1 text-[10px] leading-snug text-white/90 underline-offset-2 hover:text-white hover:underline sm:text-[11px]"
              >
                Photo: {imageCredit.author} / {imageCredit.license}
                <span className="sr-only">. Resized and compressed from the original.</span>
              </a>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function NextEventCard({
  heading,
  live = false,
  emblems,
  title,
  kicker,
  whenLabel,
  whenDateTime,
  location,
  paragraphs,
  imageUrl,
  imageAlt = "",
  imageWidth,
  imageHeight,
  imageCredit,
  imageFit = "cover",
  className,
  chrome = "section",
}: NextEventCardProps) {
  const body = (
    <EventCardBody
      live={live}
      emblems={emblems}
      title={title}
      kicker={kicker}
      whenLabel={whenLabel}
      whenDateTime={whenDateTime}
      location={location}
      paragraphs={paragraphs}
      imageUrl={imageUrl}
      imageAlt={imageAlt}
      imageWidth={imageWidth}
      imageHeight={imageHeight}
      imageCredit={imageCredit}
      imageFit={imageFit}
      className={className}
    />
  );

  if (chrome === "card") {
    return body;
  }

  return (
    <section className="border-b border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        {(heading || live) && (
          <div className="mb-3 flex items-center gap-2 sm:mb-4">
            {heading ? (
              <h2 className="text-[18px] font-extrabold sm:text-[20px]">{heading}</h2>
            ) : null}
            {live && (
              <span className="inline-flex items-center gap-1 rounded-full bg-link/10 px-2 py-0.5 text-[11px] font-semibold text-link sm:text-[12px]">
                <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-link" />
                Live
              </span>
            )}
          </div>
        )}
        {body}
      </div>
    </section>
  );
}
