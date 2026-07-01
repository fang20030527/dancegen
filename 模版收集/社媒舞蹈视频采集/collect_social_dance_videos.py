import csv
import datetime as dt
import html
import json
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path("/Users/cathug/Documents/ai舞蹈生成器/模版收集/社媒舞蹈视频采集")
TODAY = dt.date(2026, 6, 28)
CUTOFF = TODAY - dt.timedelta(days=183)

TIKTOK_QUERIES = [
    "dance challenge",
    "viral dance",
    "dance trend",
    "kpop dance challenge",
    "redred dance challenge",
    "no hands dance",
    "passinho do jamal dance",
    "la racha dance",
    "shuffle dance challenge",
    "hip hop dance challenge",
    "walk in walk out dance",
    "goin up dance",
    "tiktok dance 2026",
    "dance tutorial 2026",
]

YOUTUBE_QUERIES = [
    "viral dance challenge shorts 2026",
    "dance challenge shorts 2026",
    "tiktok dance challenge shorts 2026",
    "kpop dance challenge shorts 2026",
    "redred dance challenge shorts",
    "no hands dance shorts",
    "passinho do jamal dance shorts",
    "la racha dance shorts",
    "shuffle dance challenge shorts",
    "walk in walk out dance shorts",
    "goin up dance shorts",
    "hip hop dance shorts 2026",
]

KNOWN_YOUTUBE_SHORTS = [
    ("https://www.youtube.com/shorts/KinO_fjkMXo", "Known Shorts sample: Cheerleader Bounce"),
    ("https://www.youtube.com/shorts/eLCfeyekCt0", "Known Shorts sample: Beautiful Lie x Macarena"),
    ("https://www.youtube.com/shorts/gqMUa4fiLRA", "Known Shorts sample: GOIN' UP Dance"),
    ("https://www.youtube.com/shorts/6FjV5aSP99o", "Known Shorts sample: Walk In Walk Out"),
    ("https://www.youtube.com/shorts/iC3qz36XHTI", "Known Shorts sample: 2026 mashup dance"),
    ("https://www.youtube.com/watch?v=yt1QYn1EZvs", "Known YouTube reference: REDRED tutorial"),
    ("https://www.youtube.com/watch?v=-ZzYGnSXzQA", "Known YouTube reference: No Hands tutorial"),
]

INSTAGRAM_TREND_SOURCES = [
    "https://later.com/blog/instagram-reels-trends/",
    "https://www.socialpilot.co/blog/instagram-reels-trends",
]

MANUAL_INSTAGRAM_REELS = [
    "https://www.instagram.com/reel/DS_c8rKjcqa/",
    "https://www.instagram.com/reel/DTJFbkBEgDo/",
    "https://www.instagram.com/reel/DZhaS0ftpM0/",
    "https://www.instagram.com/reel/DTvNl96kbDt/",
    "https://www.instagram.com/reel/DTH7nzNkeFL/",
    "https://www.instagram.com/reel/DTmurazDT2i/",
    "https://www.instagram.com/reel/DaD1fgoOMQy/",
    "https://www.instagram.com/reel/DS9k-7njM1Y/",
    "https://www.instagram.com/reel/DYg9d2Fu7eY/",
    "https://www.instagram.com/reel/DVV2az2Ec1m/",
    "https://www.instagram.com/reel/DZNqbmfxzme/",
    "https://www.instagram.com/reel/DS-xZwDgRMR/",
    "https://www.instagram.com/reel/DTSutXxCtqc/",
    "https://www.instagram.com/reel/DUV2b5fjaCM/",
    "https://www.instagram.com/reel/DTLlZLCCgWn/",
    "https://www.instagram.com/reel/DYzSCJrqd5H/",
    "https://www.instagram.com/reel/DYSd5ksxF7l/",
    "https://www.instagram.com/reel/DZIweYZBCkQ/",
    "https://www.instagram.com/reel/DZ2mwegyQdk/",
    "https://www.instagram.com/reel/DYWFdB4NXlv/",
    "https://www.instagram.com/reel/DTTC-MBCXcN/",
    "https://www.instagram.com/reel/DZGr6sYFOBR/",
    "https://www.instagram.com/reel/DXFF_7fDP98/",
    "https://www.instagram.com/reel/DTs06NRgs4I/",
    "https://www.instagram.com/reel/DUTZSDgjG66/",
    "https://www.instagram.com/reel/DValrJJCGo-/",
    "https://www.instagram.com/reel/DY-oCJNS0il/",
    "https://www.instagram.com/reel/DS_0nkEAXLS/",
    "https://www.instagram.com/reel/DS-o20rDLZX/",
    "https://www.instagram.com/reel/DTq4YC-gYZr/",
    "https://www.instagram.com/reel/DZVfKMXRPpk/",
    "https://www.instagram.com/reel/DXTPdnEEr_j/",
    "https://www.instagram.com/reel/DS736U6E0Cq/",
    "https://www.instagram.com/reel/DXpcjLKgUPq/",
]

