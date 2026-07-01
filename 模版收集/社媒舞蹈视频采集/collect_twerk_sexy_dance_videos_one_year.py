import csv
import datetime as dt
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path("/Users/cathug/Documents/ai舞蹈生成器/模版收集/社媒舞蹈视频采集")
TODAY = dt.date(2026, 6, 28)
CUTOFF = TODAY - dt.timedelta(days=365)
OUTPUT_CSV = ROOT / "social_twerk_sexy_dance_videos_50_one_year.csv"
OUTPUT_JSON = ROOT / "social_twerk_sexy_dance_videos_50_one_year.json"


TIKTOK_QUERIES = [
    "twerk dance",
    "twerk dance challenge",
    "twerking challenge",
    "twerk trend",
    "viral twerk dance",
    "booty dance",
    "booty dance challenge",
    "hip dance challenge",
    "waist dance",
    "waist dance challenge",
    "sexy dance",
    "sexy dance challenge",
    "dancehall twerk",
    "dancehall dance challenge",
    "reggaeton dance challenge",
    "brazilian funk dance",
    "funk dance challenge",
    "afro waist dance",
    "amapiano waist dance",
    "latina dance challenge",
    "body dance challenge",
    "slow wine dance",
    "whine dance challenge",
    "wine dance challenge",
    "back it up dance",
    "shake dance challenge",
    "hip roll dance",
]


INCLUDE_TERMS = [
    "twerk",
    "twerking",
    "booty",
    "shake",
    "waist",
    "hip",
    "hips",
    "hip roll",
    "body",
    "sexy",
    "whine",
    "wine",
    "dancehall",
    "reggaeton",
    "brazilian funk",
    "funk",
    "afro",
    "amapiano",
    "latina",
    "back it up",
    "baddie",
    "dancetrend",
    "dance challenge",
]

EXCLUDE_TERMS = [
    "kid",
    "kids",
    "child",
    "children",
    "baby",
    "minor",
    "teen",
    "teens",
    "underage",
    "school",
    "schoolgirl",
    "highschool",
    "daughter",
    "momanddaughter",
    "mom and daughter",
    "momandson",
    "mom and son",
    "family",
    "sister",
    "sisters",
    "brother",
    "siblings",
    "cousin",
    "little girl",
    "student",
    "classmates",
    "classroom",
    "anime",
    "cartoon",
    "roblox",
    "fortnite",
    "emote",
    "minecraft",
    "tutorial for kids",
    "pole dance",
    "strip",
    "nude",
    "naked",
    "onlyfans",
    "lingerie",
    "underwear",
    "bikini",
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


def is_relevant(*parts):
    lower = " ".join(part or "" for part in parts).lower()
    if any(term in lower for term in EXCLUDE_TERMS):
        return False
    return any(term in lower for term in INCLUDE_TERMS)


def engagement(row):
    return int(row.get("likes") or 0) + int(row.get("comments") or 0) * 8 + int(row.get("shares") or 0) // 8


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
            if created < CUTOFF or created > TODAY or duration > 90:
                continue
            author = item.get("author") or {}
            username = author.get("unique_id") or ""
            if not username:
                continue
            nickname = author.get("nickname") or username
            if not is_relevant(title, query, nickname, username):
                continue

            link = f"https://www.tiktok.com/@{username}/video/{video_id}"
            row = {
                "platform": "TikTok",
                "likes": int(item.get("digg_count") or 0),
                "comments": int(item.get("comment_count") or 0),
                "creator": nickname,
                "thumbnail": item.get("cover") or item.get("origin_cover") or "",
                "link": link,
                "source_url": url,
                "published_date": created.isoformat(),
                "title": title,
                "views": int(item.get("play_count") or 0),
                "shares": int(item.get("share_count") or 0),
                "duration_seconds": duration,
                "selection_note": f"TikTok search: {query}; one-year window; adult/sensitive-term filtered",
            }
            previous = rows.get(video_id)
            if not previous or engagement(row) > engagement(previous):
                rows[video_id] = row
        time.sleep(0.25)
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
    rows = collect_tiktok()
    dedup = {row["link"]: row for row in rows}
    selected = sorted(dedup.values(), key=engagement, reverse=True)[:50]
    csv_rows = [to_csv_row(row) for row in selected]
    write_csv(csv_rows, OUTPUT_CSV)
    OUTPUT_JSON.write_text(json.dumps(selected, ensure_ascii=False, indent=2), encoding="utf-8")
    print(
        json.dumps(
            {
                "candidate_count": len(dedup),
                "selected": len(selected),
                "date_min": min((row["发布时间"] for row in csv_rows), default=""),
                "date_max": max((row["发布时间"] for row in csv_rows), default=""),
                "output_csv": str(OUTPUT_CSV),
                "output_json": str(OUTPUT_JSON),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
