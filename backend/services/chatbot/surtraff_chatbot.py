import asyncio
import pickle
import faiss
from typing import List, Dict, Optional
from services.chatbot.surtraff_utils import *

# Khởi tạo surtraff_details
surtraff_details = build_surtraff_details()

# Text splitter
text_splitter = RecursiveCharacterTextSplitter(chunk_size=150, chunk_overlap=50)

# Biến toàn cục
vector_official = None
vector_user = None

# Hàm cập nhật FAISS index người dùng
async def update_user_index():
    global vector_user
    user_index_path = FAISS_INDEX_PATH + "_user.pkl"
    
    if not check_system_resources() or not check_disk_space(os.path.dirname(FAISS_INDEX_PATH), 1000):
        logger.error("Tài nguyên hệ thống không đủ để cập nhật FAISS index")
        return
    
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
        vector_user = FAISS.from_texts(
            texts=chunks,
            embedding=lambda texts: get_gemini_embeddings(texts, task_type="RETRIEVAL_DOCUMENT"),
            metadatas=metadata,
            faiss_index=index
        )
        
        with open(user_index_path, "wb") as f:
            pickle.dump(vector_user, f)
        logger.info("Đã cập nhật FAISS user index (sử dụng CPU)")
    except Exception as e:
        logger.error(f"Lỗi cập nhật FAISS user index: {str(e)}")

# Hàm tạo vector FAISS chính thức
def build_vector_official():
    global surtraff_details
    official_index_path = FAISS_INDEX_PATH + "_official.pkl"
    
    if not check_system_resources() or not check_disk_space(os.path.dirname(FAISS_INDEX_PATH), 1000):
        logger.error("Tài nguyên hệ thống không đủ để tạo FAISS index")
        return None
    
    try:
        if os.path.exists(official_index_path) and os.path.getsize(official_index_path) > 0:
            with open(official_index_path, "rb") as f:
                store = pickle.load(f)
            logger.info("Đã tải FAISS official index")
            return store
        else:
            logger.info(f"File {official_index_path} không tồn tại hoặc rỗng, tạo mới index")
    except Exception as e:
        logger.error(f"Lỗi tải FAISS official index: {str(e)}, tạo mới index")
    
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
        store = FAISS.from_texts(
            texts=filtered_chunks,
            embedding=lambda texts: get_gemini_embeddings(texts, task_type="RETRIEVAL_DOCUMENT"),
            metadatas=[m for c, m in zip(surtraff_chunks, surtraff_metadata) if c.strip() and not any(term in normalize_unicode(c.lower()) for term in forbidden_terms)],
            faiss_index=index
        )
        
        with open(official_index_path, "wb") as f:
            pickle.dump(store, f)
        logger.info("Đã tạo và lưu FAISS official index (sử dụng CPU)")
        return store
    except Exception as e:
        logger.error(f"Lỗi tạo FAISS index: {e}")
        return None

# Hàm tạo vector FAISS cho người dùng
def build_vector_user():
    global vector_user
    user_index_path = FAISS_INDEX_PATH + "_user.pkl"
    
    if not check_system_resources() or not check_disk_space(os.path.dirname(FAISS_INDEX_PATH), 1000):
        logger.error("Tài nguyên hệ thống không đủ để tạo FAISS user index")
        return None
    
    try:
        if os.path.exists(user_index_path) and os.path.getsize(user_index_path) > 0:
            with open(user_index_path, "rb") as f:
                store = pickle.load(f)
            logger.info("Đã tải FAISS user index")
            return store
        else:
            logger.info(f"File {user_index_path} không tồn tại hoặc rỗng, tạo mới index")
    except Exception as e:
        logger.error(f"Lỗi tải FAISS user index: {str(e)}, tạo mới index")
    
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
        vector_user = FAISS.from_texts(
            texts=chunks,
            embedding=lambda texts: get_gemini_embeddings(texts, task_type="RETRIEVAL_DOCUMENT"),
            metadatas=metadata,
            faiss_index=index
        )
        
        with open(user_index_path, "wb") as f:
            pickle.dump(vector_user, f)
        logger.info("Đã tạo và lưu FAISS user index (sử dụng CPU)")
        return vector_user
    except Exception as e:
        logger.error(f"Lỗi tạo FAISS user index: {e}")
        return None

# Hàm xử lý câu hỏi
