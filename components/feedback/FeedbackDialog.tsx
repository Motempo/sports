"use client";

import { useState } from "react";
import { ExpandableModal } from "@/components/ui/ExpandableModal";
import { compressFeedbackScreenshot, fileToBase64 } from "@/lib/compress-screenshot";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
  const [text, setText] = useState("");
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setText("");
    setScreenshot(null);
    setSuccess(false);
    setError(null);
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(reset, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      let screenshotBase64: string | undefined;
      let screenshotMimeType: "image/jpeg" | "image/png" | "image/webp" | undefined;
      let screenshotFilename: string | undefined;

      if (screenshot) {
        const compressed = await compressFeedbackScreenshot(screenshot);
        screenshotBase64 = await fileToBase64(compressed);
        screenshotMimeType = compressed.type as "image/jpeg" | "image/png" | "image/webp";
        screenshotFilename = compressed.name;
      }

      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: text.trim(),
          screenshotBase64,
          screenshotMimeType,
          screenshotFilename,
          pageUrl: window.location.href,
          userAgent: navigator.userAgent,
        }),
      });

      let data: { error?: string } = {};
      try {
        data = (await res.json()) as { error?: string };
      } catch {
        if (!res.ok) {
          throw new Error(
            res.status === 413
              ? "Screenshot is too large. Try a smaller image or submit without one."
              : "Could not reach the server. Please try again."
          );
        }
      }

      if (!res.ok) {
        throw new Error(data.error ?? "Failed to submit feedback");
      }

      setSuccess(true);
      setText("");
      setScreenshot(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(
        message === "Load failed"
          ? "Upload failed — try a smaller screenshot or submit without one."
          : message
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ExpandableModal open={open} onClose={handleClose} title="Submit Feedback">
      {success ? (
        <div className="py-4 text-center">
          <p className="text-[15px] font-bold">Thank you!</p>
          <p className="mt-2 text-[15px] text-muted">
            Your feedback has been received. We appreciate you helping improve Sports by Motempo.
          </p>
          <button
            type="button"
            onClick={handleClose}
            className="mt-4 text-[15px] font-medium text-accent hover:underline"
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="feedback-text" className="mb-1 block text-[13px] text-muted">
              Your feedback
            </label>
            <textarea
              id="feedback-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              required
              placeholder="Tell us what you think or what could be better…"
              className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-2 text-[15px] outline-none focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="feedback-screenshot" className="mb-1 block text-[13px] text-muted">
              Screenshot (optional)
            </label>
            <input
              id="feedback-screenshot"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => {
                setScreenshot(e.target.files?.[0] ?? null);
                setError(null);
              }}
              className="w-full text-[13px] text-muted file:mr-3 file:rounded-full file:border-0 file:bg-surface file:px-3 file:py-1 file:text-[13px] file:text-foreground"
            />
            {screenshot && (
              <p className="mt-1 text-[12px] text-muted">
                {screenshot.name} — will be compressed before upload
              </p>
            )}
          </div>

          {error && <p className="text-[13px] text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="min-h-[44px] w-full rounded-full bg-accent px-4 py-3 text-[15px] font-bold text-white transition-opacity active:opacity-90 disabled:opacity-50 sm:py-2.5 sm:hover:opacity-90"
          >
            {submitting ? "Submitting…" : "Submit feedback"}
          </button>
        </form>
      )}
    </ExpandableModal>
  );
}
