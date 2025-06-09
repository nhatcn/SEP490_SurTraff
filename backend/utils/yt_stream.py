from yt_dlp import YoutubeDL

def get_stream_url(youtube_url: str) -> str:
    try:
        ydl_opts = {
            "quiet": True,
            "cookiefile": "utils/www.youtube.com_cookies.txt",
            "format": "best[ext=mp4][protocol^=https]/best"
        }
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            return info.get("url", None)
    except Exception as e:
        raise Exception(f"Error fetching stream: {e}")
