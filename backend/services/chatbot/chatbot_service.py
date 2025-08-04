import os
import re
import json
import random
import requests
from datetime import datetime
from cachetools import TTLCache
import logging
from bs4 import BeautifulSoup
from fuzzywuzzy import fuzz
import numpy as np
import asyncio
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
import faiss
import google.generativeai as genai
from google.api_core import retry
import psutil
from retry import retry as retry_decorator
import spacy
from typing import List, Dict, Optional
import unicodedata

# Thiết lập logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Cấu hình đường dẫn file
KNOWLEDGE_TXT_PATH = r"D:\DATN\frontend.16.7\SEP490_SurTraff\backend\services\chatbot\surtraff_knowledge.txt"
SOCIAL_TXT_PATH = r"D:\DATN\frontend.16.7\SEP490_SurTraff\backend\services\chatbot\social.txt"
TRAFFIC_DIALOGS_PATH = r"D:\DATN\frontend.16.7\SEP490_SurTraff\backend\services\chatbot\traffic_dialogs.txt"
FEEDBACK_FILE = r"D:\DATN\frontend.16.7\SEP490_SurTraff\backend\services\chatbot\custom_knowledge.jsonl"
FAISS_INDEX_PATH = r"D:\DATN\frontend.16.7\SEP490_SurTraff\backend\services\chatbot\faiss_index"
CHAT_LOG_FILE = r"D:\DATN\frontend.16.7\SEP490_SurTraff\backend\services\chatbot\chat_log.jsonl"
LIMIT_FEEDBACK = 1000

# Thiết lập API key (mã hóa trong thực tế)
API_KEY = os.getenv("GOOGLE_API_KEY", "AIzaSyAn_DCoTki5FGn1AJ5E9XyvmbDj9AhoMtw")
genai.configure(api_key=API_KEY)

# Tải mô hình spaCy cho tiếng Việt
try:
    nlp_vi = spacy.load("vi_core_news_md")
except:
    logger.warning("Không tải được spaCy model vi_core_news_md, bỏ qua phân tích cú pháp")
    nlp_vi = None

# Sử dụng FAISS-CPU mặc định
use_faiss_gpu = False
logger.info("Sử dụng FAISS-CPU mặc định.")

# Danh sách địa danh
PLACE_NAMES = [
    "Hà Nội", "Hồ Chí Minh", "Sài Gòn", "Đà Nẵng", "Hải Phòng", "Cần Thơ", "Huế", "Nha Trang",
    "Vũng Tàu", "Đà Lạt", "Bình Dương", "Đồng Nai", "Khánh Hòa", "Quảng Ninh", "Cà Mau",
    "An Giang", "Bà Rịa-Vũng Tàu", "Bắc Giang", "Bắc Kạn", "Bạc Liêu", "Bắc Ninh", "Bến Tre",
    "Bình Định", "Bình Phước", "Bình Thuận", "Cao Bằng", "Đắk Lắk", "Đắk Nông", "Điện Biên",
    "Đồng Tháp", "Gia Lai", "Hà Giang", "Hà Nam", "Hà Tĩnh", "Hải Dương", "Hậu Giang",
    "Hòa Bình", "Hưng Yên", "Kiên Giang", "Kon Tum", "Lai Châu", "Lâm Đồng", "Lạng Sơn",
    "Lào Cai", "Long An", "Nam Định", "Nghệ An", "Ninh Bình", "Ninh Thuận", "Phú Thọ",
    "Phú Yên", "Quảng Bình", "Quảng Nam", "Quảng Ngãi", "Quảng Trị", "Sóc Trăng",
    "Sơn La", "Tây Ninh", "Thái Bình", "Thái Nguyên", "Thanh Hóa", "Tiền Giang",
    "Trà Vinh", "Tuyên Quang", "Vĩnh Long", "Vĩnh Phúc", "Yên Bái"
]

# Bộ nhớ cache phân vùng
translation_cache = TTLCache(maxsize=1000, ttl=43200)  # 12 giờ
feedback_cache = TTLCache(maxsize=1000, ttl=86400)     # 1 ngày
semantic_cache = {
    "traffic_law": TTLCache(maxsize=500, ttl=604800),
    "plate_violation": TTLCache(maxsize=500, ttl=3600),
    "traffic_external": TTLCache(maxsize=500, ttl=3600),
    "social": TTLCache(maxsize=200, ttl=86400),
    "general": TTLCache(maxsize=500, ttl=604800)
}
web_cache = TTLCache(maxsize=100, ttl=3600)  # 1 giờ

# Từ khóa nghi ngờ
DOUBT_KEYWORDS = ["thiệt", "chắc", "thật", "có chắc", "really", "sure", "is it true"]

# Từ điển dịch thuật
keyword_map = {
    "vượt đèn đỏ": "red light violation",
    "giao thông": "traffic",
    "mũ bảo hiểm": "helmet",
    "tai nạn": "accident",
    "tốc độ": "speed",
    "đèn đỏ": "red light",
    "biển số": "license plate",
    "đỗ xe sai": "illegal parking",
    "chạy sai làn": "lane violation",
    "ngược chiều": "wrong-way driving",
    "vật cản": "obstacle",
    "hố trên đường": "pothole",
    "mật độ xe": "traffic density",
    "ùn tắc giao thông": "traffic jam",
    "quy định giao thông": "traffic regulation",
    "mức phạt": "fine",
    "vi phạm giao thông": "traffic violation",
    "đường cao tốc": "highway",
    "camera giao thông": "traffic camera",
    "kẹt xe": "traffic jam",
    "bằng lái": "driver's license",
    "đèn giao thông": "traffic light",
    "đường một chiều": "one-way road",
    "phân luồng giao thông": "traffic diversion",
    "cảnh sát giao thông": "traffic police",
    "đường quốc lộ": "national highway",
    "đường tỉnh lộ": "provincial road",
    "đăng kiểm": "vehicle inspection",
    "xử phạt": "penalize",
    "thời gian thực": "real-time",
    "hành vi": "behavior",
    "báo cáo": "report",
    "bản đồ": "map",
    "an toàn": "safety",
    "giới hạn": "limit",
    "tín hiệu": "signal",
    "đường phố": "street",
    "phân tích": "analysis",
    "yolo": "YOLO",
    "camera": "camera",
    "nhận diện": "recognition",
    "hệ thống": "system",
    "ngã tư": "intersection",
    "ngã ba": "T-junction",
    "cầu": "bridge",
    "hầm": "tunnel",
    "đoạn đường": "road segment",
    "khu vực": "area",
    "vị trí": "location",
    "hướng": "direction",
    "báo lỗi hệ thống": "report system error",
    "đăng nhập": "login",
    "như thế nào": "how",
    "surtraff": "SurTraff"
}

# Từ điển kiểm tra chính tả
valid_vietnamese_words = set([
    "giao thông", "vượt đèn đỏ", "mũ bảo hiểm", "tai nạn", "tốc độ", "đèn đỏ", "biển số", "đỗ xe",
    "sai làn", "ngược chiều", "vật cản", "hố", "mật độ", "ùn tắc", "phạt", "nghị định", "luật",
    "quy định", "yolo", "camera", "phát hiện", "nhận diện", "kẹt xe", "bằng lái", "đèn giao thông",
    "đường một chiều", "phân luồng", "cảnh sát", "quốc lộ", "tỉnh lộ", "đăng kiểm", "vi phạm",
    "thời gian thực", "phân tích", "hành vi", "báo cáo", "bản đồ", "hệ thống", "surtraff",
    "đường phố", "an toàn", "giới hạn", "tín hiệu", "xử phạt", "ngã tư", "ngã ba", "cầu", "hầm",
    "đoạn đường", "khu vực", "vị trí", "hướng", "báo lỗi", "kiểm tra", "truy vấn", "đăng nhập",
    "như thế nào", "làm sao", "công nghệ", "biết", "tình trạng", "thông", "hôm nay", "thế nào",
    "phương tiện", "xe máy", "ô tô", "xe tải", "xe khách", "thời gian", "ngày", "tháng", "năm",
    "phát triển", "tình trạng", "hỏi", "trả lời", "hỗ trợ", "tiếp tục", "thêm", "liên quan"
])

# Danh sách URL tin tức giao thông
TRAFFIC_NEWS_URLS = [
    "https://vnexpress.net/giao-thong",
    "https://thanhnien.vn/giao-thong.htm",
    "https://tuoitre.vn/giao-thong.htm",
    "https://nld.com.vn/giao-thong.htm",
    "https://zingnews.vn/giao-thong.html",
    "https://baocantho.com.vn/"
]

