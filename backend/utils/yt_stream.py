from yt_dlp import YoutubeDL

from yt_dlp import YoutubeDL

def get_stream_url(youtube_url: str) -> str:
    try:
        ydl_opts = {
            "quiet": True,
            "cookiefile": "www.youtube.com_cookies.txt",
            "format": "137/136/134/18",  # Ưu tiên: 1080p → 720p → 360p
        }

        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            stream_url = info.get("url")
            print(f"🎥 Selected format {info.get('format_id')}: {info.get('width')}x{info.get('height')}")
            return stream_url

    except Exception as e:
        print(f"❌ Preferred formats failed: {e}")
        print("🔁 Trying fallback format: best")
        try:
            fallback_opts = {
                "quiet": True,
                "format": "best",
            }
            with YoutubeDL(fallback_opts) as ydl:
                info = ydl.extract_info(youtube_url, download=False)
                return info.get("url")
        except Exception as e2:
            raise Exception(f"❌ Fallback also failed: {e2}")


# Alternative function nếu muốn manual selection
def get_stream_url_with_quality_preference(youtube_url: str, preferred_height: int = 1080) -> str:
    """
    Lấy stream URL với preference về chất lượng cụ thể
    
    Args:
        youtube_url: URL của video YouTube
        preferred_height: Chiều cao mong muốn (720, 1080, etc.)
    """
    try:
        ydl_opts = {
            "quiet": True,
            "cookiefile": "utils/www.youtube.com_cookies.txt",
            "format": f"best[height<={preferred_height}][ext=mp4]/best[height<={preferred_height}]/best",
        }
        
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            
            stream_url = info.get("url", None)
            if stream_url:
                selected_height = info.get('height', 'Unknown')
                selected_width = info.get('width', 'Unknown')
                print(f"Selected stream with preference {preferred_height}p: {selected_width}x{selected_height}")
                
            return stream_url
            
    except Exception as e:
        raise Exception(f"Error fetching stream with quality preference: {e}")

# Function để list tất cả formats có sẵn (để debug)
def list_available_formats(youtube_url: str):
    """
    Debug function để xem tất cả formats có sẵn
    """
    try:
        ydl_opts = {
            "quiet": True,
            "listformats": True,
        }
        
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(youtube_url, download=False)
            
            if 'formats' in info:
                print(f"All available formats for {youtube_url}:")
                print("-" * 80)
                for i, fmt in enumerate(info['formats']):
                    format_id = fmt.get('format_id', 'N/A')
                    height = fmt.get('height', 'N/A')
                    width = fmt.get('width', 'N/A')
                    ext = fmt.get('ext', 'N/A')
                    protocol = fmt.get('protocol', 'N/A')
                    filesize = fmt.get('filesize', 'N/A')
                    print(f"{i:2d}. ID:{format_id:10s} {width}x{height} {ext:5s} {protocol:10s} {filesize}")
                print("-" * 80)
                
    except Exception as e:
        print(f"Error listing formats: {e}")