"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface ExpandableModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ExpandableModal({
  open,
  onClose,
  title,
  children,
  className,
}: ExpandableModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex bg-black/70",
        "items-end p-0 sm:items-start sm:justify-center sm:p-4 sm:pt-16"
      )}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={cn(
          "relative flex w-full max-h-[90dvh] flex-col border border-border bg-background",
          "rounded-t-2xl sm:max-w-xl sm:rounded-2xl",
          "safe-bottom",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
          <h2 className="min-w-0 flex-1 truncate pr-2 text-[15px] font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="touch-target flex shrink-0 items-center justify-center rounded-full active:bg-surface sm:hover:bg-surface"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">{children}</div>
      </div>
    </div>
  );
}
