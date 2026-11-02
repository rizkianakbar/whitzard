import type { MetadataRoute } from "next";

import { appConfig } from "@/lib/config";

export default function sitemap(): MetadataRoute.Sitemap {
  const url = appConfig.siteUrl;
  return [
    {
      url,
      changeFrequency: "monthly",
      priority: 1,
      alternates: { languages: { en: `${url}/en`, id: `${url}/id` } },
    },
  ];
}