# Kiểm tra tài nguyên hệ thống
def check_system_resources():
    try:
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        logger.info(f"CPU usage: {cpu_percent}%, Memory usage: {memory_percent}%")
        return cpu_percent <= 85 and memory_percent <= 85
    except Exception as e:
        logger.error(f"Lỗi kiểm tra tài nguyên: {e}")
        return False

# Kiểm tra dung lượng đĩa
def check_disk_space(path: str, required_mb: int) -> bool:
    try:
        disk = psutil.disk_usage(path)
        free_mb = disk.free / (1024 ** 2)
        logger.info(f"Dung lượng trống tại {path}: {free_mb:.2f} MB")
        return free_mb >= required_mb
    except Exception as e:
        logger.error(f"Lỗi kiểm tra dung lượng đĩa: {e}")
        return False

# Kiểm tra và tạo file phản hồi và log
for file_path in [FEEDBACK_FILE, CHAT_LOG_FILE]:
    if not os.path.exists(file_path):
        with open(file_path, "a", encoding="utf-8") as f:
            pass
        logger.info(f"Đã tạo file {file_path}")

# Kiểm tra file đầu vào
for path in [KNOWLEDGE_TXT_PATH, SOCIAL_TXT_PATH, TRAFFIC_DIALOGS_PATH]:
    if not os.path.exists(path):
        logger.warning(f"File không tồn tại: {path}")
    else:
        try:
            with open(path, "r", encoding="utf-8-sig") as f:
                content = f.read()
                logger.info(f"File {path}: {len(content)} ký tự")
        except Exception as e:
            logger.error(f"Lỗi đọc file {path}: {e}")

# Kiểm tra JSONL
def validate_jsonl_file(path: str) -> bool:
    if not os.path.exists(path):
        logger.warning(f"File không tồn tại: {path}")
        return False
    try:
        with open(path, "r", encoding="utf-8-sig") as file:
            for i, line in enumerate(file, 1):
                if not line.strip():
                    continue
                try:
                    json.loads(line)
                except json.JSONDecodeError:
                    logger.error(f"Dòng {i} trong {path} không hợp lệ: {line.strip()}")
                    return False
        logger.info(f"File {path} hợp lệ")
        return True
    except Exception as e:
        logger.error(f"Lỗi kiểm tra {path}: {e}")
        return False

# Hàm kiểm tra đầu vào an toàn
def is_safe_input(text: str) -> bool:
    dangerous_patterns = [
        r'<\s*script', r'javascript:', r'sqlmap', r'\bselect\s+.*\s+from\b',
        r'--\s*', r';\s*drop\s+', r';\s*delete\s+', r'\bunion\s+select\b'
    ]
    for pattern in dangerous_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            logger.warning(f"Phát hiện đầu vào nguy hiểm: {text}")
            return False
    return True

# Hàm chuẩn hóa Unicode
def normalize_unicode(text: str) -> str:
    return unicodedata.normalize('NFC', text)

# Hàm kiểm tra câu hỏi tương tự trong cache
def check_similar_question(question: str, cache: TTLCache) -> Optional[str]:
    for key in cache.keys():
        cached_question = key.split(":")[-1]
        if fuzz.ratio(normalize_unicode(question.lower()), normalize_unicode(cached_question.lower())) > 90:
            return cache[key]
    return None

# Hàm kiểm tra ngữ cảnh liên quan
def check_context_relevance(question: str, history: List[Dict]) -> bool:
    if not history:
        return False
    last_entry = history[-1]
    last_question = last_entry.get("sentence", "").lower()
    question_lower = question.lower()
    if any(keyword in question_lower for keyword in DOUBT_KEYWORDS):
        return True
    if fuzz.ratio(normalize_unicode(question_lower), normalize_unicode(last_question)) > 80:
        return True
    return False

# Hàm phân tích cú pháp câu hỏi
def parse_question(question: str) -> Dict[str, str]:
    result = {"main_verb": "", "entities": [], "vehicle_type": None, "time": None, "intent": "unknown"}
    if not nlp_vi:
        return result
    try:
        doc = nlp_vi(normalize_unicode(question))
        result["main_verb"] = next((token.text for token in doc if token.pos_ == "VERB"), "")
        result["entities"] = [ent.text for ent in doc.ents]
        for token in doc:
            if token.text.lower() in ["xe máy", "ô tô", "xe tải", "xe khách"]:
                result["vehicle_type"] = token.text
            if token.text.lower() in ["hôm nay", "hôm qua", "ngày mai"] or re.match(r'\d{1,2}/\d{1,2}/\d{4}', token.text):
                result["time"] = token.text
        # Phân loại ý định
        question_lower = question.lower()
        if any(k in question_lower for k in ["mức phạt", "phạt", "nghị định"]):
            result["intent"] = "traffic_law"
        elif any(k in question_lower for k in ["biển số", "vi phạm"]):
            result["intent"] = "plate_violation"
        elif any(k in question_lower for k in ["giao thông", "kẹt xe", "mật độ"]):
            result["intent"] = "traffic_external"
        elif any(k in question_lower for k in ["chào", "hi", "hello"]):
            result["intent"] = "social"
        return result
    except Exception as e:
        logger.error(f"Lỗi phân tích cú pháp: {e}")
        return result

# Hàm làm sạch câu hỏi
def clean_question(sentence: str) -> str:
    if not sentence or not isinstance(sentence, str) or not is_safe_input(sentence):
        return ""
    plate_placeholder = {}
    patterns = [
        r'\b\d{2}[A-Z]?-\d{3,5}\b',
        r'\b\d{2}[A-Z]?-\d{3}\.\d{2}\b',
        r'\b[A-Z]{2}-\d{2}-\d{2,3}\b'
    ]
    sentence = normalize_unicode(sentence)
    for pattern in patterns:
        match = re.search(pattern, sentence, re.IGNORECASE)
        if match:
            plate = match.group(0)
            placeholder = "__PLATE__"
            plate_placeholder[placeholder] = plate
            sentence = sentence.replace(plate, placeholder)
    sentence = re.sub(r'[^\w\sáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ.,!?]', '', sentence)
    sentence = re.sub(r'\s+', ' ', sentence).strip()
    sentence = auto_correct_spelling(sentence)
    for placeholder, original in plate_placeholder.items():
        sentence = sentence.replace(placeholder, original)
    return sentence

# Hàm sửa lỗi chính tả tự động
def auto_correct_spelling(text: str) -> str:
    if not text:
        return text
    text = normalize_unicode(text)
    text = re.sub(r'(\s*😊\s*)+', ' 😊', text)
    text = re.sub(r'(\w+)\s+\1', r'\1', text, flags=re.IGNORECASE)
    text = re.sub(r'[^\w\sáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ.,!?]', '', text)
    text = re.sub(r'\s+', ' ', text).strip()
    corrections = [
        ("đường một chiểu", "đường một chiều"), ("giao thong", "giao thông"), ("giao thongg", "giao thông"),
        ("kẹt xẹ", "kẹt xe"), ("mủ bảo hiểm", "mũ bảo hiểm"), ("tai nạm", "tai nạn"), ("tốc đô", "tốc độ"),
        ("đèn đo", "đèn đỏ"), ("surtraff error", "báo lỗi hệ thống"), ("phátriển", "phát triển"),
        ("biếthêm", "biết thêm"), ("cônghệ", "công nghệ"), ("tinày", "tin này"), ("Rấtiếc", "Rất tiếc"),
        ("tình trạngiao", "tình trạng"), ("hỏiđáp", "hỏi đáp"), ("trảlời", "trả lời"), ("hỗtrợ", "hỗ trợ"),
        ("tiếptục", "tiếp tục"), ("thêmthôngtin", "thêm thông tin"), ("liênquan", "liên quan")
    ]
    for wrong, correct in corrections:
        text = re.sub(r'\b' + re.escape(wrong) + r'\b', correct, text, flags=re.IGNORECASE)
    if nlp_vi:
        doc = nlp_vi(text)
        corrected = " ".join(token.text for token in doc if token.text.lower() in valid_vietnamese_words or not token.is_alpha)
        return corrected if corrected.strip() else text
    return text

