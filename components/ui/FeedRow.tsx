"use client";

import Image from "next/image";
import { cn, formatRelativeTime } from "@/lib/utils";

interface FeedRowProps {
  avatar: React.ReactNode;
  title: string;
  subtitle?: string;
  meta?: string;
  onClick?: () => void;
  className?: string;
}

export function FeedRow({
  avatar,
  title,
  subtitle,
  meta,
  onClick,
  className,
}: FeedRowProps) {
  const Wrapper = onClick ? "button" : "div";

  return (
    <Wrapper
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "flex w-full gap-3 px-4 py-3 text-left transition-colors",
        onClick && "cursor-pointer hover:bg-surface",
        className
      )}
    >
      <div className="shrink-0">{avatar}</div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] leading-snug">
          <span className="font-bold">{title}</span>
          {subtitle && (
            <span className="font-normal text-foreground"> {subtitle}</span>
          )}
        </p>
        {meta && (
          <p className="mt-1 text-[13px] text-muted">{meta}</p>
        )}
      </div>
    </Wrapper>
  );
}

export function FeedAvatar({
  src,
  alt,
  fallback,
}: {
  src?: string;
  alt: string;
  fallback: React.ReactNode;
}) {
  if (src) {
    return (
      <Image
        src={src}
        alt={alt}
        width={40}
        height={40}
        className="h-10 w-10 rounded-full object-cover"
        unoptimized
      />
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface text-lg">
      {fallback}
    </div>
  );
}

export function FeedMeta({ source, time }: { source: string; time: string }) {
  return `${source} · ${formatRelativeTime(time)}`;
}
