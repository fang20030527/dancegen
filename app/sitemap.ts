import type { MetadataRoute } from "next";

const routes = ["/", "/ai-dance-generator", "/ai-twerk-generator", "/pricing", "/terms", "/privacy", "/refund-policy"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: `https://dancegen.ai${route}`,
    lastModified: new Date(),
  }));
}
