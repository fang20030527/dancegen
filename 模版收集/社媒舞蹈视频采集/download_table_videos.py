import csv
import datetime as dt
import html
import json
import os
import re
import subprocess
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path


CSV_PATH = Path(os.environ.get(
    "CSV_PATH",
    "/Users/cathug/Documents/ai舞蹈生成器/模版收集/社媒舞蹈视频采集/social_dance_videos_50.csv",
))
TARGET_DIR = Path(os.environ.get(
    "TARGET_DIR",
    "/Users/cathug/Documents/ai舞蹈生成器/模版收集/代表视频/表格50条",
))
MANIFEST_PATH = Path(os.environ.get("MANIFEST_PATH", str(TARGET_DIR / "下载清单.csv")))
README_PATH = Path(os.environ.get("README_PATH", str(TARGET_DIR / "下载说明.md")))


def sanitize(text, max_len=90):
    text = (text or "").strip()
    text = re.sub(r"[\\/:*?\"<>|]+", "_", text)
    text = re.sub(r"\s+", " ", text)
    return text[:max_len].strip(" ._") or "untitled"


def request_text(url, timeout=30):
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.google.com/",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read().decode("utf-8", "ignore")


def download_url(url, output_path, referer=None, timeout=55):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path = output_path.with_suffix(output_path.suffix + ".part")
    cmd = [
        "curl",
        "-L",
        "--fail",
        "--connect-timeout",
        "12",
        "--max-time",
        str(timeout),
        "-A",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
        "-o",
        str(tmp_path),
    ]
    if referer:
        cmd.extend(["-e", referer])
    cmd.append(url)
    result = subprocess.run(cmd, text=True, capture_output=True, timeout=timeout + 10)
    if result.returncode != 0:
        if tmp_path.exists():
            tmp_path.unlink()
        raise RuntimeError((result.stderr or result.stdout or "curl failed").strip()[-500:])
    tmp_path.replace(output_path)
    return output_path.stat().st_size


def existing_for_index(index, platform_dir):
    if not platform_dir.exists():
        return None
    matches = sorted(platform_dir.glob(f"{index:02d}_*"))
    for path in matches:
        if path.is_file() and path.stat().st_size > 0 and not path.name.endswith(".part"):
            return path
    return None


def tiktok_video_id(url):
    match = re.search(r"/video/(\d+)", url)
    if match:
        return match.group(1)
    match = re.search(r"embed/v2/(\d+)", url)
    return match.group(1) if match else ""


def download_tiktok(row, index):
    link = row["视频链接"]
    video_id = tiktok_video_id(link) or str(index)
    api = "https://www.tikwm.com/api/?" + urllib.parse.urlencode({"url": link})
    payload = json.loads(request_text(api, timeout=35))
    if payload.get("code") != 0:
        raise RuntimeError(f"TikWM returned code={payload.get('code')} msg={payload.get('msg')}")
    data = payload.get("data") or {}
    video_urls = [url for url in [data.get("play"), data.get("wmplay")] if url]
    if not video_urls:
        raise RuntimeError("TikTok API did not return a playable URL")
    creator = sanitize(row["博主名字"], 35)
    title = sanitize(row["视频标题/说明"], 50)
    output = TARGET_DIR / "TikTok" / f"{index:02d}_TikTok_{creator}_{video_id}_{title}.mp4"
    existing = existing_for_index(index, TARGET_DIR / "TikTok")
    if existing:
        return existing, existing.stat().st_size, "already downloaded"
    last_error = None
    for video_url in video_urls:
        try:
            size = download_url(video_url, output, referer="https://www.tiktok.com/")
            return output, size, api
        except Exception as exc:
            last_error = exc
    raise RuntimeError(f"TikTok direct download failed: {last_error}")


def extract_instagram_video_url(link):
    embed = link.rstrip("/") + "/embed/"
    result = subprocess.run(
        ["curl", "-Ls", "-A", "Mozilla/5.0", embed],
        text=True,
        capture_output=True,
        timeout=45,
    )
    if result.returncode != 0 or not result.stdout:
        raise RuntimeError("Instagram embed request returned no HTML")
    decoded = html.unescape(result.stdout).replace('\\"', '"').replace("\\/", "/")
    match = re.search(r'"video_url"\s*:\s*"(https?://[^"]+)"', decoded)
    if not match:
        raise RuntimeError("Instagram embed did not expose video_url")
    return match.group(1), embed


