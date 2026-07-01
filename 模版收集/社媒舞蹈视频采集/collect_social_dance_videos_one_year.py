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
CUTOFF = TODAY - dt.timedelta(days=365)
EXISTING_CSV = ROOT / "social_dance_videos_50.csv"
NEW_CSV = ROOT / "social_dance_videos_new_50_one_year.csv"
COMBINED_CSV = ROOT / "social_dance_videos_100_one_year.csv"
NEW_JSON = ROOT / "social_dance_videos_new_50_one_year.json"
COMBINED_JSON = ROOT / "social_dance_videos_100_one_year.json"


TIKTOK_QUERIES = [
    "dance challenge",
    "viral dance",
    "dance trend",
    "trending dance",
    "tiktok dance",
    "dance challenge 2025",
    "viral dance 2025",
    "tiktok dance 2025",
    "dance trend 2025",
    "dance challenge 2026",
    "viral dance 2026",
    "tiktok dance 2026",
    "dance trend 2026",
    "kpop dance challenge",
    "kpop dance challenge 2025",
    "kpop dance challenge 2026",
    "hip hop dance challenge",
    "shuffle dance challenge",
    "afrodance challenge",
    "amapiano dance challenge",
    "brazil dance trend",
    "passinho do jamal dance",
    "la racha dance",
    "redred dance challenge",
    "no hands dance",
    "walk in walk out dance",
    "goin up dance",
    "apple dance challenge",
    "apt dance challenge",
    "messy dance challenge",
    "anxiety dance challenge",
    "like jennie dance challenge",
    "katseye touch dance challenge",
    "ordinary dance challenge",
    "manchild dance challenge",
    "dtmf dance challenge",
    "sigma boy dance",
    "soda pop dance challenge",
    "golden dance challenge",
]

YOUTUBE_QUERIES = [
    "viral dance challenge shorts 2026",
    "viral dance challenge shorts 2025",
    "tiktok dance challenge shorts 2026",
    "tiktok dance challenge shorts 2025",
    "kpop dance challenge shorts 2026",
    "redred dance challenge shorts",
    "no hands dance shorts",
    "passinho do jamal dance shorts",
    "shuffle dance challenge shorts",
    "walk in walk out dance shorts",
]

INCLUDE_TERMS = [
    "dance",
    "dancing",
    "dancer",
    "dancetrend",
    "dancestolearn",
    "choreo",
    "choreography",
    "challenge",
    "shuffle",
    "hip hop",
    "hiphop",
    "kpop",
    "k-pop",
    "afrodance",
    "amapiano",
    "passinho",
    "pasinho",
    "jamal",
    "racha",
    "redred",
    "no hands",
    "walk in walk out",
    "goin up",
    "apple",
    "apt",
    "messy",
    "anxiety",
    "like jennie",
    "katseye",
    "ordinary",
    "manchild",
    "dtmf",
    "sigma boy",
    "soda pop",
    "golden",
]

EXCLUDE_TERMS = [
    "twerk",
    "sexy",
    "bikini",
    "underwear",
    "lingerie",
    "nude",
    "pole dance",
    "baby",
    "kid",
    "kids",
    "child",
    "children",
    "minor",
    "schoolgirl",
    "momandson",
    "mom and son",
    "fortnite",
    "emote",
    "roblox",
    "minecraft",
    "anime",
    "cartoon",
    "skincare",
    "makeup",
    "storytime",
    "compilation",
]


def fetch_text(url, timeout=25):
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


def compact(text, max_len=500):
    text = html.unescape(text or "")
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_len]


def relevant(text, query=""):
    lower = f"{text or ''} {query or ''}".lower()
    if any(term in lower for term in EXCLUDE_TERMS):
        return False
    return any(term in lower for term in INCLUDE_TERMS)


def engagement(row):
    return int(row.get("likes") or 0) + int(row.get("comments") or 0) * 8


