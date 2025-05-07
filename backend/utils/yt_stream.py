from yt_dlp import YoutubeDL

def get_stream_url(youtube_url: str) -> str:
    try:
        ydl_opts = {"quiet": True, "format": "best[ext=mp4]/best"}
        with YoutubeDL(ydl_opts) as ydl:
            info_dict = ydl.extract_info(youtube_url, download=False)
            return info_dict.get("url", None)
    except Exception as e:
        raise Exception(f"Error fetching stream using yt-dlp: {e}")