def download_instagram(row, index):
    link = row["视频链接"]
    shortcode = link.rstrip("/").split("/")[-1]
    video_url, embed = extract_instagram_video_url(link)
    creator = sanitize(row["博主名字"], 35)
    title = sanitize(row["视频标题/说明"], 50)
    output = TARGET_DIR / "Instagram_Reels" / f"{index:02d}_Instagram_{creator}_{shortcode}_{title}.mp4"
    existing = existing_for_index(index, TARGET_DIR / "Instagram_Reels")
    if existing:
        return existing, existing.stat().st_size, "already downloaded"
    size = download_url(video_url, output, referer=embed)
    return output, size, embed


def download_youtube(row, index):
    link = row["视频链接"]
    creator = sanitize(row["博主名字"], 35)
    title = sanitize(row["视频标题/说明"], 60)
    output_template = str(TARGET_DIR / "YouTube_Shorts" / f"{index:02d}_YouTube_{creator}_{title}.%(ext)s")
    existing = existing_for_index(index, TARGET_DIR / "YouTube_Shorts")
    if existing:
        return existing, existing.stat().st_size, "already downloaded"
    cmd = [
        "uvx",
        "--from",
        "yt-dlp",
        "yt-dlp",
        "--no-playlist",
        "--continue",
        "--trim-filenames",
        "150",
        "-f",
        "18/best[ext=mp4][vcodec!=none][acodec!=none]/best[vcodec!=none][acodec!=none]",
        "-o",
        output_template,
        link,
    ]
    result = subprocess.run(cmd, text=True, capture_output=True, timeout=120)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip()[-500:] or "yt-dlp failed")
    out_dir = TARGET_DIR / "YouTube_Shorts"
    prefix = f"{index:02d}_YouTube_{creator}_{title}"
    candidates = sorted(out_dir.glob(prefix + ".*"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not candidates:
        raise RuntimeError("yt-dlp completed but no output file found")
    output = candidates[0]
    return output, output.stat().st_size, link


def download_one(row, index):
    platform = row["平台"]
    if platform == "TikTok":
        return download_tiktok(row, index)
    if platform == "Instagram Reels":
        return download_instagram(row, index)
    if platform == "YouTube Shorts":
        return download_youtube(row, index)
    raise RuntimeError(f"Unsupported platform: {platform}")


def main():
    TARGET_DIR.mkdir(parents=True, exist_ok=True)
    rows = list(csv.DictReader(CSV_PATH.open(encoding="utf-8-sig")))
    total = len(rows)
    manifest = []
    for index, row in enumerate(rows, start=1):
        start = time.time()
        record = {
            "序号": index,
            "平台": row["平台"],
            "博主名字": row["博主名字"],
            "视频链接": row["视频链接"],
            "状态": "",
            "文件路径": "",
            "文件大小字节": "",
            "下载来源": "",
            "错误": "",
        }
        try:
            output, size, source = download_one(row, index)
            record.update({
                "状态": "成功",
                "文件路径": str(output),
                "文件大小字节": size,
                "下载来源": source,
            })
            print(f"[{index:02d}/{total:02d}] OK {row['平台']} {output.name} ({size} bytes)", flush=True)
        except Exception as exc:
            record.update({"状态": "失败", "错误": str(exc)})
            print(f"[{index:02d}/{total:02d}] FAIL {row['平台']} {row['视频链接']} :: {exc}", file=sys.stderr, flush=True)
        manifest.append(record)
        # Be polite to platform endpoints.
        elapsed = time.time() - start
        if elapsed < 0.4:
            time.sleep(0.4 - elapsed)

    fields = ["序号", "平台", "博主名字", "视频链接", "状态", "文件路径", "文件大小字节", "下载来源", "错误"]
    with MANIFEST_PATH.open("w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(manifest)

    success = sum(1 for item in manifest if item["状态"] == "成功")
    failed = len(manifest) - success
    README_PATH.write_text(
        "\n".join(
            [
                "# 表格50条视频下载说明",
                "",
                f"下载时间：{dt.datetime.now().isoformat(timespec='seconds')}",
                f"来源表：{CSV_PATH}",
                f"成功：{success}",
                f"失败：{failed}",
                "",
                "子目录：",
                "- `TikTok/`",
                "- `Instagram_Reels/`",
                "- `YouTube_Shorts/`",
                "",
                "说明：这些视频用于内部模板动作和竞品调研参考。公开落地页不要直接搬运原视频素材。",
                f"详细逐条结果见：{MANIFEST_PATH}",
            ]
        ),
        encoding="utf-8",
    )
    print(json.dumps({"success": success, "failed": failed, "manifest": str(MANIFEST_PATH)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
