import type { NewsVideoKind } from "@/lib/types";

export type { NewsVideoKind };

export interface NewsMedia {
  imageUrl?: string;
  videoUrl?: string;
  videoKind?: NewsVideoKind;
}

const YOUTUBE_ID = /^[a-zA-Z0-9_-]{11}$/;
const VIMEO_ID = /^\d+$/;
const IMAGE_EXT = /\.(?:jpe?g|png|webp|gif|avif)(?:$|\?)/i;
const VIDEO_EXT = /\.(?:mp4|webm|ogg|m3u8)(?:$|\?)/i;

const SKIP_IMAGE_HOST_SNIPPETS = [
  "news.google.com",
  "doubleclick.net",
  "googletagmanager.com",
  "google-analytics.com",
  "scorecardresearch.com",
  "facebook.com/tr",
];

const GOOGLE_NEWS_LOGO =
  "lh3.googleusercontent.com/J6_coFbogxhRI9iM864NL_liGXvsQp2AupsKei7z0cNNfDvGUmWUy20nuUhkREQyrpY4bEeIBuc";

export function isGoogleNewsUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host === "news.google.com";
  } catch {
    return false;
  }
}

export function isSafeHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (!host || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
      return false;
    }
    if (host === "0.0.0.0" || host === "::1" || host === "[::1]") return false;
    if (/^(127|10|0)\./.test(host) || host.startsWith("192.168.") || host.startsWith("169.254.")) {
      return false;
    }
    if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

export function youtubeVideoId(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id && YOUTUBE_ID.test(id) ? id : undefined;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const fromQuery = parsed.searchParams.get("v");
      if (fromQuery && YOUTUBE_ID.test(fromQuery)) return fromQuery;
      const match = parsed.pathname.match(/^\/(?:embed|v|shorts|live)\/([a-zA-Z0-9_-]{11})/);
      return match?.[1];
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function vimeoVideoId(url: string): string | undefined {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host !== "vimeo.com" && host !== "player.vimeo.com") return undefined;
    const parts = parsed.pathname.split("/").filter(Boolean);
    const id = host === "player.vimeo.com" && parts[0] === "video" ? parts[1] : parts[0];
    return id && VIMEO_ID.test(id) ? id : undefined;
  } catch {
    return undefined;
  }
}

export function youtubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export function youtubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}`;
}

export function vimeoEmbedUrl(videoId: string): string {
  return `https://player.vimeo.com/video/${videoId}`;
}

function skipImageUrl(url: string): boolean {
  const lower = url.toLowerCase();
  if (lower.includes(GOOGLE_NEWS_LOGO.toLowerCase())) return true;
  if (SKIP_IMAGE_HOST_SNIPPETS.some((snippet) => lower.includes(snippet))) return true;
  if (lower.includes("1x1") || lower.includes("pixel") || lower.includes("spacer")) return true;
  return !isSafeHttpUrl(url);
}

interface RankedUrl {
  url: string;
  width: number;
}

function considerImage(url: string | undefined, width: number, bucket: RankedUrl[]) {
  if (!url || skipImageUrl(url)) return;
  if (IMAGE_EXT.test(url) || url.startsWith("http")) {
    bucket.push({ url, width });
  }
}

function classifyVideo(url: string, type?: string): { url: string; kind: NewsVideoKind } | undefined {
  if (!isSafeHttpUrl(url)) return undefined;
  const youtubeId = youtubeVideoId(url);
  if (youtubeId) return { url: `https://www.youtube.com/watch?v=${youtubeId}`, kind: "youtube" };
  const vimeoId = vimeoVideoId(url);
  if (vimeoId) return { url: `https://vimeo.com/${vimeoId}`, kind: "vimeo" };
  const mime = type?.toLowerCase() ?? "";
  if (mime.startsWith("video/") || VIDEO_EXT.test(url)) {
    if (mime.includes("flash") || mime.includes("shockwave")) return undefined;
    return { url, kind: "file" };
  }
  return undefined;
}

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function attr(node: unknown, key: string): string | undefined {
  if (!node || typeof node !== "object") return undefined;
  const record = node as Record<string, unknown>;
  const prefixed = record[`@_${key}`];
  const raw = record[key];
  if (typeof prefixed === "string" && prefixed.trim()) return prefixed.trim();
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (typeof prefixed === "number") return String(prefixed);
  if (typeof raw === "number") return String(raw);
  return undefined;
}

function collectMediaNodes(item: Record<string, unknown>): unknown[] {
  const nodes: unknown[] = [];
  const groups = asArray(item["media:group"]).filter((group) => group && typeof group === "object");
  const roots: Record<string, unknown>[] = [item, ...(groups as Record<string, unknown>[])];
  for (const root of roots) {
    nodes.push(...asArray(root["media:content"]));
    nodes.push(...asArray(root["media:thumbnail"]));
    nodes.push(...asArray(root["media:player"]));
    nodes.push(...asArray(root.enclosure));
  }
  return nodes;
}

function extractHtmlMedia(html: string): string[] {
  const decoded = html
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
  const urls: string[] = [];
  const imgRe = /<img\b[^>]*\bsrc=["']([^"']+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = imgRe.exec(decoded))) {
    urls.push(match[1]!);
  }
  const iframeRe = /<iframe\b[^>]*\bsrc=["']([^"']+)["']/gi;
  while ((match = iframeRe.exec(decoded))) {
    urls.push(match[1]!);
  }
  return urls;
}

