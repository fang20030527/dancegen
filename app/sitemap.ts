import type { MetadataRoute } from "next";

import { createSitemapEntry, sitemapRoutes } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapRoutes.map(createSitemapEntry);
}
