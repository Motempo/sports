"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { BadgeCheck } from "lucide-react";
import { ExpandableModal } from "@/components/ui/ExpandableModal";
import { FeedAvatar, FeedRow } from "@/components/ui/FeedRow";
import { FeedWidget, ShowMoreButton } from "@/components/ui/FeedWidget";
import { Skeleton } from "@/components/ui/Skeleton";
import { getFactSourceAvatar } from "@/lib/facts";
import type { FunFact } from "@/lib/types";

interface FunFactsWidgetProps {
  sportSlug: string;
}

interface FactsPageResponse {
  items?: FunFact[];
  nextOffset?: number;
  wrapped?: boolean;
  total?: number;
  error?: string;
}

const FACTS_PAGE_SIZE = 3;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function seenStorageKey(sportSlug: string): string {
  return `motempo-facts-seen:${sportSlug}`;
}

function loadSeenIds(sportSlug: string): string[] {
  try {
    const raw = localStorage.getItem(seenStorageKey(sportSlug));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function saveSeenIds(sportSlug: string, ids: string[]) {
  try {
    localStorage.setItem(seenStorageKey(sportSlug), JSON.stringify(ids));
  } catch {
    // ignore quota / private mode
  }
}

export function FunFactsWidget({ sportSlug }: FunFactsWidgetProps) {
  const [items, setItems] = useState<FunFact[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selected, setSelected] = useState<FunFact | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<FunFact | null>(null);
  const itemsRef = useRef<FunFact[]>([]);
  const nextOffsetRef = useRef<number | undefined>(undefined);
  const requestSeq = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const loadItems = useCallback(
    async (offset: number | undefined, seen: string[], append: boolean) => {
      const seq = ++requestSeq.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const params = new URLSearchParams({
          sport: sportSlug,
          limit: String(FACTS_PAGE_SIZE),
        });
        if (offset != null) params.set("offset", String(offset));
        if (seen.length > 0) params.set("exclude", seen.join(","));

        const res = await fetch(`/api/facts?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = (await res.json().catch(() => null)) as FactsPageResponse | null;
        if (seq !== requestSeq.current) return;

        if (!res.ok || !data || !Array.isArray(data.items) || data.error) {
          if (!append) {
            itemsRef.current = [];
            setItems([]);
            nextOffsetRef.current = undefined;
            setHasMore(false);
          }
          return;
        }

        const page = data.items;
        const current = append ? itemsRef.current : [];
        const seenIds = new Set(current.map((fact) => fact.id));
        const fresh = page.filter((fact) => !seenIds.has(fact.id));
        const nextItems = append ? (fresh.length > 0 ? [...current, ...fresh] : current) : page;
        itemsRef.current = nextItems;
        setItems(nextItems);
        if (typeof data.nextOffset === "number") nextOffsetRef.current = data.nextOffset;

        const total = typeof data.total === "number" && Number.isFinite(data.total) ? data.total : undefined;
        const reachedEnd =
          fresh.length === 0 ||
          page.length < FACTS_PAGE_SIZE ||
          (total != null && nextItems.length >= total);
        setHasMore(nextItems.length > 0 && !reachedEnd);

        const freshIds = fresh.map((fact) => fact.id);
        if (!append && data.wrapped) {
          saveSeenIds(sportSlug, page.map((fact) => fact.id));
        } else {
          saveSeenIds(
            sportSlug,
            [...seen, ...freshIds].filter((id, i, all) => all.indexOf(id) === i)
          );
        }
      } catch (error) {
        if (seq !== requestSeq.current || controller.signal.aborted || isAbortError(error)) return;
        if (!append) {
          itemsRef.current = [];
          setItems([]);
          nextOffsetRef.current = undefined;
          setHasMore(false);
        }
      }
    },
    [sportSlug]
  );

  useEffect(() => {
    itemsRef.current = [];
    setItems([]);
    nextOffsetRef.current = undefined;
    setHasMore(false);
    setLoading(true);
    const seen = loadSeenIds(sportSlug);
    let active = true;
    loadItems(undefined, seen, false).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, [loadItems, sportSlug]);

  const handleShowMore = async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const seen = Array.from(
        new Set([...loadSeenIds(sportSlug), ...itemsRef.current.map((fact) => fact.id)])
      );
      await loadItems(nextOffsetRef.current, seen, true);
    } finally {
      setLoadingMore(false);
    }
  };

  const openDetail = async (fact: FunFact) => {
    setSelected(fact);
    setDetail(fact);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/facts?sport=${encodeURIComponent(sportSlug)}&id=${encodeURIComponent(fact.id)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as FunFact | { error?: string };
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
        title="Fun Facts"
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
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-[15px] text-muted">
            No fun facts right now. Check back soon.
          </p>
        ) : (
          items.map((fact) => (
            <FeedRow
              key={fact.id}
              avatar={
                <FeedAvatar
                  src={getFactSourceAvatar(sportSlug, fact.sourceHandle)}
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
                src={getFactSourceAvatar(sportSlug, detail.sourceHandle)}
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
                className="mx-auto max-h-48 w-auto rounded-xl object-contain"
                unoptimized
              />
            )}
            <p className="text-[15px] leading-relaxed">{detail.detail}</p>
            {detail.wikipediaTitle && (
              <a
                href={`https://en.wikipedia.org/wiki/${encodeURIComponent(detail.wikipediaTitle.replace(/ /g, "_"))}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[15px] text-link hover:underline"
              >
                Read more on Wikipedia →
              </a>
            )}
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
