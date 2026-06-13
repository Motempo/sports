"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ExpandableModal } from "@/components/ui/ExpandableModal";
import { FeedAvatar, FeedRow } from "@/components/ui/FeedRow";
import { FeedWidget, ShowMoreButton } from "@/components/ui/FeedWidget";
import { Skeleton } from "@/components/ui/Skeleton";
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
        title="Fun Facts"
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
              avatar={<FeedAvatar alt={fact.category} fallback={fact.emoji} />}
              title={fact.title}
              subtitle={fact.summary}
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
            <p className="text-[13px] font-medium text-accent">{detail.category}</p>
            <p className="text-[15px] leading-relaxed">{detail.detail}</p>
          </div>
        ) : null}
      </ExpandableModal>
    </>
  );
}
