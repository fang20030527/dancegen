# Sitemap Validation Report

Date: 2026-07-11

## Result

- The sitemap is generated as valid XML by the Next.js metadata route at `/sitemap.xml`.
- It contains 8 canonical HTTPS URLs when the production site URL is configured with HTTPS.
- The URL count is below the 50,000 URL protocol limit; a sitemap index is not needed.
- No `priority` or `changefreq` tags are emitted.
- Inaccurate request-time `lastmod` values have been removed.
- Authentication, payment, admin, API, and `noindex` routes are excluded.
- `robots.txt` references `/sitemap.xml` through the same canonical site URL configuration.
- All 8 included URLs returned HTTP 200 from `https://www.danceclip.org` on 2026-07-11.

## Deployment Check

After deployment, submit `https://www.danceclip.org/sitemap.xml` in Google Search Console and Bing Webmaster Tools.
