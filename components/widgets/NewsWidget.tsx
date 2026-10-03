"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { ExpandableModal } from "@/components/ui/ExpandableModal";
import { FeedAvatar, FeedRow, formatXMeta } from "@/components/ui/FeedRow";
import { FeedWidget, ShowMoreButton } from "@/components/ui/FeedWidget";
import { Skeleton } from "@/components/ui/Skeleton";
import { NewsPostMedia } from "@/components/widgets/NewsPostMedia";
import type { NewsItem } from "@/lib/types";

function formatNewsPreview(item: NewsItem): string {
  const summary = item.summary?.trim();
  if (summary) return summary;
  return item.title.trim();
}

interface NewsWidgetProps {
  sportSlug: string;
}

const NEWS_PAGE_SIZE = 3;

interface NewsPageResponse {
  items?: NewsItem[];
  total?: number;
  error?: string;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function NewsWidget({ sportSlug }: NewsWidgetProps) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<NewsItem | null>(null);
  const itemsRef = useRef<NewsItem[]>([]);
  const cursorRef = useRef(0);
  const requestSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const loadItems = useCallback(async (newOffset: number, append: boolean) => {
    const seq = ++requestSeq.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(
        `/api/news?sport=${encodeURIComponent(sportSlug)}&offset=${newOffset}&limit=${NEWS_PAGE_SIZE}`,
        { cache: "no-store", signal: controller.signal }
      );
      const data = (await res.json().catch(() => null)) as NewsPageResponse | null;
      if (seq !== requestSeq.current) return;

      if (!res.ok || !data || !Array.isArray(data.items) || data.error) {
        if (!append) {
          itemsRef.current = [];
          setItems([]);
          cursorRef.current = 0;
          setHasMore(false);
        }
        return;
      }

      const page = data.items;
      const current = append ? itemsRef.current : [];
      const seen = new Set(current.map((item) => item.id));
      const fresh = page.filter((item) => !seen.has(item.id));
      const nextItems = append ? (fresh.length > 0 ? [...current, ...fresh] : current) : page;
      itemsRef.current = nextItems;
      setItems(nextItems);

      const nextCursor = newOffset + page.length;
      cursorRef.current = nextCursor;

      const total = typeof data.total === "number" && Number.isFinite(data.total) ? data.total : undefined;
      const reachedEnd =
        fresh.length === 0 ||
        page.length < NEWS_PAGE_SIZE ||
        (total != null && nextCursor >= total);
      setHasMore(!reachedEnd);
    } catch (error) {
      if (seq !== requestSeq.current || controller.signal.aborted || isAbortError(error)) return;
      if (!append) {
        itemsRef.current = [];
        setItems([]);
        cursorRef.current = 0;
        setHasMore(false);
      }
    }
  }, [sportSlug]);

  useEffect(() => {
    itemsRef.current = [];
    setItems([]);
    cursorRef.current = 0;
    setHasMore(false);
    setLoading(true);
    let active = true;
    loadItems(0, false).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, [loadItems]);

  const handleShowMore = async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await loadItems(cursorRef.current, true);
    } finally {
      setLoadingMore(false);
    }
  };

  const openDetail = async (item: NewsItem) => {
    setSelected(item);
    setDetail(item);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/news?sport=${encodeURIComponent(sportSlug)}&id=${encodeURIComponent(item.id)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as NewsItem | { error?: string };
      if (!data || typeof data !== "object" || !("id" in data) || "error" in data) return;
      setDetail(data);
    } catch {
      // Keep the row already shown in the modal.
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <FeedWidget
        className="h-full"
        title="News"
        footer={
          <ShowMoreButton
            onClick={handleShowMore}
            loading={loadingMore}
            disabled={!loading && !hasMore}
          />
        }
      >
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex min-h-[7rem] flex-1 gap-3 px-4 py-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-[15px] text-muted">
            No news right now. Check back soon.
          </p>
        ) : (
          items.map((item) => (
            <FeedRow
              key={item.id}
              avatar={
                <FeedAvatar
                  src={item.xAvatar}
                  alt={item.xName}
                  fallback={item.xName[0]}
                />
              }
              displayName={item.xName}
              handle={item.xHandle}
              verified={item.verified}
              content={formatNewsPreview(item)}
              meta={formatXMeta(item.xHandle, item.publishedAt)}
              mediaUrl={item.imageUrl}
              mediaIsVideo={Boolean(item.videoUrl)}
              onClick={() => openDetail(item)}
            />
          ))
        )}
      </FeedWidget>

      <ExpandableModal
        open={!!selected}
        onClose={() => {
          setSelected(null);
          setDetail(null);
        }}
        title={detail?.title ?? "News"}
      >
        {detail ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FeedAvatar src={detail.xAvatar} alt={detail.xName} fallback={detail.xName[0]} />
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-bold">{detail.xName}</span>
                  {detail.verified && (
                    <BadgeCheck className="h-4 w-4 fill-link text-background" />
                  )}
                  <span className="text-muted">@{detail.xHandle}</span>
                </div>
                <p className="text-[13px] text-muted">
                  {new Date(detail.publishedAt).toLocaleString()}
                </p>
              </div>
            </div>
            <NewsPostMedia
              imageUrl={detail.imageUrl}
              videoUrl={detail.videoUrl}
              videoKind={detail.videoKind}
            />
            {detailLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : (
              <p className="text-[15px] leading-relaxed">{detail.summary}</p>
            )}
            <div className="flex flex-wrap gap-3">
              <a
                href={detail.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15px] text-link hover:underline"
              >
                Read full story →
              </a>
              <a
                href={detail.xProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[15px] text-link hover:underline"
              >
                View @{detail.xHandle} on X →
              </a>
            </div>
          </div>
        ) : detailLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : null}
      </ExpandableModal>
    </>
  );
}
