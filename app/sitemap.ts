import type { MetadataRoute } from "next";
import { getSportSitemapEntries, SITE_URL } from "@/lib/sports";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...getSportSitemapEntries(),
  ];
}
