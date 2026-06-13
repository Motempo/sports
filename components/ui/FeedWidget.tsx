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
      <header className="border-b border-border px-4 py-3">
        <h2 className="text-[20px] font-extrabold">{title}</h2>
      </header>
      <div className="divide-y divide-border">{children}</div>
      {footer && (
        <footer className="border-t border-border px-4 py-3">{footer}</footer>
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
      className="text-[15px] font-medium text-accent hover:underline disabled:opacity-50"
    >
      {loading ? "Loading…" : "Show more"}
    </button>
  );
}
