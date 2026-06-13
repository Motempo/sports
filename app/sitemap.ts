import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://sports.motempo.com",
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
  ];
}
