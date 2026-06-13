"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ExpandableModal } from "@/components/ui/ExpandableModal";
import { FeedAvatar, FeedMeta, FeedRow } from "@/components/ui/FeedRow";
import { FeedWidget, ShowMoreButton } from "@/components/ui/FeedWidget";
import { Skeleton } from "@/components/ui/Skeleton";
import type { NewsItem } from "@/lib/types";

const SOURCE_EMOJI: Record<string, string> = {
  "Google News": "📰",
  "The Guardian": "🛡️",
  "BBC Sport": "📻",
};

export function NewsWidget() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<NewsItem | null>(null);

  const loadItems = useCallback(async (newOffset: number, append: boolean) => {
    const res = await fetch(`/api/news?offset=${newOffset}&limit=3`);
    const data = (await res.json()) as { items: NewsItem[] };
    setItems((prev) => (append ? [...prev, ...data.items] : data.items));
  }, []);

  useEffect(() => {
    loadItems(0, false).finally(() => setLoading(false));
  }, [loadItems]);

  const handleShowMore = async () => {
    setLoadingMore(true);
    const next = offset + 3;
    await loadItems(next, true);
    setOffset(next);
    setLoadingMore(false);
  };

  const openDetail = async (item: NewsItem) => {
    setSelected(item);
    setDetail(item);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/news?id=${encodeURIComponent(item.id)}`);
      if (res.ok) {
        const data = (await res.json()) as NewsItem;
        setDetail(data);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <FeedWidget
        title="News"
        footer={<ShowMoreButton onClick={handleShowMore} loading={loadingMore} />}
      >
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-[15px] text-muted">No news available right now.</p>
        ) : (
          items.map((item) => (
            <FeedRow
              key={item.id}
              avatar={
                <FeedAvatar
                  src={item.imageUrl}
                  alt={item.source}
                  fallback={SOURCE_EMOJI[item.source] ?? "📰"}
                />
              }
              title={item.source}
              subtitle={item.title}
              meta={FeedMeta({ source: item.source, time: item.publishedAt })}
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
        {detailLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            {detail.imageUrl && (
              <Image
                src={detail.imageUrl}
                alt=""
                width={560}
                height={315}
                className="w-full rounded-xl object-cover"
                unoptimized
              />
            )}
            <p className="text-[15px] leading-relaxed">{detail.summary}</p>
            <p className="text-[13px] text-muted">
              {detail.source} · {new Date(detail.publishedAt).toLocaleString()}
            </p>
            <a
              href={detail.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-[15px] text-accent hover:underline"
            >
              Read full article →
            </a>
          </div>
        ) : null}
      </ExpandableModal>
    </>
  );
}