INCLUDE_TERMS = [
    "dance",
    "dancing",
    "choreo",
    "choreography",
    "shuffle",
    "hip hop",
    "kpop",
    "k-pop",
    "passinho",
    "jamal",
    "racha",
    "redred",
    "no hands",
    "walk in walk out",
    "goin",
    "stomp",
    "perform",
    "performance",
    "world cup",
    "amapiano",
    "afrodance",
]

EXCLUDE_TERMS = [
    "twerk",
    "baby",
    "kid",
    "kids",
    "minor",
    "bikini",
    "underwear",
    "lingerie",
    "nude",
    "pole dance",
    "schoolgirl",
]


def fetch_text(url, timeout=20):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return res.read().decode("utf-8", "ignore")


def compact(text, max_len=240):
    text = html.unescape(text or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_len]


def is_relevant(text):
    lower = (text or "").lower()
    if any(term in lower for term in EXCLUDE_TERMS):
        return False
    return any(term in lower for term in INCLUDE_TERMS)


def is_instagram_dance_relevant(text):
    lower = (text or "").lower()
    if any(term in lower for term in EXCLUDE_TERMS):
        return False
    if any(term in lower for term in ["beauty", "gift", "skincare", "makeup", "books make", "travel", "cozy", "motivation"]):
        return False
    strong_patterns = [
        r"#dance\b",
        r"#danc",
        r"dance challenge",
        r"new dance",
        r"dance reel",
        r"dancereel",
        r"dance mood",
        r"dance team",
        r"dances in",
        r"choreo",
        r"choreography",
        r"performance",
        r"hiphop",
        r"jazz",
        r"afrodance",
        r"amapiano",
    ]
    return any(re.search(pattern, lower) for pattern in strong_patterns)


def engagement(likes, comments):
    return int(likes or 0) + int(comments or 0) * 8


def collect_tiktok():
    rows = {}
    for query in TIKTOK_QUERIES:
        url = "https://www.tikwm.com/api/feed/search?" + urllib.parse.urlencode(
            {"keywords": query, "count": 30}
        )
        try:
            payload = json.loads(fetch_text(url, timeout=25))
        except Exception as exc:
            print(f"tiktok search failed {query}: {exc}", file=sys.stderr)
            continue

        videos = (payload.get("data") or {}).get("videos") or []
        for item in videos:
            video_id = str(item.get("video_id") or item.get("id") or "")
            if not video_id:
                continue
            created = dt.date.fromtimestamp(int(item.get("create_time") or 0))
            title = compact(item.get("title"), 500)
            duration = item.get("duration") or 0
            if created < CUTOFF or duration > 90 or not is_relevant(title):
                continue
            author = item.get("author") or {}
            username = author.get("unique_id") or ""
            link = f"https://www.tiktok.com/@{username}/video/{video_id}" if username else f"https://www.tiktok.com/embed/v2/{video_id}"
            rows[video_id] = {
                "platform": "TikTok",
                "likes": int(item.get("digg_count") or 0),
                "comments": int(item.get("comment_count") or 0),
                "creator": author.get("nickname") or username or "",
                "thumbnail": item.get("cover") or item.get("origin_cover") or "",
                "link": link,
                "source_url": url,
                "published_date": created.isoformat(),
                "title": title,
                "views": int(item.get("play_count") or 0),
                "shares": int(item.get("share_count") or 0),
                "duration_seconds": int(duration or 0),
                "selection_note": f"TikTok search: {query}",
            }
        time.sleep(0.25)
    return list(rows.values())


def yt_dlp_json(args, timeout=45):
    cmd = ["uvx", "--from", "yt-dlp", "yt-dlp", "--no-warnings", "--socket-timeout", "12", *args]
    result = subprocess.run(cmd, text=True, capture_output=True, cwd=str(ROOT), timeout=timeout)
    if result.returncode != 0:
        return None, result.stderr.strip()
    return result.stdout, ""


