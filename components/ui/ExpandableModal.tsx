"use client";

import { X } from "lucide-react";
import { useRef, type ReactNode } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

interface ExpandableModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
}

export function ExpandableModal({
  open,
  onClose,
  title,
  children,
  className,
}: ExpandableModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  // Rows open this dialog without Dialog.Trigger. Radix would otherwise
  // restore focus only to that trigger (which stays null) and cancel the
  // default return to document.activeElement.
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const openRef = useRef(open);
  openRef.current = open;
  // Keep the last open panel painted through Radix's close animation if the
  // parent clears `title` / `children` in the same update as `open`.
  const snapshot = useRef({ title, children });
  if (open) snapshot.current = { title, children };
  const shownTitle = open ? title : snapshot.current.title;
  const shownChildren = open ? children : snapshot.current.children;

  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            "fixed inset-0 z-50 bg-black/70",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            const active = document.activeElement;
            const container = event.currentTarget;
            if (
              active instanceof HTMLElement &&
              active !== document.body &&
              container instanceof HTMLElement &&
              !container.contains(active)
            ) {
              returnFocusRef.current = active;
            }
            event.preventDefault();
            closeRef.current?.focus({ preventScroll: true });
          }}
          onCloseAutoFocus={(event) => {
            // Stop Radix from focusing a missing Dialog.Trigger. Skip while
            // `open` is still true so a dev Strict Mode remount does not
            // pull focus back out of the dialog.
            event.preventDefault();
            if (!openRef.current) returnFocusRef.current?.focus();
          }}
          className={cn(
            "fixed z-50 flex w-full max-h-[90dvh] flex-col border border-border bg-background outline-none",
            "inset-x-0 bottom-0 rounded-t-2xl",
            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-16 sm:w-[calc(100%-2rem)] sm:max-w-xl sm:-translate-x-1/2 sm:rounded-2xl",
            "safe-bottom",
            className
          )}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
            <DialogPrimitive.Title className="min-w-0 flex-1 truncate pr-2 text-[15px] font-bold">
              {shownTitle}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              ref={closeRef}
              className="touch-target flex shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-link active:bg-surface sm:hover:bg-surface"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <div
            tabIndex={0}
            role="region"
            aria-label="Details"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-link/40"
          >
            {shownChildren}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
