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
  /** UTC instant for the kickoff, when `whenLabel` is a clock time. */
  whenDateTime?: string;
  location?: string | null;
  paragraphs: string[];
  imageUrl?: string | null;
  imageAlt?: string;
  /** Pixel size of a same-origin stadium photo. Keeps that photo's frame stable. */
  imageWidth?: number;
  imageHeight?: number;
  /** Short label under a circuit diagram. */
  imageCaption?: string | null;
  /** `aerial` crops an oblique circuit photo. `diagram` keeps a small layout drawing. */
  imageFit?: "cover" | "aerial" | "diagram";
  /** `compact` uses a short stadium strip and tighter type for a side column. */
  density?: "regular" | "compact";
  className?: string;
  /** Page section with heading, the lead column, or just the inner rounded card (modals). */
  chrome?: "section" | "embedded" | "card";
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
  imageCaption,
  imageFit = "cover",
  density = "regular",
  className,
}: Omit<NextEventCardProps, "heading" | "chrome">) {
  if (imageFit === "diagram") {
    return (
      <DiagramEventBody
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
        imageCaption={imageCaption}
        className={className}
      />
    );
  }

  const compact = density === "compact";
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
          imageUrl && !compact && "lg:grid-cols-2",
          imageUrl && !compact && (hasFrame ? "lg:items-start" : "lg:items-stretch")
        )}
      >
        <div
          className={cn(
            "flex min-w-0 flex-col text-left",
            compact ? "gap-2 px-3 py-3" : "gap-3 px-4 py-5 sm:gap-3.5 sm:px-6 sm:py-6"
          )}
        >
          {kicker && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted sm:text-[12px]">
              {kicker}
            </p>
          )}

          <div className="min-w-0">{emblems}</div>

          <div className="min-w-0">
            <p className={cn("font-extrabold leading-tight", compact ? "text-[18px]" : "text-[20px] sm:text-[24px]")}>
              {title}
            </p>
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
            <div
              className={cn(
                "max-w-[65ch] text-foreground/90",
                compact
                  ? "space-y-2 text-[13px] leading-snug"
                  : "space-y-3 text-[14px] leading-relaxed sm:text-[15px]"
              )}
            >
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
              compact
                ? "h-28"
                : hasFrame
                  ? "lg:self-start"
                  : "min-h-[14rem] sm:min-h-[18rem] lg:min-h-0 lg:h-full"
            )}
            style={!compact && hasFrame ? { aspectRatio: String(frameRatio) } : undefined}
          >
            <Image
              src={imageUrl}
              alt={imageAlt ?? ""}
              fill
              sizes={compact ? "(min-width: 900px) 20rem, 100vw" : "(min-width: 1024px) 50vw, 100vw"}
              className={cn(
                containWide
                  ? "object-contain object-center"
                  : imageFit === "aerial"
                    ? "object-cover object-[center_72%]"
                    : "object-cover object-center"
              )}
              unoptimized={!imageUrl.startsWith("/") || imageUrl.endsWith(".svg")}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DiagramEventBody({
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
  imageCaption,
  className,
}: Omit<NextEventCardProps, "heading" | "chrome" | "imageFit">) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-background shadow-sm",
        live && "ring-1 ring-link/40",
        className
      )}
    >
      <div className="flex items-start gap-3 px-3 pt-3 sm:gap-4 sm:px-4 sm:pt-3.5">
        <div className="min-w-0 flex-1 text-left">
          {kicker && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
              {kicker}
            </p>
          )}
          <div className="mt-2 min-w-0">{emblems}</div>
          <p className="mt-2 text-[18px] font-extrabold leading-tight sm:text-[20px]">{title}</p>
          {whenDateTime ? (
            <time dateTime={whenDateTime} className="mt-1 block text-[13px] tabular-nums text-muted">
              {whenLabel}
            </time>
          ) : (
            <p className="mt-1 text-[13px] tabular-nums text-muted">{whenLabel}</p>
          )}
          {location && (
            <p className="mt-0.5 text-[13px] font-medium text-foreground/80">{location}</p>
          )}
        </div>
        {imageUrl ? (
          <figure className="w-[6.75rem] shrink-0 sm:w-[8.75rem]">
            <Image
              src={imageUrl}
              alt={imageAlt ?? ""}
              width={imageWidth && imageWidth > 0 ? imageWidth : 240}
              height={imageHeight && imageHeight > 0 ? imageHeight : 180}
              className="h-auto w-full"
              unoptimized
            />
            {imageCaption ? (
              <figcaption
                aria-hidden
                className="mt-1 text-center text-[10px] font-medium tabular-nums text-muted"
              >
                {imageCaption}
              </figcaption>
            ) : null}
          </figure>
        ) : null}
      </div>
      {paragraphs.length > 0 && (
        <div className="max-w-[65ch] space-y-2 px-3 pb-3 pt-2.5 text-[13px] leading-snug text-foreground/90 sm:px-4 sm:pb-3.5 sm:text-[14px]">
          {paragraphs.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function CardHeading({ heading, live }: { heading?: string; live: boolean }) {
  if (!heading && !live) return null;
  return (
    <div className="mb-2 flex items-center gap-2">
      {heading ? <h2 className="text-[17px] font-extrabold sm:text-[18px]">{heading}</h2> : null}
      {live && (
        <span className="inline-flex items-center gap-1 rounded-full bg-link/10 px-2 py-0.5 text-[11px] font-semibold text-link">
          <span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-link" />
          Live
        </span>
      )}
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
  imageCaption,
  imageFit = "cover",
  density = "regular",
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
      imageCaption={imageCaption}
      imageFit={imageFit}
      density={density}
      className={className}
    />
  );

  if (chrome === "card") {
    return body;
  }

  if (chrome === "embedded") {
    return (
      <div className="min-w-0">
        <CardHeading heading={heading} live={live} />
        {body}
      </div>
    );
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