# Hàm kiểm tra chính tả tiếng Việt
def check_vietnamese_spelling(text: str) -> bool:
    if not text or not isinstance(text, str):
        return False
    text = normalize_unicode(text)
    text = re.sub(r'[^\w\sáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]', '', text)
    words = text.lower().split()
    if not words:
        return False
    return any(word in valid_vietnamese_words for word in words)

# Hàm ghi log trò chuyện
def log_chat(question: str, response: str, lang: str, topic: str, plate: str = None):
    try:
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "question": normalize_unicode(question),
            "response": normalize_unicode(response),
            "language": lang,
            "topic": topic,
            "license_plate": plate,
            "stack_trace": ""
        }
        with open(CHAT_LOG_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(log_entry, ensure_ascii=False) + "\n")
        logger.info(f"Đã ghi log cho câu hỏi: {question[:50]}... (plate: {plate})")
    except Exception as e:
        logger.error(f"Lỗi ghi log: {e}")

# Hàm lưu phản hồi
def save_feedback(question: str, response: str, lang: str):
    try:
        feedback_entry = {
            "content": normalize_unicode(response),
            "question": normalize_unicode(question),
            "language": lang,
            "timestamp": datetime.now().isoformat(),
            "topic": detect_topic(question)
        }
        with open(FEEDBACK_FILE, "a", encoding="utf-8") as f:
            f.write(json.dumps(feedback_entry, ensure_ascii=False) + "\n")
        logger.info(f"Đã lưu phản hồi cho câu hỏi: {question[:50]}...")
        asyncio.create_task(update_user_index())
    except Exception as e:
        logger.error(f"Lỗi lưu phản hồi: {e}")

# Hàm tạo nhúng với Gemini API
@retry_decorator(tries=4, delay=1, backoff=2)
def get_gemini_embeddings(texts: List[str], model: str = "text-embedding-004", task_type: str = "SEMANTIC_SIMILARITY", output_dimensionality: int = 512) -> List[np.ndarray]:
    try:
        if isinstance(texts, str):
            texts = [texts]
        texts = [normalize_unicode(text[:1500]) for text in texts if text.strip()]
        if not texts:
            logger.error("Danh sách văn bản rỗng hoặc không hợp lệ")
            return []
        embeddings = genai.embed_content(
            model=model,
            content=texts,
            task_type=task_type,
            output_dimensionality=output_dimensionality
        )['embedding']
        embeddings = [np.array(e, dtype='float32') for e in embeddings if len(e) == output_dimensionality]
        if not embeddings:
            logger.error("Gemini API trả về embeddings rỗng")
            return []
        embeddings = [e / np.linalg.norm(e) if np.linalg.norm(e) != 0 else e for e in embeddings]
        return embeddings
    except Exception as e:
        logger.error(f"Lỗi khi tạo nhúng với Gemini API: {e}")
        raise

# Hàm trích xuất văn bản từ file
def extract_text_from_txt(file_path: str, prioritize_dialogs: bool = False) -> str:
    try:
        if prioritize_dialogs and file_path == KNOWLEDGE_TXT_PATH and os.path.exists(TRAFFIC_DIALOGS_PATH):
            if validate_jsonl_file(TRAFFIC_DIALOGS_PATH):
                dialog_text = []
                with open(TRAFFIC_DIALOGS_PATH, "r", encoding="utf-8-sig") as f:
                    for line in f:
                        if not line.strip():
                            continue
                        try:
                            entry = json.loads(line)
                            question = entry.get("question", "")
                            answers = entry.get("answers", [])
                            if question and answers:
                                dialog_text.append(f"{question} {' '.join(answers)}")
                        except json.JSONDecodeError:
                            logger.warning(f"JSON không hợp lệ: {line.strip()}")
                dialog_text = " ".join(set(dialog_text))
                if dialog_text.strip():
                    return normalize_unicode(dialog_text)
        
        with open(file_path, "r", encoding="utf-8-sig") as f:
            text = f.read()
        text = normalize_unicode(text)
        text = auto_correct_spelling(text)
        return text
    except Exception as e:
        logger.error(f"Lỗi trích xuất văn bản từ {file_path}: {e}")
        return ""

# Hàm trích xuất văn bản từ URL
@retry_decorator(tries=4, delay=1, backoff=2)
def extract_text_from_url(url: str, max_chars: int = 1500) -> str:
    cache_key = f"web:{url}"
    if cache_key in web_cache:
        logger.info(f"Cache hit cho URL: {url}")
        return web_cache[cache_key]
    
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()
        soup = BeautifulSoup(response.content, "html.parser")
        
        for element in soup(["script", "style", "header", "footer", "nav", "aside"]):
            element.decompose()
        
        text_elements = soup.find_all(["p", "h1", "h2", "h3"])
        text = " ".join([elem.get_text(strip=True) for elem in text_elements])
        text = normalize_unicode(text)
        text = re.sub(r'\s+', ' ', text).strip()
        text = text[:max_chars]
        text = auto_correct_spelling(text)
        
        web_cache[cache_key] = text
        logger.info(f"Đã trích xuất {len(text)} ký tự từ {url}")
        return text
    except requests.exceptions.RequestException as e:
        logger.error(f"Lỗi trích xuất từ {url}: {e}")
        return ""

# Hàm phát hiện chủ đề
def detect_topic(text: str) -> str:
    if not text.strip():
        return "General"
    text = normalize_unicode(text.lower())
    if any(k in text for k in ["phạt", "mức phạt", "nghị định", "luật", "bằng lái"]): return "Traffic Law"
    if any(k in text for k in ["các chức năng", "chức năng phát hiện", "detection functions"]): return "SurTraff Functions"
    if any(k in text for k in ["đèn đỏ", "red light"]): return "Red Light Detection"
    if any(k in text for k in ["tốc độ", "speed", "overspeed"]): return "Speed Violation"
    if any(k in text for k in ["mũ bảo hiểm", "helmet", "no helmet"]): return "Helmet Violation"
    if any(k in text for k in ["tai nạn", "accident"]): return "Accident Detection"
    if any(k in text for k in ["hố", "vật cản", "obstacle", "pothole"]): return "Obstacle Detection"
    if any(k in text for k in ["đỗ xe", "parking"]): return "Illegal Parking"
    if any(k in text for k in ["sai làn", "ngược chiều", "lane", "wrong-way"]): return "Lane Violation"
    if any(k in text for k in ["mật độ", "ùn tắc", "traffic density"]): return "Traffic Density"
    if any(k in text for k in ["surtraff", "hệ thống", "đăng nhập", "login"]): return "SurTraff System"
    if any(k in text for k in PLACE_NAMES): return "Traffic Information"
    if any(k in text for k in ["yolo", "camera", "phát hiện", "nhận diện", "biển số", "vi phạm", "giao thông thời gian thực"]): return "SurTraff Feature"
    return "General"