def collect_youtube():
    ids = {}
    for url, note in KNOWN_YOUTUBE_SHORTS:
        video_id = url.rstrip("/").split("/")[-1]
        if "watch?v=" in url:
            video_id = urllib.parse.parse_qs(urllib.parse.urlparse(url).query).get("v", [video_id])[0]
        ids[video_id] = {"query": note, "url": url}

    rows = {}
    for i, (video_id, seed) in enumerate(list(ids.items()), 1):
        stdout, err = yt_dlp_json(["--dump-json", "--skip-download", seed["url"]], timeout=40)
        if not stdout:
            continue
        for line in stdout.splitlines():
            try:
                item = json.loads(line)
            except Exception:
                continue
            upload_date = item.get("upload_date")
            if not upload_date:
                continue
            created = dt.datetime.strptime(upload_date, "%Y%m%d").date()
            duration = int(item.get("duration") or 0)
            title = compact(item.get("title"), 500)
            if created < CUTOFF or duration > 900 or not is_relevant(title):
                continue
            # YouTube search results are watch URLs even for Shorts; duration + query identifies Shorts-like candidates.
            rows[video_id] = {
                "platform": "YouTube Shorts",
                "likes": int(item.get("like_count") or 0),
                "comments": int(item.get("comment_count") or 0),
                "creator": item.get("uploader") or item.get("channel") or "",
                "thumbnail": item.get("thumbnail") or "",
                "link": f"https://www.youtube.com/shorts/{video_id}",
                "source_url": seed["url"],
                "published_date": created.isoformat(),
                "title": title,
                "views": int(item.get("view_count") or 0),
                "shares": "",
                "duration_seconds": duration,
                "selection_note": f"YouTube search: {seed['query']}",
            }
        if i % 20 == 0:
            print(f"youtube checked {i}/{len(ids)}", file=sys.stderr)
    return list(rows.values())


def extract_instagram_links():
    found = [(link, "manual Instagram dance search result") for link in MANUAL_INSTAGRAM_REELS]
    for source in INSTAGRAM_TREND_SOURCES:
        try:
            text = fetch_text(source, timeout=25)
        except Exception as exc:
            print(f"instagram source failed {source}: {exc}", file=sys.stderr)
            continue
        for match in re.findall(r"https://www\.instagram\.com/reel/[^\"<> ]+", text):
            clean = html.unescape(match)
            clean = clean.split("?")[0]
            clean = clean.replace("/embed/", "/")
            if not clean.endswith("/"):
                clean += "/"
            found.append((clean, source))
    dedup = {}
    for link, source in found:
        dedup.setdefault(link, source)
    return list(dedup.items())


def first_regex(pattern, text, flags=0):
    match = re.search(pattern, text, flags)
    return match.group(1) if match else ""


def parse_instagram_embed(link, source):
    embed = link.rstrip("/") + "/embed/"
    result = subprocess.run(
        ["curl", "-Ls", "-A", "Mozilla/5.0", embed],
        text=True,
        capture_output=True,
        timeout=30,
    )
    if result.returncode != 0 or not result.stdout:
        return None
    decoded = html.unescape(result.stdout).replace('\\"', '"').replace("\\/", "/")

    likes = first_regex(r'"edge_liked_by"\s*:\s*\{"count"\s*:\s*(\d+)\}', decoded)
    comments = first_regex(r'"edge_media_to_comment"\s*:\s*\{"count"\s*:\s*(\d+)\}', decoded)
    views = first_regex(r'"video_view_count"\s*:\s*(\d+)', decoded)
    duration = first_regex(r'"video_duration"\s*:\s*([0-9.]+)', decoded)
    caption = first_regex(r'"edge_media_to_caption"\s*:\s*\{"edges"\s*:\s*\[\{"node"\s*:\s*\{"text"\s*:\s*"(.*?)"\}\}\]\}', decoded)
    username = first_regex(r'"owner"\s*:\s*\{.*?"username"\s*:\s*"(.*?)"', decoded)
    thumbnail = first_regex(r'"thumbnail_src"\s*:\s*"(.*?)"', decoded)
    timestamp = first_regex(r'"taken_at_timestamp"\s*:\s*(\d+)', decoded)
    shortcode = link.rstrip("/").split("/")[-1]

    caption = compact(caption.encode("utf-8").decode("unicode_escape", "ignore"), 500)
    thumbnail = thumbnail.replace("\\/", "/")
    created = dt.date.fromtimestamp(int(timestamp)) if timestamp else None

    if not likes or not comments:
        return None
    if created and created < CUTOFF:
        return None
    if duration and float(duration) > 180:
        return None
    if not is_instagram_dance_relevant(caption):
        return None

    return {
        "platform": "Instagram Reels",
        "likes": int(likes),
        "comments": int(comments),
        "creator": username,
        "thumbnail": thumbnail,
        "link": link,
        "source_url": source,
        "published_date": created.isoformat() if created else "",
        "title": caption,
        "views": int(views or 0),
        "shares": "",
        "duration_seconds": int(float(duration)) if duration else "",
        "selection_note": "Instagram trend-page embed metadata; publish date unavailable on public embed" if not created else "Instagram trend-page embed metadata",
        "id": shortcode,
    }


