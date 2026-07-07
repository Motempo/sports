"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";

interface FeedRowProps {
  avatar: React.ReactNode;
  displayName: string;
  handle?: string;
  verified?: boolean;
  content: string;
  meta?: string;
  onClick?: () => void;
  className?: string;
}

export function FeedRow({
  avatar,
  displayName,
  handle,
  verified,
  content,
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
        "flex w-full gap-3 px-3 py-3.5 text-left transition-colors sm:px-4",
        onClick && "cursor-pointer active:bg-surface sm:hover:bg-surface",
        "min-h-[7rem] flex-1 sm:min-h-[7.25rem]",
        className
      )}
    >
      <div className="shrink-0">{avatar}</div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-1 text-[14px] leading-snug sm:text-[15px]">
          <span className="truncate font-bold">{displayName}</span>
          {verified && (
            <BadgeCheck className="h-4 w-4 shrink-0 fill-link text-background" />
          )}
          {handle && (
            <span className="truncate text-muted">@{handle}</span>
          )}
        </div>
        <p className="mt-0.5 min-h-[2.75rem] line-clamp-2 break-words text-[14px] leading-snug text-foreground sm:min-h-[2.875rem] sm:text-[15px]">
          {content}
        </p>
        {meta && (
          <p className="mt-1 break-words text-[12px] text-muted sm:text-[13px]">{meta}</p>
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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface ring-1 ring-border">
        <Image
          src={src}
          alt={alt}
          width={40}
          height={40}
          className="h-full w-full object-contain p-0.5"
          unoptimized
          onError={() => setFailed(true)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface text-lg leading-none ring-1 ring-border">
      {fallback}
    </div>
  );
}

export function formatXMeta(handle: string, time: string): string {
  return `@${handle} · ${formatRelativeTime(time)}`;
}
