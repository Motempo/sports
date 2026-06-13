"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { compressBugScreenshot } from "@/lib/compressBugScreenshot";
import { cn } from "@/lib/utils";
import { ImagePlus, Loader2, MessageSquarePlus, Sparkles, X } from "lucide-react";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
const ACCEPTED_INPUT = ACCEPTED_TYPES.join(",");

type AcceptedMime = (typeof ACCEPTED_TYPES)[number];

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
  if (/github|GITHUB_(?:TOKEN|BUG_REPO)/i.test(trimmed)) {
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
    return "Your feedback is too large. Try without a screenshot or use a smaller image.";
  }
  if (res.status === 503) {
    return "Submit feedback is temporarily unavailable. Please try again in a few minutes.";
  }
  return fallback;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function BugReportDialog({ open, onOpenChange }: Props) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImproving, setIsImproving] = useState(false);

  const resetForm = useCallback(() => {
    setDescription("");
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [imagePreview]);

  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open, resetForm]);

  const contextPayload = () => ({
    pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  });

  const busy = isSubmitting || isImproving || isCompressing;

  const applyImageFile = useCallback(
    async (file: File) => {
      if (!ACCEPTED_TYPES.includes(file.type as AcceptedMime)) {
        toast({
          variant: "destructive",
          title: "Invalid image",
          description: "Use PNG, JPEG, or WebP.",
        });
        return;
      }

      setIsCompressing(true);
      try {
        const compressed = await compressBugScreenshot(file);
        if (imagePreview) URL.revokeObjectURL(imagePreview);
        setImageFile(compressed);
        setImagePreview(URL.createObjectURL(compressed));
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Could not use image",
          description: e instanceof Error ? e.message : "Try a smaller screenshot.",
        });
      } finally {
        setIsCompressing(false);
      }
    },
    [imagePreview, toast]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void applyImageFile(file);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!busy) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) void applyImageFile(file);
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
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

      const result = (await res.json()) as { improvedText: string };
      setDescription(result.improvedText);
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
    if (imageFile) {
      try {
        screenshotBase64 = await readFileAsBase64(imageFile);
      } catch {
        toast({
          variant: "destructive",
          title: "Could not read screenshot",
          description: "Try another image or submit without one.",
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
          ...contextPayload(),
          screenshotBase64,
          screenshotMimeType: imageFile ? "image/jpeg" : undefined,
          screenshotFilename: imageFile?.name,
        }),
      });

      if (!res.ok) {
        throw new Error(await apiErrorMessage(res, "We couldn't send your feedback. Please try again later."));
      }

      toast({
        title: "Thank you for your feedback!",
        description: "We've received your message and will follow up as soon as we can.",
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
            <Label htmlFor="feedback-description">Your feedback</Label>
            <Textarea
              id="feedback-description"
              placeholder="What's working well, what's confusing, or what you'd like to see improved..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={8}
              disabled={busy}
              className="min-h-[140px] resize-y"
            />
          </div>

          <div className="space-y-2">
            <Label>Screenshot (optional)</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_INPUT}
              className="hidden"
              onChange={handleFileChange}
              disabled={busy}
            />
            {imagePreview ? (
              <div
                className="relative overflow-hidden rounded-lg border border-border bg-secondary/30"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <img
                  src={imagePreview}
                  alt="Screenshot preview"
                  className="max-h-40 w-full object-contain"
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8"
                  onClick={clearImage}
                  disabled={busy}
                  aria-label="Remove screenshot"
                >
                  <X className="h-4 w-4" />
                </Button>
                <p className="border-t border-border/50 px-2 py-1 text-[10px] text-muted-foreground">
                  Drop a new image here to replace
                </p>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                  "flex w-full flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 transition-colors",
                  "text-muted-foreground hover:border-primary/50 hover:bg-secondary/40 hover:text-foreground",
                  isDragging && "border-primary bg-primary/10 text-foreground",
                  busy && "pointer-events-none opacity-50"
                )}
              >
                {isCompressing ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <ImagePlus className="h-8 w-8" />
                )}
                <span className="text-sm font-medium">
                  {isDragging ? "Drop screenshot here" : "Drag and drop a screenshot"}
                </span>
                <span className="text-xs">or click to browse (PNG, JPEG, WebP)</span>
              </button>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
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
          <Button type="button" onClick={handleSubmit} disabled={busy || !description.trim()}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
