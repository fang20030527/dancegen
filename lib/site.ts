import type { Metadata, MetadataRoute } from "next";

const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.danceclip.org";
const siteUrl = rawSiteUrl.replace(/\/+$/, "");
const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "feedback@danceclip.org.com";

export const siteConfig = {
  name: "DanceClip AI",
  url: siteUrl,
  abuseEmail: process.env.ABUSE_CONTACT_EMAIL || "abuse@danceclip.org",
  contactEmail,
  supportEmail: contactEmail,
  waitlistEmail: process.env.WAITLIST_EMAIL || "waitlist@danceclip.org",
  defaultTitle: "Free AI Dance Video Generator from Photo | DanceClip AI",
  description:
    "Turn one adult solo photo into a short AI dance video. Use DanceClip AI as a safe photo to dance video generator for TikTok, Reels, and Shorts.",
  defaultKeywords: [
    "free AI dance video generator",
    "AI dance video generator",
    "AI dance generator from photo",
    "photo to dance video generator",
    "make photo dance online",
    "AI photo dance generator",
    "AI dance maker online",
    "TikTok AI dance generator",
    "AI dance video templates",
  ],
  ogImagePath: "/opengraph-image",
} as const;

type PageMetadataInput = {
  title: string;
  description: string;
  path: string;
  absoluteTitle?: boolean;
  keywords?: readonly string[];
  robots?: Metadata["robots"];
};

export const sitemapRoutes = [
  "/",
  "/ai-dance-generator",
  "/pricing",
  "/register",
  "/contact",
  "/terms",
  "/acceptable-use",
  "/privacy",
  "/refund-policy",
] as const;

export function absoluteUrl(path = "/") {
  return new URL(path, `${siteConfig.url}/`).toString();
}

export function createPageMetadata({
  title,
  description,
  path,
  absoluteTitle = false,
  keywords = siteConfig.defaultKeywords,
  robots,
}: PageMetadataInput): Metadata {
  const url = absoluteUrl(path);
  const imageUrl = absoluteUrl(siteConfig.ogImagePath);
  const socialTitle = title.includes(siteConfig.name) ? title : `${title} | ${siteConfig.name}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    keywords: [...keywords],
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: socialTitle,
      description,
      url,
      siteName: siteConfig.name,
      locale: "en_US",
      type: "website",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} AI dance video generator`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [imageUrl],
    },
    robots,
  };
}

export function createSitemapEntry(path: (typeof sitemapRoutes)[number]): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(path),
    lastModified: new Date(),
  };
}

export const siteStructuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${siteConfig.url}/#organization`,
      name: siteConfig.name,
      url: siteConfig.url,
      logo: absoluteUrl("/DanceClipAI.svg"),
      contactPoint: [
        {
          "@type": "ContactPoint",
          contactType: "abuse reports and deletion requests",
          email: siteConfig.abuseEmail,
        },
        {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: siteConfig.contactEmail,
        },
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${siteConfig.url}/#website`,
      url: siteConfig.url,
      name: siteConfig.name,
      publisher: {
        "@id": `${siteConfig.url}/#organization`,
      },
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteConfig.url}/#software`,
      name: siteConfig.name,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Web",
      url: absoluteUrl("/ai-dance-generator"),
      description: siteConfig.description,
      publisher: {
        "@id": `${siteConfig.url}/#organization`,
      },
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
  ],
} as const;