function htmlFields(item: Record<string, unknown>): string[] {
  const fields = [item.description, item.summary, item["content:encoded"], item.content];
  return fields.flatMap((field) => {
    if (typeof field === "string") return [field];
    if (field && typeof field === "object" && "#text" in field) {
      const text = (field as { "#text"?: unknown })["#text"];
      return typeof text === "string" ? [text] : [];
    }
    return [];
  });
}

/** Pull image/video URLs from a parsed RSS or Atom item. */
export function extractRssMedia(item: unknown): NewsMedia {
  if (!item || typeof item !== "object") return {};

  const record = item as Record<string, unknown>;
  const images: RankedUrl[] = [];
  let video: { url: string; kind: NewsVideoKind } | undefined;

  const ytId = typeof record["yt:videoId"] === "string" ? record["yt:videoId"] : undefined;
  if (ytId && YOUTUBE_ID.test(ytId)) {
    video = { url: `https://www.youtube.com/watch?v=${ytId}`, kind: "youtube" };
    considerImage(youtubeThumbnailUrl(ytId), 480, images);
  }

  for (const node of collectMediaNodes(record)) {
    const url = attr(node, "url") ?? attr(node, "href");
    if (!url) continue;
    const type = attr(node, "type")?.toLowerCase();
    const medium = attr(node, "medium")?.toLowerCase();
    const width = Number.parseInt(attr(node, "width") ?? "0", 10) || 0;
    const height = Number.parseInt(attr(node, "height") ?? "0", 10) || 0;
    if ((width > 0 && width <= 2) || (height > 0 && height <= 2)) continue;

    const classified = classifyVideo(url, type);
    const isVideoHint =
      Boolean(classified) &&
      (medium?.startsWith("video") ||
        type?.startsWith("video/") ||
        classified?.kind !== "file" ||
        VIDEO_EXT.test(url));
    if (classified && isVideoHint) {
      if (!video || classified.kind !== "file") video = classified;
      continue;
    }
    if (medium?.startsWith("image") || type?.startsWith("image/") || IMAGE_EXT.test(url)) {
      considerImage(url, width, images);
    } else if (!type && !medium) {
      const maybeVideo = classifyVideo(url);
      if (maybeVideo && maybeVideo.kind !== "file") {
        video ??= maybeVideo;
      } else {
        considerImage(url, width, images);
      }
    }
  }

  for (const html of htmlFields(record)) {
    for (const url of extractHtmlMedia(html)) {
      const classified = classifyVideo(url);
      if (classified && classified.kind !== "file") {
        video ??= classified;
        continue;
      }
      considerImage(url, 0, images);
    }
  }

  images.sort((a, b) => b.width - a.width);
  const imageUrl = images[0]?.url;
  if (video?.kind === "youtube") {
    const id = youtubeVideoId(video.url);
    if (id && !imageUrl) considerImage(youtubeThumbnailUrl(id), 480, images);
  }

  return {
    imageUrl: images.sort((a, b) => b.width - a.width)[0]?.url,
    videoUrl: video?.url,
    videoKind: video?.kind,
  };
}

export function parseMetaTagContent(html: string, names: string[]): string | undefined {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(
        `<meta\\b[^>]*(?:property|name|itemprop)=["']${escaped}["'][^>]*content=["']([^"']+)["'][^>]*>`,
        "i"
      ),
      new RegExp(
        `<meta\\b[^>]*content=["']([^"']+)["'][^>]*(?:property|name|itemprop)=["']${escaped}["'][^>]*>`,
        "i"
      ),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return decodeHtmlEntities(match[1]);
    }
  }
  return undefined;
}

export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function scrapeMediaFromHtml(html: string): NewsMedia {
  const imageUrl =
    parseMetaTagContent(html, ["og:image", "og:image:url", "twitter:image", "twitter:image:src"]) ??
    undefined;
  const videoRaw =
    parseMetaTagContent(html, ["og:video", "og:video:url", "og:video:secure_url", "twitter:player", "twitter:player:stream"]) ??
    undefined;

  let video: { url: string; kind: NewsVideoKind } | undefined;
  if (videoRaw) video = classifyVideo(videoRaw);

  const jsonLdBlocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const block of jsonLdBlocks) {
    const text = block[1] ?? "";
    if (!video) {
      const embed = text.match(/"(?:embedUrl|contentUrl)"\s*:\s*"([^"]+)"/i)?.[1];
      if (embed) video = classifyVideo(decodeHtmlEntities(embed));
    }
    if (!imageUrl) {
      const thumb = text.match(/"(?:thumbnailUrl|image)"\s*:\s*"([^"]+)"/i)?.[1];
      if (thumb && !skipImageUrl(decodeHtmlEntities(thumb))) {
        return {
          imageUrl: decodeHtmlEntities(thumb),
          videoUrl: video?.url,
          videoKind: video?.kind,
        };
      }
    }
  }

  const safeImage = imageUrl && !skipImageUrl(imageUrl) ? imageUrl : undefined;
  if (!safeImage && video?.kind === "youtube") {
    const id = youtubeVideoId(video.url);
    return {
      imageUrl: id ? youtubeThumbnailUrl(id) : undefined,
      videoUrl: video.url,
      videoKind: video.kind,
    };
  }

  return {
    imageUrl: safeImage,
    videoUrl: video?.url,
    videoKind: video?.kind,
  };
}
