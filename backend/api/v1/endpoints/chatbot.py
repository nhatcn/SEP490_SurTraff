from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ValidationError
from typing import List
from datetime import datetime
import logging
from services.chatbot.process_question import process_question
logger = logging.getLogger(__name__)

router = APIRouter()

class HistoryTurn(BaseModel):
    sentence: str
    response: str = ""
    type: str = "general"
    lang: str = "vi"

class QueryRequest(BaseModel):
    sentence: str
    lang: str = "vi"
    history: List[HistoryTurn] = []

@router.post("/query")  # Chuẩn hóa URL, bỏ dấu "/" cuối
async def query_chatbot(request: QueryRequest):
    try:
        # Ghi log dữ liệu đầu vào
        logger.info(f"Nhận request: sentence={request.sentence}, lang={request.lang}, history={request.history}")
        
        # Kiểm tra thêm đầu vào
        if not request.sentence.strip():
            logger.warning("Câu hỏi rỗng")
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Câu hỏi không được để trống",
                    "suggestion": "Hỏi về giao thông hoặc SurTraff nhé! 😊" if request.lang == "vi" else "Ask about traffic or SurTraff! 😊"
                }
            )
        if request.lang not in ["vi", "en"]:
            logger.warning(f"Ngôn ngữ không hợp lệ: {request.lang}")
            raise HTTPException(
                status_code=400,
                detail={
                    "error": f"Ngôn ngữ '{request.lang}' không hợp lệ. Sử dụng 'vi' hoặc 'en'",
                    "suggestion": "Hỏi về giao thông hoặc SurTraff nhé! 😊" if request.lang == "vi" else "Ask about traffic or SurTraff! 😊"
                }
            )
        if len(request.history) > 5:
            logger.warning(f"Lịch sử hội thoại quá dài: {len(request.history)} lượt")
            raise HTTPException(
                status_code=400,
                detail={
                    "error": "Lịch sử hội thoại vượt quá 5 lượt",
                    "suggestion": "Xóa lịch sử và thử lại nhé! 😊" if request.lang == "vi" else "Clear history and try again! 😊"
                }
            )

        # Gọi hàm xử lý câu hỏi
        response = await process_question(
            question=request.sentence,
            history=[turn.dict() for turn in request.history],
            lang=request.lang
        )
        return response

    except ValidationError as ve:
        logger.error(f"Lỗi xác thực Pydantic: {str(ve)}", exc_info=True)
        raise HTTPException(
            status_code=422,
            detail={
                "error": f"Dữ liệu đầu vào không hợp lệ: {str(ve)}",
                "suggestion": "Kiểm tra câu hỏi và lịch sử hội thoại nhé! 😊" if request.lang == "vi" else "Check your question and chat history! 😊"
            }
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Lỗi endpoint /api/query: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail={
                "error": f"Lỗi server: {str(e)}",
                "suggestion": "Hỏi về giao thông hoặc SurTraff nhé! 😊" if request.lang == "vi" else "Ask about traffic or SurTraff! 😊"
            }
        )
