function getStorageConnectOrigin(endpoint) {
  const value = endpoint?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    const isLocalHttp = url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    if ((url.protocol !== "https:" && !isLocalHttp) || url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}

const storageConnectOrigin = getStorageConnectOrigin(process.env.S3_ENDPOINT);
const connectSources = [
  "'self'",
  "https://*.google-analytics.com",
  "https://*.analytics.google.com",
  "https://*.googletagmanager.com",
  "https://plausible.io",
  "https://*.clarity.ms",
  "https://*.bing.com",
  "https://*.googlesyndication.com",
  "https://*.doubleclick.net",
  "https://*.googleadservices.com",
  "https://*.adtrafficquality.google",
  "https://*.google.com",
  "https://challenges.cloudflare.com",
  "https://*.crisp.chat",
  "wss://*.crisp.chat",
  "https://*.crisp.im",
  "wss://*.crisp.im",
  ...(storageConnectOrigin ? [storageConnectOrigin] : []),
];
const contentSecurityPolicy = `connect-src ${connectSources.join(" ")}`;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "danceclip.org" }],
        destination: "https://www.danceclip.org/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
};

export default nextConfig;