# Danh sách chi tiết chức năng SurTraff
def build_surtraff_details():
    details = {
        "Red Light Detection": "SurTraff sử dụng camera AI đồng bộ với tín hiệu đèn giao thông để phát hiện xe vượt đèn đỏ, đạt độ chính xác trên 90%.",
        "Speed Violation": "SurTraff đo tốc độ xe bằng cách theo dõi khoảng cách giữa hai điểm, so sánh với giới hạn tốc độ của đoạn đường.",
        "Helmet Violation": "SurTraff sử dụng AI YOLOv8 để phát hiện tài xế hoặc hành khách không đội mũ bảo hiểm, gửi cảnh báo thời gian thực.",
        "Accident Detection": "SurTraff phân tích chuyển động và đối tượng để phát hiện va chạm, kích hoạt cảnh báo khẩn cấp và hỗ trợ phân tích video tai nạn.",
        "Illegal Parking": "SurTraff phát hiện xe đỗ ở khu vực cấm quá 3 phút, tự động ghi nhận vi phạm.",
        "Lane Violation": "SurTraff phát hiện xe đi sai làn hoặc ngược chiều bằng cách theo dõi đối tượng, đang thử nghiệm ở một số khu vực.",
        "Obstacle Detection": "SurTraff phát hiện hố, cây đổ hoặc vật cản trên đường, cập nhật trên bản đồ hệ thống.",
        "Traffic Density": "SurTraff phân tích mật độ xe qua camera, cung cấp cảnh báo ùn tắc và dự đoán tắc đường thời gian thực.",
        "SurTraff Functions": "SurTraff hỗ trợ phát hiện vượt đèn đỏ, vượt tốc độ, không đội mũ bảo hiểm, đỗ xe sai, chạy sai làn/ngược chiều, tai nạn, vật cản, mật độ xe, và nhận diện biển số.",
        "Traffic Law": """Theo Nghị định 168/2024/NĐ-CP (hiệu lực 1/1/2025):
        - Vượt đèn đỏ: Xe máy 800.000-1.200.000 đồng, ô tô 4-6 triệu đồng.
        - Không đội mũ bảo hiểm: 400.000-600.000 đồng.
        - Chạy quá tốc độ:
          + Xe máy: Vượt 5-<10 km/h: 400.000-600.000 đồng; 10-20 km/h: 800.000-1.000.000 đồng; >20 km/h: 6-8 triệu đồng.
          + Ô tô: Vượt 5-<10 km/h: 800.000-1.000.000 đồng; 10-20 km/h: 4-6 triệu đồng; 20-35 km/h: 6-8 triệu đồng; >35 km/h: 12-14 triệu đồng.
        - Đi ngược chiều: Xe máy 400.000-600.000 đồng, ô tô 2-4 triệu đồng.
        - Đỗ xe sai: Xe máy 400.000-600.000 đồng, ô tô 800.000-1.200.000 đồng.""",
        "SurTraff Feature": "SurTraff sử dụng YOLOv8 và camera AI để nhận diện biển số xe, phân tích hành vi lái xe nguy hiểm, quản lý đèn giao thông, cung cấp bản đồ giao thông thời gian thực, và báo cáo vi phạm theo khu vực.",
        "SurTraff System": "SurTraff cho phép đăng nhập qua tài khoản được cấp bởi hệ thống, sử dụng ứng dụng hoặc website chính thức với email và mật khẩu."
    }
    if validate_jsonl_file(TRAFFIC_DIALOGS_PATH):
        with open(TRAFFIC_DIALOGS_PATH, "r", encoding="utf-8-sig") as file:
            for line in file:
                if not line.strip():
                    continue
                try:
                    entry = json.loads(line)
                    question = entry.get("question", "").lower()
                    answers = entry.get("answers", [])
                    topic = detect_topic(question)
                    if topic not in details and answers:
                        details[topic] = " ".join(answers)[:150]
                except json.JSONDecodeError:
                    logger.warning(f"JSON không hợp lệ: {line.strip()}")
                    continue
    return details

surtraff_details = build_surtraff_details()

# Text splitter
text_splitter = RecursiveCharacterTextSplitter(chunk_size=150, chunk_overlap=50)

# Hàm phát hiện ngôn ngữ
async def detect_language(text: str, history: List[Dict]) -> str:
    if not text.strip():
        return "vi"
    text_lower = normalize_unicode(text.lower())
    vi_keywords = ["giao thông", "biển số", "mũ bảo hiểm", "đèn đỏ", "tốc độ", "đăng nhập", "như thế nào"]
    en_keywords = ["traffic", "license plate", "helmet", "red light", "speed", "login", "how"]
    
    vi_count = sum(1 for k in vi_keywords if k in text_lower)
    en_count = sum(1 for k in en_keywords if k in text_lower)
    
    if vi_count > 0 and en_count == 0:
        return "vi"
    if en_count > 0 and vi_count == 0:
        return "en"
    if vi_count > 0 or en_count > 0:
        return "mixed"
    if history:
        return history[-1].get("lang", "vi")
    
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            f"Detect the language of this text: '{text}'. Return only 'vi' for Vietnamese or 'en' for English.",
            generation_config={"max_output_tokens": 10, "temperature": 0.0}
        )
        lang = response.text.strip()
        return lang if lang in ["vi", "en"] else "vi"
    except Exception as e:
        logger.error(f"Lỗi phát hiện ngôn ngữ: {e}")
        return "vi"

# Hàm dịch thuật vi->en
async def translate_vi2en(text: str) -> str:
    cache_key = f"vi2en:{normalize_unicode(text)}"
    if cache_key in translation_cache:
        return translation_cache[cache_key]
    try:
        place_map = {}
        text_lower = normalize_unicode(text.lower())
        for vi, en in keyword_map.items():
            if vi in text_lower:
                placeholder = f"__KEYWORD_{len(place_map)}__"
                place_map[placeholder] = en
                text = re.sub(r'\b' + re.escape(vi) + r'\b', placeholder, text, flags=re.IGNORECASE)
                text_lower = text_lower.replace(vi.lower(), placeholder.lower())
        for place in PLACE_NAMES:
            if place.lower() in text_lower:
                placeholder = f"__PLACE_{len(place_map)}__"
                place_map[placeholder] = place
                text = re.sub(r'\b' + re.escape(place) + r'\b', placeholder, text, flags=re.IGNORECASE)
                text_lower = text_lower.replace(place.lower(), placeholder.lower())
        
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            f"Translate the following Vietnamese text to English, preserving traffic-related terms: {text}",
            generation_config={"max_output_tokens": 150, "temperature": 0.7}
        )
        translated = normalize_unicode(response.text.strip())
        translated = auto_correct_spelling(translated)
        for placeholder, original in place_map.items():
            translated = translated.replace(placeholder, original)
        translated = re.sub(r'\s+', ' ', translated).strip()
        translation_cache[cache_key] = translated
        return translated
    except Exception as e:
        logger.error(f"Lỗi dịch vi->en: {e}")
        return text if check_vietnamese_spelling(text) else "Không thể dịch câu này, vui lòng thử lại!"

# Hàm dịch thuật en->vi
async def translate_en2vi(text: str) -> str:
    cache_key = f"en2vi:{normalize_unicode(text)}"
    if cache_key in translation_cache:
        return translation_cache[cache_key]
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            f"Translate the following English text to Vietnamese, preserving traffic-related terms: {text}",
            generation_config={"max_output_tokens": 150, "temperature": 0.7}
        )
        translated = normalize_unicode(response.text.strip())
        translated = auto_correct_spelling(translated)
        translated = re.sub(r'\s+', ' ', translated).strip()
        if not check_vietnamese_spelling(translated):
            logger.warning(f"Dịch en->vi không hợp lệ: {translated}")
            return "Không thể dịch câu này, vui lòng thử lại!"
        translation_cache[cache_key] = translated
        return translated
    except Exception as e:
        logger.error(f"Lỗi dịch en->vi: {e}")
        return "Không thể dịch câu này, vui lòng thử lại!"

# Hàm lấy thời gian trong ngày
def get_time_of_day() -> str:
    current_hour = datetime.now().hour
    if 5 <= current_hour < 12:
        return "morning"
    elif 12 <= current_hour < 17:
        return "afternoon"
    elif 17 <= current_hour < 21:
        return "evening"
    else:
        return "night"

# Hàm phát hiện cảm xúc
def detect_emotion(text: str) -> str:
    text_lower = normalize_unicode(text.lower())
    if any(word in text_lower for word in ["gấp", "khẩn cấp", "nguy hiểm", "urgent", "emergency"]):
        return "urgent"
    if any(word in text_lower for word in ["vui", "happy", "tốt", "good", "😊", "😄"]):
        return "positive"
    if any(word in text_lower for word in ["tệ", "xấu", "bad", "terrible", "😔", "😢"]):
        return "negative"
    return "neutral"

# Hàm tóm tắt ngữ cảnh
async def summarize_context(history: List[Dict]) -> str:
    if not history:
        return ""
    history_text = " ".join([entry.get("sentence", "") for entry in history])[:1000]
    if not history_text.strip() or len(history_text.split()) < 5:
        return ""
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            f"Tóm tắt ngắn gọn ngữ cảnh từ các câu hỏi sau bằng tiếng Việt (tối đa 30 từ): {normalize_unicode(history_text)}",
            generation_config={"max_output_tokens": 30, "temperature": 0.7}
        )
        return normalize_unicode(response.text.strip())
    except Exception as e:
        logger.error(f"Lỗi tóm tắt ngữ cảnh: {e}")
        return ""

