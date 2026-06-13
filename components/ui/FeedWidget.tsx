"use client";

import { cn } from "@/lib/utils";

interface FeedWidgetProps {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function FeedWidget({ title, children, footer, className }: FeedWidgetProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-background",
        className
      )}
    >
      <header className="border-b border-border px-3 py-3 sm:px-4">
        <h2 className="text-[18px] font-extrabold sm:text-[20px]">{title}</h2>
      </header>
      <div className="divide-y divide-border">{children}</div>
      {footer && (
        <footer className="border-t border-border px-3 py-3 sm:px-4">
          {footer}
        </footer>
      )}
    </section>
  );
}

export function ShowMoreButton({
  onClick,
  loading,
}: {
  onClick: () => void;
  loading?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="min-h-[44px] text-[15px] font-medium text-link active:opacity-70 disabled:opacity-50 sm:hover:underline"
    >
      {loading ? "Loading…" : "More"}
    </button>
  );
}
