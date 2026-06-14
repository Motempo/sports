"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  canPreviewAttachment,
  formatAttachmentSize,
  MAX_ATTACHMENT_BYTES,
  prepareFeedbackAttachment,
  resolveAttachmentMimeType,
} from "@/lib/feedback-attachment";
import type { InferredIntent } from "@/lib/feedback-context";
import { cn } from "@/lib/utils";
import { FileIcon, ImagePlus, Loader2, MessageSquarePlus, Sparkles, X } from "lucide-react";

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Could not read file"));
        return;
      }
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

function userFacingErrorText(message: string): string {
  const trimmed = message.trim();
  if (!trimmed || trimmed.startsWith("HTTP ")) return "";
  if (/linear|LINEAR_(?:API_KEY|TEAM)/i.test(trimmed)) {
    return "We couldn't send your feedback. Please try again later.";
  }
  return trimmed.length > 400 ? `${trimmed.slice(0, 400)}…` : trimmed;
}

async function apiErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string; error?: string };
    const friendly = userFacingErrorText(String(data.message ?? data.error ?? ""));
    if (friendly) return friendly;
  } catch {
    // ignore parse errors
  }

  if (res.status === 413) {
    return "Your feedback is too large. Try without an attachment or use a smaller file.";
  }
  if (res.status === 503) {
    return "Submit feedback is temporarily unavailable. Please try again in a few minutes.";
  }
  return fallback;
}