# Hàm tạo câu hỏi gợi ý
async def generate_suggested_questions(history: List[Dict], topic: str, lang: str) -> str:
    try:
        suggestions = {
            "Traffic Law": [
                "Mức phạt vượt đèn đỏ cho xe máy là bao nhiêu?",
                "Chạy quá tốc độ ở thành phố bị phạt thế nào?",
                "Luật giao thông mới nhất là gì?",
                "Phạt không đội mũ bảo hiểm bao nhiêu tiền?"
            ],
            "SurTraff Feature": [
                "SurTraff phát hiện vi phạm giao thông như thế nào?",
                "Camera AI của SurTraff hoạt động ra sao?",
                "SurTraff có hỗ trợ bản đồ giao thông thời gian thực không?",
                "SurTraff nhận diện biển số xe thế nào?"
            ],
            "Traffic Information": [
                "Tình trạng giao thông ở Hà Nội hôm nay ra sao?",
                "Có kẹt xe ở Cần Thơ không?",
                "Đường nào ở Đà Nẵng đang sửa chữa?",
                "Mật độ giao thông ở Hồ Chí Minh thế nào?"
            ],
            "General": [
                "SurTraff là gì?",
                "Làm sao để đăng nhập vào SurTraff?",
                "SurTraff hỗ trợ những tính năng gì?",
                "Hệ thống SurTraff hoạt động ở đâu?"
            ]
        }
        topic_suggestions = suggestions.get(topic, suggestions["General"])
        if history:
            current_question = history[-1].get("sentence", "").lower()
            topic_suggestions = [s for s in topic_suggestions if fuzz.ratio(normalize_unicode(s.lower()), normalize_unicode(current_question)) < 90]
        suggestion = random.choice(topic_suggestions) if topic_suggestions else "Hỏi thêm về giao thông nhé!"
        if history:
            suggestion = f"Tiếp nối câu hỏi trước, bạn có muốn biết: {suggestion}"
        else:
            suggestion = f"Gợi ý: {suggestion}"
        if lang == "en":
            suggestion = await translate_vi2en(suggestion)
        return normalize_unicode(suggestion)
    except Exception as e:
        logger.error(f"Lỗi tạo câu hỏi gợi ý: {e}")
        return "Gợi ý: Hỏi thêm về giao thông hoặc SurTraff nhé!" if lang == "vi" else "Suggestion: Ask more about traffic or SurTraff!"

# Hàm trả lời xã hội
async def get_social_response(question: str, lang: str, time_of_day: str, history: List[Dict], emotion: str) -> str:
    try:
        greetings = {
            "morning": {
                "positive": "Chào buổi sáng! Hôm nay bạn vui vẻ, muốn biết thêm về giao thông không? 😊" if lang == "vi" else "Good morning! You're cheerful today, want to know more about traffic? 😊",
                "neutral": "Chào buổi sáng! Hôm nay bạn muốn hỏi gì về giao thông? 😊" if lang == "vi" else "Good morning! What do you want to ask about traffic today? 😊",
                "negative": "Chào buổi sáng! Có gì không ổn à? Hỏi về giao thông để mình giúp nhé! 😊" if lang == "vi" else "Good morning! Something wrong? Ask about traffic, I'll help! 😊",
                "urgent": "Chào buổi sáng! Cần thông tin giao thông gấp à? Hỏi ngay nào! 🚨" if lang == "vi" else "Good morning! Need traffic info urgently? Ask now! 🚨"
            },
            "afternoon": {
                "positive": "Chào buổi chiều! Tâm trạng tốt nhỉ, hỏi gì về giao thông nào? 🚗" if lang == "vi" else "Good afternoon! Feeling great, what's your traffic question? 🚗",
                "neutral": "Chào buổi chiều! Có cần thông tin giao thông không? 🚗" if lang == "vi" else "Good afternoon! Need traffic information? 🚗",
                "negative": "Chào buổi chiều! Có gì không ổn? Hỏi về giao thông để mình hỗ trợ nhé! 😊" if lang == "vi" else "Good afternoon! Something wrong? Ask about traffic for help! 😊",
                "urgent": "Chào buổi chiều! Cần thông tin giao thông gấp à? Hỏi ngay nào! 🚨" if lang == "vi" else "Good afternoon! Urgent traffic info needed? Ask now! 🚨"
            },
            "evening": {
                "positive": "Chào buổi tối! Vui vẻ thế, hỏi gì về SurTraff nào? 🌙" if lang == "vi" else "Good evening! So cheerful, what's up with SurTraff? 🌙",
                "neutral": "Chào buổi tối! Hỏi gì về SurTraff nào? 🌙" if lang == "vi" else "Good evening! What's up with SurTraff? 🌙",
                "negative": "Chào buổi tối! Có gì không ổn à? Hỏi về giao thông để mình giúp nhé! 😊" if lang == "vi" else "Good evening! Something wrong? Ask about traffic for help! 😊",
                "urgent": "Chào buổi tối! Cần thông tin giao thông gấp à? Hỏi ngay nào! 🚨" if lang == "vi" else "Good evening! Urgent traffic info needed? Ask now! 🚨"
            },
            "night": {
                "positive": "Khuya rồi, vẫn vui vẻ à? Hỏi gì về giao thông nào! 🌌" if lang == "vi" else "It's late, still cheerful? Ask about traffic! 🌌",
                "neutral": "Khuya rồi, vẫn quan tâm giao thông à? Hỏi đi! 🌌" if lang == "vi" else "It's late! Still curious about traffic? Ask away! 🌌",
                "negative": "Khuya rồi, có gì không ổn à? Hỏi về giao thông để mình hỗ trợ nhé! 😊" if lang == "vi" else "It's late! Something wrong? Ask about traffic for help! 😊",
                "urgent": "Khuya rồi, cần thông tin giao thông gấp à? Hỏi ngay nào! 🚨" if lang == "vi" else "It's late! Urgent traffic info needed? Ask now! 🚨"
            }
        }
        greeting = greetings.get(time_of_day, {}).get(emotion, "Chào bạn! Hỏi gì về giao thông nhé! 😊" if lang == "vi" else "Hello! Ask about traffic! 😊")
        if history:
            greeting = f"{greeting} Tiếp nối câu hỏi trước, bạn muốn biết thêm gì? 😊" if lang == "vi" else f"{greeting} Following your last question, what else do you want to know? 😊"
        return normalize_unicode(greeting)
    except Exception as e:
        logger.error(f"Lỗi trả lời xã hội: {e}")
        return "Chào bạn! Hỏi gì về giao thông nhé! 😊" if lang == "vi" else "Hello! Ask about traffic! 😊"

# Hàm trích xuất biển số
def extract_plate(text: str) -> Optional[str]:
    patterns = [
        r'\b\d{2}[A-Z]?-\d{3,5}\b',
        r'\b\d{2}[A-Z]?-\d{3}\.\d{2}\b',
        r'\b[A-Z]{2}-\d{2}-\d{2,3}\b'
    ]
    text = normalize_unicode(text)
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            plate = match.group(0).upper()
            if re.match(r'^\d{2}[A-Z]?-\d{3,5}$', plate) or re.match(r'^\d{2}[A-Z]?-\d{3}\.\d{2}$', plate) or re.match(r'^[A-Z]{2}-\d{2}-\d{2,3}$', plate):
                return plate
    return None

# Hàm kiểm tra chất lượng câu trả lời
async def check_answer_quality(question: str, answer: str, lang: str) -> float:
    if len(answer.split()) < 5:
        logger.warning(f"Câu trả lời quá ngắn: {answer}")
        return 0.0
    try:
        embeddings = get_gemini_embeddings([normalize_unicode(question), normalize_unicode(answer)], model="text-embedding-004")
        if len(embeddings) != 2:
            logger.error("Không thể tạo nhúng cho câu hỏi hoặc câu trả lời")
            return 0.0
        
        question_vec, answer_vec = embeddings
        cosine_sim = np.dot(question_vec, answer_vec) / (np.linalg.norm(question_vec) * np.linalg.norm(answer_vec))
        logger.info(f"Chất lượng câu trả lời - Cosine similarity: {cosine_sim:.2f}")
        
        if lang == "vi" and not check_vietnamese_spelling(answer):
            logger.warning(f"Câu trả lời tiếng Việt không hợp lệ: {answer}")
            return 0.0
        
        return cosine_sim
    except Exception as e:
        logger.error(f"Lỗi kiểm tra chất lượng: {e}")
        return 0.0

