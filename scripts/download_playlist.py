#!/usr/bin/env python3

import os
import sys
import concurrent.futures
import threading

try:
    import yt_dlp
except ImportError:
    print("Error: yt-dlp not found. Install it with:\n  pip install -U --pre yt-dlp")
    sys.exit(1)

DEFAULT_PLAYLIST_URL = ""
MAX_WORKERS = 3

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR)
OUTPUT_DIR = os.path.join(ROOT_DIR, "videos")

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)

PRINT_LOCK = threading.Lock()


def sanitize_name(name):
    name = name or "playlist"
    name = "".join(c if c.isalnum() or c in " -_" else "" for c in name)
    return name.strip().replace(" ", "_") or "playlist"


def format_bytes(value):
    if not value:
        return "0 B"

    units = ["B", "KB", "MB", "GB", "TB"]
    size = float(value)

    for unit in units:
        if size < 1024 or unit == units[-1]:
            return f"{size:.1f} {unit}"
        size /= 1024

    return f"{size:.1f} TB"


def format_speed(value):
    return f"{format_bytes(value)}/s" if value else "N/A"


def format_eta(seconds):
    if seconds is None:
        return "N/A"

    seconds = max(0, int(seconds))
    hours, remainder = divmod(seconds, 3600)
    minutes, secs = divmod(remainder, 60)

    if hours:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"

    return f"{minutes:02d}:{secs:02d}"


def progress_hook(index, title):
    def hook(data):
        status = data.get("status")

        if status == "downloading":
            downloaded = data.get("downloaded_bytes", 0)
            total = data.get("total_bytes") or data.get("total_bytes_estimate")
            speed = data.get("speed")
            eta = data.get("eta")

            if total:
                percent = downloaded / total * 100
                progress = f"{percent:6.2f}%"
            else:
                progress = "  ??.??%"

            line = (
                f"[{index:03d}] "
                f"{progress} "
                f"{format_bytes(downloaded)}"
            )

            if total:
                line += f"/{format_bytes(total)}"

            line += (
                f"  {format_speed(speed):>12} "
                f"ETA {format_eta(eta):>8}  "
                f"{title[:55]}"
            )

            with PRINT_LOCK:
                print(f"\r{line:<130}", end="", flush=True)

        elif status == "finished":
            with PRINT_LOCK:
                print(f"\r[{index:03d}] Downloaded{' ' * 118}")

    return hook


def get_playlist_entries(url):
    opts = {
        "quiet": True,
        "no_warnings": True,
        "extract_flat": True,
        "ignoreerrors": True,
        "user_agent": USER_AGENT,
    }

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            info = ydl.extract_info(url, download=False)
    except Exception as e:
        print(f"Error: Could not extract playlist: {e}")
        sys.exit(1)

    if not info:
        print("Error: Could not extract playlist info.")
        sys.exit(1)

    playlist_title = sanitize_name(info.get("title", "playlist"))
    entries = []

    for entry in info.get("entries") or []:
        if not entry:
            continue

        video_id = entry.get("id")

        if not video_id:
            continue

        entries.append(
            {
                "id": video_id,
                "title": entry.get("title") or "untitled",
                "url": f"https://www.youtube.com/watch?v={video_id}",
            }
        )

    return playlist_title, entries


def download_video(index, video, playlist_dir):
    padded = f"{index:03d}"

    output_template = os.path.join(
        playlist_dir,
        f"{padded}. %(title)s.%(ext)s",
    )

    opts = {
        "format": "bestvideo*+bestaudio/best",
        "outtmpl": output_template,
        "restrictfilenames": True,
        "noplaylist": True,
        "quiet": True,
        "no_warnings": True,
        "ignoreerrors": False,
        "user_agent": USER_AGENT,
        "http_headers": {
            "User-Agent": USER_AGENT,
            "Accept-Language": "en-US,en;q=0.9",
        },
        "retries": 5,
        "fragment_retries": 5,
        "file_access_retries": 5,
        "socket_timeout": 30,
        "continuedl": True,
        "overwrites": False,
        "merge_output_format": "mp4",
        "concurrent_fragment_downloads": 1,
        "progress_hooks": [
            progress_hook(index, video["title"])
        ],
    }

    try:
        with yt_dlp.YoutubeDL(opts) as ydl:
            ydl.download([video["url"]])

        with PRINT_LOCK:
            print(
                f"\r✓ [{padded}] DONE  {video['title'][:100]}"
                f"{' ' * 20}"
            )

        return True

    except Exception as e:
        with PRINT_LOCK:
            print(
                f"\r✗ [{padded}] FAILED  {video['title'][:90]}"
                f" — {e}"
                f"{' ' * 10}"
            )

        return False


def download():
    url = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_PLAYLIST_URL

    if not url:
        print("Usage: python scripts/download_playlist.py <PLAYLIST_URL>")
        print(
            'Example: python scripts/download_playlist.py '
            '"https://www.youtube.com/playlist?list=PLxxxxxxx"'
        )
        sys.exit(1)

    if not url.startswith(("http://", "https://")):
        url = f"https://www.youtube.com/playlist?list={url}"

    playlist_title, entries = get_playlist_entries(url)

    if not entries:
        print("No videos found in playlist.")
        sys.exit(1)

    playlist_dir = os.path.join(OUTPUT_DIR, playlist_title)
    os.makedirs(playlist_dir, exist_ok=True)

    print()
    print(f"Playlist : {playlist_title}")
    print(f"Videos   : {len(entries)}")
    print(f"Workers  : {MAX_WORKERS}")
    print(f"Output   : {playlist_dir}")
    print()
    print("Live download progress:")
    print()

    results = []

    with concurrent.futures.ThreadPoolExecutor(
        max_workers=MAX_WORKERS
    ) as executor:
        futures = {
            executor.submit(
                download_video,
                index,
                video,
                playlist_dir,
            ): index
            for index, video in enumerate(entries, start=1)
        }

        for future in concurrent.futures.as_completed(futures):
            try:
                results.append(future.result())
            except Exception as e:
                index = futures[future]

                with PRINT_LOCK:
                    print(f"\n✗ [{index:03d}] Unexpected error: {e}")

                results.append(False)

    successful = sum(results)
    failed = len(results) - successful

    print()
    print("=" * 80)
    print(f"Completed : {successful}/{len(entries)}")
    print(f"Failed    : {failed}")
    print(f"Output    : {playlist_dir}")
    print("=" * 80)


if __name__ == "__main__":
    download()