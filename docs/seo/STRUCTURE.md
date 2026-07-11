# XML Sitemap Structure

DanceClip AI serves its XML sitemap from `/sitemap.xml` through the Next.js App Router. The canonical production host comes from `NEXT_PUBLIC_SITE_URL`, with `https://www.danceclip.org` as the fallback.

## Included URLs

| Route | Content type |
| --- | --- |
| `/` | Main product landing page |
| `/ai-dance-generator` | Public generator landing page |
| `/pricing` | Pricing information |
| `/contact` | Public support and safety contact page |
| `/terms` | Terms of Service |
| `/acceptable-use` | Acceptable Use Policy |
| `/privacy` | Privacy Policy |
| `/refund-policy` | Refund Policy |

## Excluded URLs

| Route group | Reason |
| --- | --- |
| `/register` | Authentication flow, not standalone search content |
| `/ai-twerk-generator` | Explicitly marked `noindex` and unavailable for public generation |
| `/payment/*` | Transactional result pages |
| `/admin` | Private operations route marked `noindex` |
| `/api/*` | API endpoints, not web documents |

The sitemap intentionally omits `lastmod`. The project does not currently have a reliable per-page content modification source, so emitting the build or request time would give crawlers inaccurate dates.

## Maintenance

Add a route to `sitemapRoutes` in `lib/site.ts` only when it is canonical, publicly accessible, indexable, and useful as a search landing page. Keep authentication, transaction, API, private, redirected, and `noindex` routes out of the sitemap.
