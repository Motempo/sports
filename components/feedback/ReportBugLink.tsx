"use client";

import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { BugReportDialog } from "./BugReportDialog";

interface Props {
  className?: string;
  variant?: "footer" | "sidebar";
}

export function ReportBugLink({ className, variant = "footer" }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-1.5 transition-colors",
          variant === "footer" && "text-xs text-neutral-500 hover:text-primary",
          variant === "sidebar" &&
            "w-full rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
          className
        )}
      >
        <MessageSquarePlus className={variant === "sidebar" ? "h-4 w-4" : "h-3.5 w-3.5"} />
        Submit Feedback
      </button>
      <BugReportDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
