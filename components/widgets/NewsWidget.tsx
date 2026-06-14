"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { BadgeCheck } from "lucide-react";
import { ExpandableModal } from "@/components/ui/ExpandableModal";
import { FeedAvatar, FeedRow, formatXMeta } from "@/components/ui/FeedRow";
import { FeedWidget, ShowMoreButton } from "@/components/ui/FeedWidget";
import { Skeleton } from "@/components/ui/Skeleton";
import type { NewsItem } from "@/lib/types";

function formatNewsPreview(item: NewsItem): string {
  const summary = item.summary?.trim();
  if (summary) return summary;
  return item.title.trim();
}

interface NewsWidgetProps {
  sportSlug: string;
}

export function NewsWidget({ sportSlug }: NewsWidgetProps) {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<NewsItem | null>(null);

  const loadItems = useCallback(async (newOffset: number) => {
    const res = await fetch(`/api/news?sport=${encodeURIComponent(sportSlug)}&offset=${newOffset}&limit=3`);
    const data = (await res.json()) as { items: NewsItem[] };
    setItems(data.items);
  }, [sportSlug]);

  useEffect(() => {
    loadItems(0).finally(() => setLoading(false));
  }, [loadItems]);

  const handleShowMore = async () => {
    setLoadingMore(true);
    const next = offset + 3;
    await loadItems(next);
    setOffset(next);
    setLoadingMore(false);
  };

  const openDetail = async (item: NewsItem) => {
    setSelected(item);
    setDetail(item);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/news?sport=${encodeURIComponent(sportSlug)}&id=${encodeURIComponent(item.id)}`);
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
        className="h-full"
        title="News"
        footer={<ShowMoreButton onClick={handleShowMore} loading={loadingMore} />}
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
        ) : null}
      </ExpandableModal>
    </>
  );
}
