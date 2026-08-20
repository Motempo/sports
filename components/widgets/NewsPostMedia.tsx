"use client";

import Image from "next/image";
import {
  vimeoEmbedUrl,
  vimeoVideoId,
  youtubeEmbedUrl,
  youtubeVideoId,
} from "@/lib/news-media";
import type { NewsItem } from "@/lib/types";

export function NewsPostMedia({
  imageUrl,
  videoUrl,
  videoKind,
}: Pick<NewsItem, "imageUrl" | "videoUrl" | "videoKind">) {
  const youtubeId = videoUrl ? youtubeVideoId(videoUrl) : undefined;
  const vimeoId = videoUrl ? vimeoVideoId(videoUrl) : undefined;

  if (videoKind === "youtube" && youtubeId) {
    return (
      <iframe
        src={youtubeEmbedUrl(youtubeId)}
        title="Video"
        className="aspect-video w-full rounded-xl"
        allow="encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  }

  if (videoKind === "vimeo" && vimeoId) {
    return (
      <iframe
        src={vimeoEmbedUrl(vimeoId)}
        title="Video"
        className="aspect-video w-full rounded-xl"
        allow="encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
      />
    );
  }

  if (videoKind === "file" && videoUrl) {
    return (
      <video
        src={videoUrl}
        controls
        playsInline
        preload="metadata"
        poster={imageUrl}
        className="w-full rounded-xl"
      />
    );
  }

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt=""
        width={560}
        height={315}
        className="w-full rounded-xl object-cover"
        unoptimized
      />
    );
  }

  return null;
}
