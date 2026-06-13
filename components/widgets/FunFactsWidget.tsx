"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { BadgeCheck } from "lucide-react";
import { ExpandableModal } from "@/components/ui/ExpandableModal";
import { FeedAvatar, FeedRow, formatXMeta } from "@/components/ui/FeedRow";
import { FeedWidget, ShowMoreButton } from "@/components/ui/FeedWidget";
import { Skeleton } from "@/components/ui/Skeleton";
import { getFactSourceAvatar } from "@/lib/facts";
import type { FunFact } from "@/lib/types";

export function FunFactsWidget() {
  const [items, setItems] = useState<FunFact[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<FunFact | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<FunFact | null>(null);

  const loadItems = useCallback(async (newOffset: number) => {
    const res = await fetch(`/api/facts?offset=${newOffset}&limit=3`);
    const data = (await res.json()) as { items: FunFact[] };
    setItems(data.items);
  }, []);

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

  const openDetail = async (fact: FunFact) => {
    setSelected(fact);
    setDetail(fact);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/facts?id=${encodeURIComponent(fact.id)}`);
      if (res.ok) {
        const data = (await res.json()) as FunFact;
        setDetail(data);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <FeedWidget
        title="Fun Facts on X"
        footer={<ShowMoreButton onClick={handleShowMore} loading={loadingMore} />}
      >
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 px-4 py-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))
        ) : (
          items.map((fact) => (
            <FeedRow
              key={fact.id}
              avatar={
                <FeedAvatar
                  src={getFactSourceAvatar(fact.sourceHandle)}
                  alt={fact.sourceName ?? fact.sourceHandle}
                  fallback={fact.emoji}
                />
              }
              displayName={fact.sourceName ?? fact.sourceHandle}
              handle={fact.sourceHandle}
              verified={fact.verified}
              content={`${fact.title} — ${fact.summary}`}
              meta={fact.category}
              onClick={() => openDetail(fact)}
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
        title={detail?.title ?? "Fun Fact"}
      >
        {detailLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FeedAvatar
                src={getFactSourceAvatar(detail.sourceHandle)}
                alt={detail.sourceName ?? detail.sourceHandle}
                fallback={detail.emoji}
              />
              <div>
                <div className="flex items-center gap-1">
                  <span className="font-bold">{detail.sourceName ?? detail.sourceHandle}</span>
                  {detail.verified && (
                    <BadgeCheck className="h-4 w-4 fill-link text-background" />
                  )}
                  <span className="text-muted">@{detail.sourceHandle}</span>
                </div>
                <p className="text-[13px] text-muted">{detail.category}</p>
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
            <p className="text-[15px] leading-relaxed">{detail.detail}</p>
            {detail.xProfileUrl && (
              <a
                href={detail.xProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[15px] text-link hover:underline"
              >
                Follow @{detail.sourceHandle} on X →
              </a>
            )}
          </div>
        ) : null}
      </ExpandableModal>
    </>
  );
}
