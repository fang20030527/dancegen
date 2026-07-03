import type { MetadataRoute } from "next";

import { absoluteUrl, sitemapRoutes } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [...sitemapRoutes],
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