def collect_instagram():
    rows = {}
    links = extract_instagram_links()
    for i, (link, source) in enumerate(links[:120], 1):
        try:
            row = parse_instagram_embed(link, source)
        except Exception as exc:
            print(f"instagram parse failed {link}: {exc}", file=sys.stderr)
            continue
        if row:
            rows[row["id"]] = row
        if i % 20 == 0:
            print(f"instagram checked {i}/{len(links)}", file=sys.stderr)
        time.sleep(0.15)
    return list(rows.values())


def choose_rows(rows):
    by_platform = {"TikTok": [], "YouTube Shorts": [], "Instagram Reels": []}
    for row in rows:
        by_platform.setdefault(row["platform"], []).append(row)
    for platform in by_platform:
        by_platform[platform].sort(key=lambda r: engagement(r["likes"], r["comments"]), reverse=True)

    # Keep all three platforms represented where public data is available.
    quotas = {"TikTok": 20, "YouTube Shorts": 15, "Instagram Reels": 15}
    selected = []
    selected_keys = set()
    for platform, quota in quotas.items():
        for row in by_platform.get(platform, [])[:quota]:
            key = row["link"]
            selected.append(row)
            selected_keys.add(key)

    if len(selected) < 50:
        rest = [r for r in rows if r["link"] not in selected_keys]
        rest.sort(key=lambda r: engagement(r["likes"], r["comments"]), reverse=True)
        for row in rest:
            selected.append(row)
            if len(selected) >= 50:
                break

    selected = selected[:50]
    selected.sort(key=lambda r: engagement(r["likes"], r["comments"]), reverse=True)
    return selected


def save_csv(rows, path):
    fields = [
        "平台",
        "点赞数",
        "评论数",
        "博主名字",
        "视频封面",
        "视频链接",
        "发布时间",
        "视频标题/说明",
        "播放量",
        "分享数",
        "时长秒",
        "采集说明",
        "来源URL",
    ]
    mapping = {
        "平台": "platform",
        "点赞数": "likes",
        "评论数": "comments",
        "博主名字": "creator",
        "视频封面": "thumbnail",
        "视频链接": "link",
        "发布时间": "published_date",
        "视频标题/说明": "title",
        "播放量": "views",
        "分享数": "shares",
        "时长秒": "duration_seconds",
        "采集说明": "selection_note",
        "来源URL": "source_url",
    }
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(mapping[field], "") for field in fields})


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    all_rows = []
    collectors = [
        ("tiktok", collect_tiktok),
        ("youtube", collect_youtube),
        ("instagram", collect_instagram),
    ]
    for name, func in collectors:
        print(f"collecting {name}...", file=sys.stderr)
        cache_path = ROOT / f"{name}_candidates.json"
        if cache_path.exists() and name == "tiktok":
            rows = json.loads(cache_path.read_text(encoding="utf-8"))
            print(f"{name}: using cached candidates", file=sys.stderr)
        else:
            rows = func()
        print(f"{name}: {len(rows)} candidates", file=sys.stderr)
        cache_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
        all_rows.extend(rows)

    # Remove exact duplicate links.
    dedup = {}
    for row in all_rows:
        dedup[row["link"]] = row
    all_rows = list(dedup.values())
    selected = choose_rows(all_rows)
    save_csv(selected, ROOT / "social_dance_videos_50.csv")
    (ROOT / "social_dance_videos_50.json").write_text(json.dumps(selected, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "total_candidates": len(all_rows),
        "selected": len(selected),
        "platform_counts": {p: sum(1 for r in selected if r["platform"] == p) for p in sorted({r["platform"] for r in selected})},
        "output": str(ROOT / "social_dance_videos_50.csv"),
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
