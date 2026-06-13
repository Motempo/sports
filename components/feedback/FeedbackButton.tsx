"use client";

import { MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { FeedbackDialog } from "./FeedbackDialog";

export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 text-[15px] font-medium transition-colors active:bg-surface sm:w-auto sm:hover:bg-surface"
      >
        <MessageSquarePlus className="h-4 w-4" />
        Submit Feedback
      </button>
      <FeedbackDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
