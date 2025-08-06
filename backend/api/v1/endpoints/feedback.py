from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from services.chatbot.process_question import process_question
from services.chatbot.surtraff_utils import detect_topic, save_feedback
import logging
from datetime import datetime

# Cấu hình logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

router = APIRouter()

class HistoryTurn(BaseModel):
    sentence: str = Field(..., min_length=1, max_length=500, description="Câu hỏi hoặc câu nói trong lịch sử hội thoại")
    response: str = Field(..., min_length=1, max_length=1000, description="Câu trả lời từ chatbot")
    type: str = Field(..., description="Loại câu hỏi (traffic_law, plate_violation, traffic_external, method_violation, social, general)")
    lang: str = Field(..., description="Ngôn ngữ của câu hỏi và trả lời (vi hoặc en)")

class QueryRequest(BaseModel):
    sentence: str = Field(..., min_length=1, max_length=500, description="Câu hỏi hoặc câu nói từ người dùng")
    lang: str = Field(default="vi", description="Ngôn ngữ trả lời (vi hoặc en)")
    history: List[HistoryTurn] = Field(default=[], max_items=5, description="Lịch sử hội thoại, tối đa 5 lượt")

class FeedbackRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500, description="Câu hỏi liên quan đến phản hồi")
    corrected_answer: str = Field(..., min_length=1, max_length=1000, description="Câu trả lời sửa đổi từ người dùng")
    lang: str = Field(default="vi", description="Ngôn ngữ của phản hồi (vi hoặc en)")



@router.post("/", response_model=dict)
async def submit_feedback(data: FeedbackRequest):
    """
    Nhận và xác minh phản hồi từ người dùng, chỉ chấp nhận phản hồi liên quan đến giao thông/SurTraff.
    """
    try:
        # Kiểm tra chủ đề của phản hồi
        topic = detect_topic(data.question)
        if topic == "General" and not any(keyword in data.question.lower() for keyword in ["surtraff", "giao thông", "traffic"]):
            logger.warning(f"Off-topic feedback question: {data.question[:50]}...")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": "Phản hồi không liên quan đến giao thông hoặc SurTraff.",
                    "suggestion": "Hãy cung cấp phản hồi về SurTraff hoặc giao thông, ví dụ: 'SurTraff đo tốc độ bằng radar và camera.'"
                }
            )

        # Gọi hàm save_feedback để lưu phản hồi
        save_feedback(
            question=data.question,
            response=data.corrected_answer,
            lang=data.lang
        )

        # Ghi log phản hồi
        response = "Phản hồi của bạn đã được ghi nhận, cảm ơn bạn! 😊"
        logger.info(f"Feedback processed: Q={data.question[:30]}..., A={data.corrected_answer[:30]}..., Response={response[:30]}...")

        return {
            "response": response,
            "timestamp": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Error processing feedback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error": "Lỗi khi xử lý phản hồi, vui lòng thử lại sau!",
                "suggestion": "Hãy cung cấp phản hồi đúng và liên quan đến giao thông/SurTraff!"
            }
        )