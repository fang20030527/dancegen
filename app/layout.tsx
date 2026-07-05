import type { Metadata } from "next";
import type { ReactNode } from "react";

import { CrispChat } from "@/components/chat/crisp-chat";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { absoluteUrl, siteConfig, siteStructuredData } from "@/lib/site";

import "./globals.css";

const plausibleInitScript = `
window.plausible=window.plausible||function(){(plausible.q=plausible.q||[]).push(arguments)},plausible.init=plausible.init||function(i){plausible.o=i||{}};
plausible.init()
`;

const microsoftClarityInitScript = `
(function(c,l,a,r,i,t,y){
  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
})(window, document, "clarity", "script", "xhl0ulxzus");
`;

export const metadata: Metadata = {
  title: {
    default: siteConfig.defaultTitle,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [...siteConfig.defaultKeywords],
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: siteConfig.url,
  },
  openGraph: {
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    locale: "en_US",
    type: "website",
    images: [
      {
        url: absoluteUrl(siteConfig.ogImagePath),
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} AI dance video generator`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.defaultTitle,
    description: siteConfig.description,
    images: [absoluteUrl(siteConfig.ogImagePath)],
  },
};

function PlausibleAnalytics() {
  return (
    <>
      <script async src="https://plausible.io/js/pa-u00_N-IgtbYe7WYjqHTbR.js" />
      <script dangerouslySetInnerHTML={{ __html: plausibleInitScript }} />
    </>
  );
}

function MicrosoftClarityAnalytics() {
  return <script dangerouslySetInnerHTML={{ __html: microsoftClarityInitScript }} />;
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <PlausibleAnalytics />
        <MicrosoftClarityAnalytics />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(siteStructuredData).replace(/</g, "\\u003c") }}
          type="application/ld+json"
        />
        <SiteHeader />
        {children}
        <SiteFooter />
        <CrispChat websiteId={process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID} />
      </body>
    </html>
  );
}
