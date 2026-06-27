import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/ai-dance-generator", "/ai-twerk-generator", "/pricing", "/terms", "/privacy", "/refund-policy"],
        disallow: ["/admin", "/api"],
      },
    ],
    sitemap: "https://dancegen.ai/sitemap.xml",
  };
}