# Hàm tìm kiếm ngữ nghĩa
async def semantic_search(query: str, topic: str, k: int = 30) -> List[str]:
    try:
        if topic in surtraff_details:
            return [surtraff_details[topic]]
        
        query_embedding = get_gemini_embeddings([normalize_unicode(query)], task_type="RETRIEVAL_QUERY")[0]
        if not query_embedding.size:
            logger.error("Không thể tạo embedding cho query")
            return []
        
        faiss_results = vector_official.similarity_search_by_vector(query_embedding, k=k, filter={"topic": topic}) if vector_official else []
        if not faiss_results and topic != "General":
            faiss_results = vector_official.similarity_search_by_vector(query_embedding, k=k, filter={"topic": "General"})
        
        forbidden_terms = ["culture", "tourism", "festival"]
        filtered_docs = [normalize_unicode(r.page_content) for r in faiss_results if r.page_content.strip() and not any(term in r.page_content.lower() for term in forbidden_terms)]
        unique_docs = list(dict.fromkeys(filtered_docs))
        return unique_docs[:10]
    except Exception as e:
        logger.error(f"Lỗi semantic search: {e}")
        return []

# Hàm định dạng câu trả lời
async def format_response(context: str, question: str, history_summary: str, emotion: str, lang: str, parsed_info: Dict[str, str]) -> str:
    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"""
        Dựa trên ngữ cảnh: {normalize_unicode(context[:800])}
        và lịch sử: {normalize_unicode(history_summary)}
        Thông tin phân tích: Động từ chính: {parsed_info['main_verb']}, Thực thể: {', '.join(parsed_info['entities'])}, Phương tiện: {parsed_info['vehicle_type'] or 'không xác định'}, Thời gian: {parsed_info['time'] or 'không xác định'}, Ý định: {parsed_info['intent']}
        Trả lời câu hỏi: {normalize_unicode(question)}
        Bằng {'tiếng Việt' if lang == 'vi' else 'English'}, ngắn gọn (tối đa 100 từ), đúng trọng tâm, thân thiện, phù hợp cảm xúc ({emotion}), có emoji.
        Nếu không có thông tin, trả lời 'Không có thông tin chi tiết, hỏi thêm nhé! 😊'
        """
        response = model.generate_content(
            prompt,
            generation_config={"max_output_tokens": 100, "temperature": 0.7}
        ).text.strip()
        response = normalize_unicode(response)
        response = auto_correct_spelling(response)
        if lang == "vi" and not check_vietnamese_spelling(response):
            return f"Không có thông tin chi tiết, hỏi thêm nhé! 😊" if lang == "vi" else f"No detailed information, ask more! 😊"
        return response
    except Exception as e:
        logger.error(f"Lỗi định dạng câu trả lời: {e}")
        return f"Không có thông tin chi tiết, hỏi thêm nhé! 😊" if lang == "vi" else f"No detailed information, ask more! 😊"

# Hàm phân loại câu hỏi
def classify_question_type(question: str, history: List[Dict]) -> str:
    question_lower = normalize_unicode(question.lower())
    parsed_info = parse_question(question)
    if any(keyword in question_lower for keyword in DOUBT_KEYWORDS) and history:
        return history[-1].get("type", "general")
    if parsed_info["intent"] != "unknown":
        return parsed_info["intent"]
    if any(p in question_lower for p in PLACE_NAMES) or any(k in question_lower for k in ["giao thông", "traffic", "kẹt xe", "traffic jam", "mật độ", "density", "tình trạng"]):
        return "traffic_external"
    if any(k in question_lower for k in ["hi", "hello", "chào", "how are you", "bạn khỏe không"]):
        return "social"
    if "biển số" in question_lower or extract_plate(question_lower):
        return "plate_violation"
    return "general"

# Hàm lấy dữ liệu giao thông từ web
async def fetch_external_traffic_data(query: str, lang: str, history: List[Dict]) -> str:
    cache_key = f"traffic_external:{normalize_unicode(query)}:{lang}"
    cached_response = check_similar_question(query, semantic_cache["traffic_external"])
    if cached_response:
        logger.info(f"Cache hit cho traffic query: {cache_key}")
        return cached_response
    
    try:
        location = next((place for place in PLACE_NAMES if place.lower() in normalize_unicode(query.lower())), None)
        parsed_info = parse_question(query)
        time = parsed_info["time"] or datetime.now().strftime('%d/%m/%Y')
        if not location:
            response = f"😊 Vui lòng chỉ rõ địa điểm (như Hà Nội, Cần Thơ) để mình tìm thông tin giao thông nhé!" if lang == "vi" else f"😊 Please specify a location (e.g., Hanoi, Can Tho) for traffic information!"
            semantic_cache["traffic_external"][cache_key] = response
            return response
        
        if location.lower() == "cần thơ":
            response = f"😊 Hôm nay ({time}), giao thông ở Cần Thơ có thể bị ảnh hưởng bởi ngập lụt trên các tuyến đường như Mậu Thân, Nguyễn Văn Cừ nếu có mưa lớn. 😊"
            semantic_cache["traffic_external"][cache_key] = response
            return response
        
        query_keywords = normalize_unicode(query.lower()).split()
        query_keywords.append(location.lower())
        search_query = " ".join(query_keywords)
        relevant_urls = [url for url in TRAFFIC_NEWS_URLS if any(kw in search_query for kw in [location.lower(), "kẹt xe", "traffic"])] or TRAFFIC_NEWS_URLS[:2]
        
        traffic_data = []
        for url in relevant_urls:
            text = extract_text_from_url(url)
            if text and any(k in normalize_unicode(text.lower()) for k in ["giao thông", "ùn tắc", "kẹt xe", "tai nạn"]):
                traffic_data.append(text)
        
        if not traffic_data:
            response = f"😔 Không tìm thấy thông tin giao thông cho {location} vào ngày {time}." if lang == "vi" else f"😔 No traffic information found for {location} on {time}."
            semantic_cache["traffic_external"][cache_key] = response
            return response
        
        combined_text = "\n".join(traffic_data)[:3000]
        if not combined_text.strip():
            response = f"😔 Không tìm thấy thông tin giao thông cho {location} vào ngày {time}." if lang == "vi" else f"😔 No traffic information found for {location} on {time}."
            semantic_cache["traffic_external"][cache_key] = response
            return response
        
        embeddings = get_gemini_embeddings([combined_text, query])
        if len(embeddings) != 2:
            logger.error("Không thể tạo nhúng cho dữ liệu giao thông")
            response = f"😔 Không thể xử lý thông tin giao thông cho {location}." if lang == "vi" else f"😔 Unable to process traffic information for {location}."
            semantic_cache["traffic_external"][cache_key] = response
            return response
        
        context_vec, query_vec = embeddings
        cosine_sim = np.dot(context_vec, query_vec) / (np.linalg.norm(context_vec) * np.linalg.norm(query_vec))
        
        if cosine_sim < 0.8:
            response = f"😔 Không tìm thấy thông tin phù hợp cho {location} vào ngày {time}." if lang == "vi" else f"😔 No relevant traffic information found for {location} on {time}."
            semantic_cache["traffic_external"][cache_key] = response
            return response
        
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"Tóm tắt thông tin giao thông liên quan đến '{normalize_unicode(query)}' từ dữ liệu sau:\n{normalize_unicode(combined_text)}\nTrả lời bằng {'tiếng Việt' if lang == 'vi' else 'English'}, ngắn gọn, tối đa 100 từ, có emoji."
        response = model.generate_content(
            prompt,
            generation_config={"max_output_tokens": 100, "temperature": 0.7}
        ).text.strip()
        response = normalize_unicode(response)
        response = auto_correct_spelling(response)
        
        if not check_vietnamese_spelling(response) and lang == "vi":
            response = f"😊 Không có thông tin chi tiết về {location} vào ngày {time}. Hỏi thêm về giao thông nhé!" if lang == "vi" else f"😊 No detailed information for {location} on {time}. Ask more about traffic!"
        
        semantic_cache["traffic_external"][cache_key] = response
        return response
    except Exception as e:
        logger.error(f"Lỗi fetch_external_traffic_data: {e}")
        response = f"😔 Có lỗi khi lấy thông tin giao thông cho {location}. Vui lòng thử lại!" if lang == "vi" else f"😔 Error fetching traffic information for {location}. Please try again!"
        semantic_cache["traffic_external"][cache_key] = response
        return response