def read_existing_rows():
    with EXISTING_CSV.open(encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def existing_links(rows):
    return {row["视频链接"] for row in rows if row.get("视频链接")}


def collect_tiktok():
    rows = {}
    for query in TIKTOK_QUERIES:
        url = "https://www.tikwm.com/api/feed/search?" + urllib.parse.urlencode(
            {"keywords": query, "count": 30}
        )
        try:
            payload = json.loads(fetch_text(url, timeout=30))
        except Exception as exc:
            print(f"tiktok search failed {query}: {exc}", file=sys.stderr)
            continue

        videos = (payload.get("data") or {}).get("videos") or []
        for item in videos:
            video_id = str(item.get("video_id") or item.get("id") or "")
            if not video_id:
                continue
            try:
                created = dt.date.fromtimestamp(int(item.get("create_time") or 0))
            except Exception:
                continue
            title = compact(item.get("title"))
            duration = int(float(item.get("duration") or 0))
            if created < CUTOFF or created > TODAY or duration > 90 or not relevant(title, query):
                continue
            author = item.get("author") or {}
            username = author.get("unique_id") or ""
            if not username:
                continue
            link = f"https://www.tiktok.com/@{username}/video/{video_id}"
            candidate = {
                "platform": "TikTok",
                "likes": int(item.get("digg_count") or 0),
                "comments": int(item.get("comment_count") or 0),
                "creator": author.get("nickname") or username,
                "thumbnail": item.get("cover") or item.get("origin_cover") or "",
                "link": link,
                "source_url": url,
                "published_date": created.isoformat(),
                "title": title,
                "views": int(item.get("play_count") or 0),
                "shares": int(item.get("share_count") or 0),
                "duration_seconds": duration,
                "selection_note": f"TikTok search: {query}; one-year window",
            }
            previous = rows.get(video_id)
            if not previous or engagement(candidate) > engagement(previous):
                rows[video_id] = candidate
        time.sleep(0.25)
    return list(rows.values())


def yt_dlp_json(args, timeout=70):
    cmd = ["uvx", "--from", "yt-dlp", "yt-dlp", "--no-warnings", "--socket-timeout", "15", *args]
    try:
        result = subprocess.run(cmd, text=True, capture_output=True, cwd=str(ROOT), timeout=timeout)
    except subprocess.TimeoutExpired:
        return "", "yt-dlp timed out"
    if result.returncode != 0:
        return "", result.stderr.strip()
    return result.stdout, ""


def collect_youtube():
    rows = {}
    for query in YOUTUBE_QUERIES:
        stdout, err = yt_dlp_json(["--dump-json", "--skip-download", f"ytsearch8:{query}"], timeout=55)
        if not stdout:
            print(f"youtube search failed {query}: {err[-300:]}", file=sys.stderr)
            continue
        for line in stdout.splitlines():
            try:
                item = json.loads(line)
            except Exception:
                continue
            video_id = item.get("id") or ""
            if not video_id:
                continue
            upload_date = item.get("upload_date")
            if not upload_date:
                continue
            try:
                created = dt.datetime.strptime(upload_date, "%Y%m%d").date()
            except Exception:
                continue
            title = compact(item.get("title"))
            duration = int(float(item.get("duration") or 0))
            if created < CUTOFF or created > TODAY or duration > 90 or not relevant(title, query):
                continue
            candidate = {
                "platform": "YouTube Shorts",
                "likes": int(item.get("like_count") or 0),
                "comments": int(item.get("comment_count") or 0),
                "creator": item.get("uploader") or item.get("channel") or "",
                "thumbnail": item.get("thumbnail") or "",
                "link": f"https://www.youtube.com/shorts/{video_id}",
                "source_url": f"ytsearch25:{query}",
                "published_date": created.isoformat(),
                "title": title,
                "views": int(item.get("view_count") or 0),
                "shares": "",
                "duration_seconds": duration,
                "selection_note": f"YouTube search: {query}; duration<=90s; one-year window",
            }
            previous = rows.get(video_id)
            if not previous or engagement(candidate) > engagement(previous):
                rows[video_id] = candidate
        time.sleep(0.2)
    return list(rows.values())


def to_csv_row(row):
    return {
        "平台": row.get("platform", ""),
        "点赞数": row.get("likes", ""),
        "评论数": row.get("comments", ""),
        "博主名字": row.get("creator", ""),
        "视频封面": row.get("thumbnail", ""),
        "视频链接": row.get("link", ""),
        "发布时间": row.get("published_date", ""),
        "视频标题/说明": row.get("title", ""),
        "播放量": row.get("views", ""),
        "分享数": row.get("shares", ""),
        "时长秒": row.get("duration_seconds", ""),
        "采集说明": row.get("selection_note", ""),
        "来源URL": row.get("source_url", ""),
    }


def write_csv(rows, path):
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
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    existing = read_existing_rows()
    seen = existing_links(existing)
    collectors = [("tiktok", collect_tiktok)]
    if sys.argv[1:] == ["--include-youtube"]:
        collectors.append(("youtube", collect_youtube))

    all_candidates = []
    for name, collector in collectors:
        print(f"collecting {name}...", file=sys.stderr)
        cache_path = ROOT / f"one_year_{name}_candidates.json"
        if name == "tiktok" and cache_path.exists():
            rows = json.loads(cache_path.read_text(encoding="utf-8"))
            print(f"{name}: using cached candidates", file=sys.stderr)
        else:
            rows = collector()
        print(f"{name}: {len(rows)} candidates", file=sys.stderr)
        cache_path.write_text(
            json.dumps(rows, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        all_candidates.extend(rows)

    dedup = {}
    for row in all_candidates:
        if row["link"] in seen:
            continue
        key = row["link"]
        if key not in dedup or engagement(row) > engagement(dedup[key]):
            dedup[key] = row

    by_platform = {"TikTok": [], "YouTube Shorts": []}
    for row in dedup.values():
        by_platform.setdefault(row["platform"], []).append(row)
    for rows in by_platform.values():
        rows.sort(key=engagement, reverse=True)

    selected = []
    # Keep a little YouTube coverage, but prioritize downloadable high-engagement TikTok rows.
    for row in by_platform.get("YouTube Shorts", [])[:6]:
        selected.append(row)
    selected_links = {row["link"] for row in selected}
    for row in by_platform.get("TikTok", []):
        if row["link"] not in selected_links:
            selected.append(row)
        if len(selected) >= 50:
            break
    if len(selected) < 50:
        rest = [row for row in dedup.values() if row["link"] not in {r["link"] for r in selected}]
        rest.sort(key=engagement, reverse=True)
        selected.extend(rest[: 50 - len(selected)])

    selected = selected[:50]
    selected.sort(key=engagement, reverse=True)
    new_rows = [to_csv_row(row) for row in selected]
    combined = existing + new_rows
    write_csv(new_rows, NEW_CSV)
    write_csv(combined, COMBINED_CSV)
    NEW_JSON.write_text(json.dumps(selected, ensure_ascii=False, indent=2), encoding="utf-8")
    COMBINED_JSON.write_text(json.dumps(combined, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "candidate_count": len(dedup),
                "selected": len(new_rows),
                "combined": len(combined),
                "platform_counts": {
                    platform: sum(1 for row in new_rows if row["平台"] == platform)
                    for platform in sorted({row["平台"] for row in new_rows})
                },
                "new_csv": str(NEW_CSV),
                "combined_csv": str(COMBINED_CSV),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