function hasFileDrag(dataTransfer: DataTransfer | null): boolean {
  return Boolean(dataTransfer?.types && Array.from(dataTransfer.types).includes("Files"));
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BugReportDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [description, setDescription] = useState("");
  const [inferredIntent, setInferredIntent] = useState<InferredIntent | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState<string | null>(null);
  const [isProcessingAttachment, setIsProcessingAttachment] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [improveAvailable, setImproveAvailable] = useState(false);
  const dragDepthRef = useRef(0);
  const applyAttachmentRef = useRef<(file: File) => Promise<void>>(async () => {});
  const busyRef = useRef(false);

  const resetForm = useCallback(() => {
    setDescription("");
    setInferredIntent(null);
    setAttachmentFile(null);
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    setAttachmentPreview(null);
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [attachmentPreview]);

  useEffect(() => {
    if (!open) {
      resetForm();
      return;
    }

    let cancelled = false;
    fetch("/api/feedback/improve")
      .then((res) => (res.ok ? res.json() : { available: false }))
      .then((data: { available?: boolean }) => {
        if (!cancelled) setImproveAvailable(Boolean(data.available));
      })
      .catch(() => {
        if (!cancelled) setImproveAvailable(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, resetForm]);

  const contextPayload = () => ({
    pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
  });

  const busy = isSubmitting || isImproving || isProcessingAttachment;

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    setInferredIntent(null);
  };

  const applyAttachmentFile = useCallback(
    async (file: File) => {
      setIsProcessingAttachment(true);
      try {
        const prepared = await prepareFeedbackAttachment(file);
        if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
        setAttachmentFile(prepared);
        setAttachmentPreview(
          canPreviewAttachment(prepared.type)
            ? URL.createObjectURL(prepared)
            : null
        );
        requestAnimationFrame(() => {
          const el = textareaRef.current;
          if (!el) return;
          el.focus();
          const end = el.value.length;
          el.setSelectionRange(end, end);
        });
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Could not use attachment",
          description: e instanceof Error ? e.message : "Try a smaller file.",
        });
      } finally {
        setIsProcessingAttachment(false);
      }
    },
    [attachmentPreview, toast]
  );

  applyAttachmentRef.current = applyAttachmentFile;
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return;

    const resetDragState = () => {
      dragDepthRef.current = 0;
      setIsDragging(false);
    };

    const onDragEnter = (e: DragEvent) => {
      if (!hasFileDrag(e.dataTransfer)) return;
      e.preventDefault();
      dragDepthRef.current += 1;
      if (!busyRef.current) setIsDragging(true);
    };

    const onDragLeave = (e: DragEvent) => {
      if (!hasFileDrag(e.dataTransfer)) return;
      e.preventDefault();
      dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
      if (dragDepthRef.current === 0) setIsDragging(false);
    };

    const onDragOver = (e: DragEvent) => {
      if (!hasFileDrag(e.dataTransfer)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    };

    const onDrop = (e: DragEvent) => {
      if (!hasFileDrag(e.dataTransfer)) return;
      e.preventDefault();
      resetDragState();
      if (busyRef.current) return;
      const file = e.dataTransfer?.files?.[0];
      if (file) void applyAttachmentRef.current(file);
    };

    const onDragEnd = () => {
      resetDragState();
    };

    window.addEventListener("dragenter", onDragEnter);
    window.addEventListener("dragleave", onDragLeave);
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragend", onDragEnd);

    return () => {
      window.removeEventListener("dragenter", onDragEnter);
      window.removeEventListener("dragleave", onDragLeave);
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragend", onDragEnd);
      resetDragState();
    };
  }, [open]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void applyAttachmentFile(file);
    e.target.value = "";
  };

  const clearAttachment = () => {
    setAttachmentFile(null);
    if (attachmentPreview) URL.revokeObjectURL(attachmentPreview);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImprove = async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      toast({
        variant: "destructive",
        title: "Add your feedback",
        description: "Write a few sentences before improving the text.",
      });
      return;
    }

    setIsImproving(true);
    try {
      const res = await fetch("/api/feedback/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: trimmed, ...contextPayload() }),
      });

      if (!res.ok) {
        throw new Error(await apiErrorMessage(res, "Could not improve your feedback right now. Try again or submit as-is."));
      }

      const result = (await res.json()) as {
        improvedText: string;
        intent?: InferredIntent | null;
      };
      setDescription(result.improvedText);
      setInferredIntent(result.intent ?? null);
      toast({ title: "Text improved", description: "Review and edit before submitting." });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not improve text",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    } finally {
      setIsImproving(false);
    }
  };

  const handleSubmit = async () => {
    const trimmed = description.trim();
    if (!trimmed) {
      toast({
        variant: "destructive",
        title: "Add your feedback",
        description: "Tell us what you'd like us to know.",
      });
      return;
    }

    let screenshotBase64: string | undefined;
    if (attachmentFile) {
      try {
        screenshotBase64 = await readFileAsBase64(attachmentFile);
      } catch {
        toast({
          variant: "destructive",
          title: "Could not read attachment",
          description: "Try another file or submit without one.",
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: trimmed,
          inferredIntent,
          ...contextPayload(),
          screenshotBase64,
          screenshotMimeType: attachmentFile
            ? resolveAttachmentMimeType(attachmentFile)
            : undefined,
          screenshotFilename: attachmentFile?.name,
        }),
      });

      if (!res.ok) {
        throw new Error(await apiErrorMessage(res, "We couldn't send your feedback. Please try again later."));
      }

      toast({
        title: "Thank you for your feedback",
      });
      onOpenChange(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Could not submit feedback",
        description: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
            Submit Feedback
          </DialogTitle>
          <DialogDescription>
            Share ideas, report a problem, or tell us what could work better. We read every submission.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="feedback-attachment">Attachment (optional)</Label>
            <input
              id="feedback-attachment"
              ref={fileInputRef}
              type="file"
              accept="*/*"
              className="sr-only"
              onChange={handleFileChange}
              disabled={busy}
            />
            {attachmentFile ? (
              <div className="relative overflow-hidden rounded-lg border border-border bg-secondary/30">
                {attachmentPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={attachmentPreview}
                    alt="Attachment preview"
                    className="max-h-40 w-full object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-3 px-4 py-6">
                    <FileIcon className="h-8 w-8 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{attachmentFile.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatAttachmentSize(attachmentFile.size)}
                      </p>
                    </div>
                  </div>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8"
                  onClick={clearAttachment}
                  disabled={busy}
                  aria-label="Remove attachment"
                >
                  <X className="h-4 w-4" />
                </Button>
                <label
                  htmlFor="feedback-attachment"
                  className={cn(
                    "block cursor-pointer border-t border-border/50 px-2 py-2 text-center text-[10px] text-muted-foreground",
                    busy && "pointer-events-none opacity-50"
                  )}
                >
                  Tap to replace attachment
                </label>
              </div>
            ) : (
              <label
                htmlFor="feedback-attachment"
                className={cn(
                  "flex w-full cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 transition-colors",
                  "text-muted-foreground hover:border-primary/50 hover:bg-secondary/40 hover:text-foreground",
                  isDragging && "border-primary bg-primary/10 text-foreground",
                  busy && "pointer-events-none opacity-50"
                )}
              >
                {isProcessingAttachment ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <ImagePlus className="h-8 w-8" />
                )}
                <span className="text-sm font-medium">
                  {isDragging ? "Drop anywhere to attach" : "Tap to add attachment"}
                </span>
                <span className="hidden text-xs sm:inline">
                  or drop a file anywhere on screen (up to {formatAttachmentSize(MAX_ATTACHMENT_BYTES)})
                </span>
                <span className="text-xs sm:hidden">Or drop anywhere on screen</span>
              </label>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-description">Your feedback</Label>
            <Textarea
              ref={textareaRef}
              id="feedback-description"
              placeholder="What's working well, what's confusing, or what you'd like to see improved..."
              value={description}
              onChange={(e) => handleDescriptionChange(e.target.value)}
              rows={8}
              disabled={busy}
              className="min-h-[140px] resize-y text-base leading-relaxed"
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          {improveAvailable && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleImprove}
              disabled={busy || !description.trim()}
            >
              {isImproving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Improve text
            </Button>
          )}
          <Button type="button" onClick={handleSubmit} disabled={busy || !description.trim()}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

      {open &&
        isDragging &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
            aria-hidden
          >
            <div className="pointer-events-none flex max-w-sm flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-primary bg-card px-8 py-7 text-center shadow-xl">
              <ImagePlus className="h-10 w-10 text-primary" />
              <p className="text-base font-semibold text-foreground">Drop to attach file</p>
              <p className="text-sm text-muted-foreground">
                Release anywhere on screen to add it to your feedback
              </p>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