# Hàm lấy dữ liệu vi phạm từ API
@retry_decorator(tries=4, delay=1, backoff=2)
async def fetch_violation_data(plate: str = None, location: str = None, lang: str = "vi") -> str:
    cache_key = f"violation:{plate}:{location}:{lang}"
    cached_response = check_similar_question(f"{plate}:{location}", semantic_cache["plate_violation"])
    if cached_response:
        logger.info(f"Cache hit cho violation query: {cache_key}")
        return cached_response
    
    try:
        api_url = "http://localhost:8081/api/violations"
        headers = {"Content-Type": "application/json"}
        response = requests.get(api_url, headers=headers, timeout=15)
        if response.status_code != 200:
            logger.error(f"API trả về mã lỗi: {response.status_code}")
            response_text = f"😔 Lỗi API, không thể kiểm tra vi phạm. Thử lại sau!" if lang == "vi" else f"😔 API error, cannot check violations. Try again later!"
            semantic_cache["plate_violation"][cache_key] = response_text
            return response_text
        data = response.json()
        
        if not data:
            response_text = f"✅ Không tìm thấy vi phạm cho {'biển số ' + plate if plate else 'khu vực ' + location} vào ngày {datetime.now().strftime('%d/%m/%Y')}." if lang == "vi" else f"✅ No violations found for {'license plate ' + plate if plate else 'location ' + location} on {datetime.now().strftime('%d/%m/%Y')}."
            semantic_cache["plate_violation"][cache_key] = response_text
            return response_text
        
        violations = []
        for item in data:
            vehicle_plate = item.get('vehicle', {}).get('licensePlate')
            item_location = item.get('camera', {}).get('location')
            if not vehicle_plate or not item_location:
                continue
            vehicle_plate = vehicle_plate.upper()
            item_location = item_location.upper()
            if (plate and vehicle_plate != plate.upper()) or (location and item_location != location.upper()):
                continue
            for detail in item.get("violationDetails", []):
                violation_time = datetime.strptime(detail.get('violationTime', ''), '%Y-%m-%dT%H:%M:%S').strftime('%H:%M %d/%m/%Y') if detail.get('violationTime') else "Không xác định"
                violation_type = detail.get('violationType', {}).get('typeName', 'Không xác định')
                location = detail.get('location', 'Không xác định')
                additional_notes = detail.get('additionalNotes', 'Không có ghi chú')
                status = item.get('status', 'Không xác định').lower()
                violations.append(
                    f"- {violation_type.capitalize()} lúc {violation_time} tại {location} ({additional_notes}, trạng thái: {status})"
                )
        
        if not violations:
            response_text = f"✅ Không tìm thấy vi phạm cho {'biển số ' + plate if plate else 'khu vực ' + location} vào ngày {datetime.now().strftime('%d/%m/%Y')}." if lang == "vi" else f"✅ No violations found for {'license plate ' + plate if plate else 'location ' + location} on {datetime.now().strftime('%d/%m/%Y')}."
        else:
            response_text = f"🚨 {'Biển số ' + plate if plate else 'Khu vực ' + location} có vi phạm:\n" + "\n".join(violations)
        
        response_text = normalize_unicode(response_text)
        semantic_cache["plate_violation"][cache_key] = response_text
        return response_text
    except requests.exceptions.RequestException as e:
        logger.error(f"Lỗi gọi API: {e}")
        response = f"😔 Lỗi hệ thống, không thể kiểm tra vi phạm!" if lang == "vi" else f"😔 System error, cannot check violations!"
        semantic_cache["plate_violation"][cache_key] = response
        return response

# Hàm tải chunks từ phản hồi
def load_feedback_chunks() -> tuple:
    chunks = []
    metadata = []
    try:
        if not os.path.exists(FEEDBACK_FILE):
            return [], []
        with open(FEEDBACK_FILE, "r", encoding="utf-8-sig") as f:
            for line in f:
                if not line.strip():
                    continue
                try:
                    entry = json.loads(line)
                    content = normalize_unicode(entry.get("content", ""))
                    question = normalize_unicode(entry.get("question", ""))
                    topic = entry.get("topic", "General")
                    if content and question:
                        chunk = f"{question} {content}"
                        chunks.append(chunk)
                        metadata.append({"topic": topic, "source": "feedback"})
                except json.JSONDecodeError:
                    logger.warning(f"JSON không hợp lệ trong feedback: {line.strip()}")
                    continue
        return chunks, metadata
    except Exception as e:
        logger.error(f"Lỗi tải feedback chunks: {e}")
        return [], []

# Hàm cập nhật FAISS index người dùng
async def update_user_index():
    global vector_user
    user_index_path = FAISS_INDEX_PATH + "_user.pkl"
    
    if not check_system_resources() or not check_disk_space(os.path.dirname(FAISS_INDEX_PATH), 1000):
        logger.error("Tài nguyên hệ thống không đủ để cập nhật FAISS index")
    
    chunks, metadata = load_feedback_chunks()
    if not chunks:
        logger.info("Không có dữ liệu phản hồi để cập nhật index")
        return
    
    try:
        embeddings = get_gemini_embeddings(chunks, task_type="RETRIEVAL_DOCUMENT")
        if not embeddings:
            logger.error("Không thể tạo embeddings từ Gemini API")
            return
        
        dimension = len(embeddings[0])
        index = faiss.IndexHNSWFlat(dimension, 32)
        index.hnsw.efConstruction = 200
        index.hnsw.efSearch = 40
        index.add(np.array(embeddings))
        vector_user = FAISS.from_vectors(vectors=embeddings, texts=chunks, metadatas=metadata, faiss_index=index)
        
        with open(user_index_path, "wb") as f:
            import pickle
            pickle.dump(vector_user, f)
        logger.info("Đã cập nhật FAISS user index (sử dụng CPU)")
    except Exception as e:
        logger.error(f"Lỗi cập nhật FAISS user index: {e}")

# Hàm tạo vector FAISS
def build_vector_official():
    global surtraff_details
    official_index_path = FAISS_INDEX_PATH + "_official.pkl"
    
    if not check_system_resources() or not check_disk_space(os.path.dirname(FAISS_INDEX_PATH), 1000):
        logger.error("Tài nguyên hệ thống không đủ để tạo FAISS index")
    
    try:
        if os.path.exists(official_index_path) and os.path.getsize(official_index_path) > 0:
            with open(official_index_path, "rb") as f:
                import pickle
                store = pickle.load(f)
            logger.info("Đã tải FAISS official index")
            return store
    except Exception as e:
        logger.error(f"Lỗi tải FAISS official index: {e}, tạo mới index")
    
    surtraff_text = extract_text_from_txt(KNOWLEDGE_TXT_PATH, prioritize_dialogs=True)
    social_text = extract_text_from_txt(SOCIAL_TXT_PATH)
    combined_text = f"{surtraff_text}\n{social_text}"
    if not combined_text.strip():
        logger.error("File surtraff_knowledge.txt, traffic_dialogs.txt hoặc social.txt rỗng")
        return None
    
    surtraff_chunks = text_splitter.split_text(combined_text)
    if not surtraff_chunks:
        logger.error("Không có dữ liệu trong surtraff_chunks")
        return None
    
    surtraff_chunks = list(dict.fromkeys(surtraff_chunks))
    surtraff_metadata = [{"topic": detect_topic(chunk), "source": "surtraff"} for chunk in surtraff_chunks]
    
    try:
        forbidden_terms = ["culture", "tourism", "festival"]
        filtered_chunks = [c for c in surtraff_chunks if c.strip() and not any(term in normalize_unicode(c.lower()) for term in forbidden_terms)]
        embeddings = get_gemini_embeddings(texts=filtered_chunks, task_type="RETRIEVAL_DOCUMENT", output_dimensionality=512)
        if not embeddings:
            logger.error("Không thể tạo embeddings từ Gemini API")
            return None
        
        dimension = len(embeddings[0])
        index = faiss.IndexHNSWFlat(dimension, 32)
        index.hnsw.efConstruction = 200
        index.hnsw.efSearch = 40
        index.add(np.array(embeddings))
        store = FAISS.from_vectors(vectors=embeddings, texts=filtered_chunks, metadatas=[m for c, m in zip(surtraff_chunks, surtraff_metadata) if c.strip() and not any(term in normalize_unicode(c.lower()) for term in forbidden_terms)], faiss_index=index)
        
        with open(official_index_path, "wb") as f:
            import pickle
            pickle.dump(store, f)
        logger.info("Đã tạo và lưu FAISS official index (sử dụng CPU)")
        return store
    except Exception as e:
        logger.error(f"Lỗi tạo FAISS index: {e}")
        return None

