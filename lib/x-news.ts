import "server-only";

import { uncachedFetch } from "@/lib/fetch-options";
import {
  getNewsKeywordPattern,
  getSourceByHandle,
  getSportSourceConfigOrThrow,
  interleavePersonOrgMix,
} from "@/lib/sport-sources";
import type { NewsItem } from "@/lib/types";

const APIXAPI_BASE = "https://api.apitwitter.com";

/** Ticket MOT-48 calls this APIXAPI; ApiTwitter keys also accepted. */
export function getApixApiKey(): string | undefined {
  const key =
    process.env.APIXAPI_KEY?.trim() ||
    process.env.APITWITTER_API_KEY?.trim() ||
    process.env.API_TWITTER_KEY?.trim();
  return key || undefined;
}

export function isApixApiConfigured(): boolean {
  return Boolean(getApixApiKey());
}

interface ApixTweet {
  id?: string;
  text?: string;
  createdAt?: string;
  created_at?: string;
  url?: string;
  media?: Array<{ type?: string; url?: string; preview_image_url?: string }>;
  entities?: {
    media?: Array<{ type?: string; media_url_https?: string; url?: string }>;
    urls?: Array<{ expanded_url?: string; url?: string }>;
  };
  author?: {
    userName?: string;
    name?: string;
    profilePicture?: string;
  };
}

interface ApixTweetsResponse {
  status?: string;
  data?: {
    tweets?: ApixTweet[];
  };
  tweets?: ApixTweet[];
}

function tweetText(tweet: ApixTweet): string {
  return (tweet.text ?? "").replace(/\s+/g, " ").trim();
}

function tweetDate(tweet: ApixTweet): string {
  const raw = tweet.createdAt ?? tweet.created_at;
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function tweetUrl(tweet: ApixTweet, handle: string): string {
  if (tweet.url && /^https?:\/\//i.test(tweet.url)) return tweet.url;
  if (tweet.id) return `https://x.com/${handle}/status/${tweet.id}`;
  return `https://x.com/${handle}`;
}

function tweetMedia(tweet: ApixTweet): { imageUrl?: string; videoUrl?: string } {
  const media = tweet.media ?? [];
  for (const item of media) {
    if (item.type === "video" || item.type === "animated_gif") {
      return {
        videoUrl: item.url,
        imageUrl: item.preview_image_url ?? item.url,
      };
    }
  }
  for (const item of media) {
    if (item.url || item.preview_image_url) {
      return { imageUrl: item.preview_image_url ?? item.url };
    }
  }
  const entities = tweet.entities?.media ?? [];
  for (const item of entities) {
    if (item.media_url_https) return { imageUrl: item.media_url_https };
  }
  return {};
}

function tweetToNewsItem(
  tweet: ApixTweet,
  sportSlug: string,
  handle: string,
  keywordPattern: RegExp
): NewsItem | null {
  const text = tweetText(tweet);
  if (!text) return null;

  // Official paddock accounts are always in-scope for F1; others need a keyword hit.
  const officialF1 = /^(f1|fia|mercedesamgf1|scuderiaferrari|redbullracing|mclarenf1|astonmartinf1|alpinef1team|williamsracing|haasf1team)$/i.test(
    handle
  );
  if (!(officialF1 && sportSlug === "formula-1") && !keywordPattern.test(text)) {
    return null;
  }

  const source = getSourceByHandle(sportSlug, handle);
  const name = source?.name ?? handle;
  const media = tweetMedia(tweet);
  const title = text.length > 120 ? `${text.slice(0, 117).trim()}…` : text;

  return {
    id: `${sportSlug}-x-${handle}-${tweet.id ?? title.slice(0, 24)}`,
    title,
    summary: text.slice(0, 280),
    source: name,
    publishedAt: tweetDate(tweet),
    url: tweetUrl(tweet, handle),
    imageUrl: media.imageUrl,
    videoUrl: media.videoUrl,
    videoKind: media.videoUrl ? "file" : undefined,
    xHandle: handle,
    xName: name,
    xAvatar: source?.avatarUrl ?? `https://unavatar.io/x/${handle}`,
    xProfileUrl: source?.profileUrl ?? `https://x.com/${handle}`,
    verified: source?.verified ?? false,
  };
}

async function fetchHandleTweets(
  handle: string,
  apiKey: string,
  sportSlug: string,
  keywordPattern: RegExp
): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      `${APIXAPI_BASE}/twitter/user/${encodeURIComponent(handle)}/tweets`,
      {
        ...uncachedFetch,
        headers: {
          "X-API-Key": apiKey,
          Accept: "application/json",
          "User-Agent": "Sports-by-Motempo/1.0",
        },
        signal: AbortSignal.timeout(12_000),
      }
    );
    if (!res.ok) return [];
    const body = (await res.json()) as ApixTweetsResponse;
    const tweets = body.data?.tweets ?? body.tweets ?? [];
    return tweets
      .map((tweet) => tweetToNewsItem(tweet, sportSlug, handle, keywordPattern))
      .filter((item): item is NewsItem => Boolean(item));
  } catch {
    return [];
  }
}

/**
 * Pull news directly from X timelines via APIXAPI / ApiTwitter (MOT-48).
 * Returns null when the key is missing so callers can fall back to RSS.
 */
export async function fetchNewsItemsFromX(sportSlug: string): Promise<NewsItem[] | null> {
  const apiKey = getApixApiKey();
  if (!apiKey) return null;

  const config = getSportSourceConfigOrThrow(sportSlug);
  const keywordPattern = getNewsKeywordPattern(sportSlug);
  // Cap handles to control credit spend; prefer ranked newsHandles order.
  const handles = config.newsHandles.slice(0, 12);

  const batches = await Promise.all(
    handles.map((handle) => fetchHandleTweets(handle, apiKey, sportSlug, keywordPattern))
  );
  const all = batches.flat();
  const deduped = all
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id || x.title === item.title) === idx);

  return interleavePersonOrgMix(deduped, sportSlug, (item) => item.xHandle);
}