def build_vector_user():
    global vector_user
    user_index_path = FAISS_INDEX_PATH + "_user.pkl"
    
    if not check_system_resources() or not check_disk_space(os.path.dirname(FAISS_INDEX_PATH), 1000):
        logger.error("Tài nguyên hệ thống không đủ để tạo FAISS user index")
        
    
    try:
        if os.path.exists(user_index_path) and os.path.getsize(user_index_path) > 0:
            with open(user_index_path, "rb") as f:
                import pickle
                store = pickle.load(f)
            logger.info("Đã tải FAISS user index")
            return store
    except Exception as e:
        logger.error(f"Lỗi tải FAISS user index: {e}, tạo mới index")
    
    chunks, metadata = load_feedback_chunks()
    if not chunks:
        logger.info("Không có dữ liệu phản hồi để tạo index")
        return None
    
    try:
        embeddings = get_gemini_embeddings(chunks, task_type="RETRIEVAL_DOCUMENT")
        if not embeddings:
            logger.error("Không thể tạo embeddings từ Gemini API")
            return None
        
        dimension = len(embeddings[0])
        index = faiss.IndexHNSWFlat(dimension, 32)
        index.hnsw.efConstruction = 200
        index.hnsw.efSearch = 40
        index.add(np.array(embeddings))
        vector_user = FAISS.from_vectors(vectors=embeddings, texts=chunks, metadatas=metadata, faiss_index=index)
        
        with open(user_index_path, "wb") as f:
            import pickle
            pickle.dump(vector_user, f)
        logger.info("Đã tạo và lưu FAISS user index (sử dụng CPU)")
        return vector_user
    except Exception as e:
        logger.error(f"Lỗi tạo FAISS user index: {e}")
        return None

vector_official = build_vector_official()
vector_user = build_vector_user()

# Hàm chính xử lý câu hỏi
async def process_question(question: str, history: List[Dict] = []) -> Dict[str, str]:
    try:
        if not question.strip() or not is_safe_input(question):
            return {"response": "Câu hỏi không hợp lệ, vui lòng thử lại! 😊", "lang": "vi", "suggestion": "", "type": "general"}

        cleaned_question = clean_question(question)
        if not cleaned_question:
            return {"response": "Câu hỏi không hợp lệ, vui lòng thử lại! 😊", "lang": "vi", "suggestion": "", "type": "general"}

        lang = await detect_language(cleaned_question, history)
        question_type = classify_question_type(cleaned_question, history)
        parsed_info = parse_question(cleaned_question)
        time_of_day = get_time_of_day()
        emotion = detect_emotion(cleaned_question)
        history_summary = await summarize_context(history)
        plate = extract_plate(cleaned_question)
        location = next((place for place in PLACE_NAMES if place.lower() in normalize_unicode(cleaned_question.lower())), None)

        cache_key = f"{question_type}:{normalize_unicode(cleaned_question)}:{lang}"
        cached_response = check_similar_question(cleaned_question, semantic_cache.get(question_type, semantic_cache["general"]))
        if cached_response:
            logger.info(f"Cache hit cho câu hỏi: {cache_key}")
            suggestion = await generate_suggested_questions(history, question_type, lang)
            return {"response": cached_response, "lang": lang, "suggestion": suggestion, "type": question_type}

        if question_type == "social":
            response = await get_social_response(cleaned_question, lang, time_of_day, history, emotion)
            semantic_cache["social"][cache_key] = response
            suggestion = await generate_suggested_questions(history, question_type, lang)
            log_chat(cleaned_question, response, lang, question_type)
            save_feedback(cleaned_question, response, lang)
            return {"response": response, "lang": lang, "suggestion": suggestion, "type": question_type}

        if question_type == "plate_violation" and plate:
            response = await fetch_violation_data(plate=plate, location=location, lang=lang)
            suggestion = await generate_suggested_questions(history, question_type, lang)
            log_chat(cleaned_question, response, lang, question_type, plate)
            save_feedback(cleaned_question, response, lang)
            return {"response": response, "lang": lang, "suggestion": suggestion, "type": question_type}

        if question_type == "traffic_external" and location:
            response = await fetch_external_traffic_data(cleaned_question, lang, history)
            suggestion = await generate_suggested_questions(history, question_type, lang)
            log_chat(cleaned_question, response, lang, question_type)
            save_feedback(cleaned_question, response, lang)
            return {"response": response, "lang": lang, "suggestion": suggestion, "type": question_type}

        context_docs = await semantic_search(cleaned_question, question_type)
        context = "\n".join(context_docs) if context_docs else surtraff_details.get(question_type, "")
        if not context.strip():
            context = surtraff_details.get("General", "Không có thông tin chi tiết.")

        response = await format_response(context, cleaned_question, history_summary, emotion, lang, parsed_info)
        quality_score = await check_answer_quality(cleaned_question, response, lang)
        if quality_score < 0.7:
            logger.warning(f"Chất lượng câu trả lời thấp ({quality_score:.2f}), thử lại với Gemini")
            try:
                model = genai.GenerativeModel("gemini-1.5-flash")
                prompt = f"""
                Trả lời câu hỏi: {normalize_unicode(cleaned_question)}
                Dựa trên ngữ cảnh: {normalize_unicode(context[:800])}
                Ngữ cảnh lịch sử: {normalize_unicode(history_summary)}
                Thông tin phân tích: Động từ chính: {parsed_info['main_verb']}, Thực thể: {', '.join(parsed_info['entities'])}, Phương tiện: {parsed_info['vehicle_type'] or 'không xác định'}, Thời gian: {parsed_info['time'] or 'không xác định'}, Ý định: {parsed_info['intent']}
                Bằng {'tiếng Việt' if lang == 'vi' else 'English'}, ngắn gọn (tối đa 100 từ), thân thiện, phù hợp cảm xúc ({emotion}), có emoji.
                Nếu không có thông tin, trả lời 'Không có thông tin chi tiết, hỏi thêm nhé! 😊'
                """
                response = model.generate_content(
                    prompt,
                    generation_config={"max_output_tokens": 100, "temperature": 0.7}
                ).text.strip()
                response = normalize_unicode(response)
                response = auto_correct_spelling(response)
                quality_score = await check_answer_quality(cleaned_question, response, lang)
                if quality_score < 0.5:
                    response = f"Không có thông tin chi tiết, hỏi thêm nhé! 😊" if lang == "vi" else f"No detailed information, ask more! 😊"
            except Exception as e:
                logger.error(f"Lỗi gọi Gemini API: {e}")
                response = f"Không có thông tin chi tiết, hỏi thêm nhé! 😊" if lang == "vi" else f"No detailed information, ask more! 😊"

        semantic_cache[question_type][cache_key] = response
        suggestion = await generate_suggested_questions(history, question_type, lang)
        log_chat(cleaned_question, response, lang, question_type, plate)
        save_feedback(cleaned_question, response, lang)
        return {"response": response, "lang": lang, "suggestion": suggestion, "type": question_type}

    except Exception as e:
        logger.error(f"Lỗi xử lý câu hỏi: {e}")
        response = f"😔 Có lỗi xảy ra, vui lòng thử lại!" if lang == "vi" else f"😔 An error occurred, please try again!"
        suggestion = await generate_suggested_questions(history, "general", lang)
        log_chat(cleaned_question, response, lang, "error", plate)
        return {"response": response, "lang": lang, "suggestion": suggestion, "type": "error"}

# Hàm xử lý câu hỏi đồng bộ (cho môi trường không async)
def process_question_sync(question: str, history: List[Dict] = []) -> Dict[str, str]:
    return asyncio.run(process_question(question, history))

# Hàm chạy chatbot trong chế độ tương tác
async def run_chatbot():
    history = []
    print("Chào bạn! Hỏi mình về giao thông hoặc SurTraff nhé! 😊 (Nhập 'exit' để thoát)")
    while True:
        question = input("Câu hỏi của bạn: ")
        if question.lower() == "exit":
            print("Tạm biệt! 😊")
            break
        result = await process_question(question, history)
        print(f"Trả lời: {result['response']}")
        if result['suggestion']:
            print(f"{result['suggestion']}")
        history.append({
            "sentence": normalize_unicode(question),
            "response": normalize_unicode(result['response']),
            "lang": result['lang'],
            "type": result['type']
        })
        history = history[-5:]  # Giữ tối đa 5 câu hỏi gần nhất

# Hàm chạy chatbot đồng bộ
def run_chatbot_sync():
    asyncio.run(run_chatbot())

if __name__ == "__main__":
    run_chatbot_sync()
