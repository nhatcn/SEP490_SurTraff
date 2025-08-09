from typing import List, Dict, Optional
import asyncio
from services.chatbot.surtraff_utils import *
from services.chatbot.surtraff_chatbot import *

init_faiss_index()

async def run_handler(handler, *args):
    try:
        res = await handler(*args)
        return res
    except Exception as e:
        logger.error(f"Lỗi handler {handler.__name__}: {e}")
        return {"response": None, "confidence": 0.0, "type": handler.__name__, "lang": args[2] if len(args) > 2 else "vi"}

async def process_question(question: str, history: List[Dict], lang: str = "vi") -> Dict[str, str]:
    if not question or not isinstance(question, str) or not is_safe_input(question):
        return {"response": "Câu hỏi không hợp lệ, vui lòng thử lại! 😔" if lang == "vi" else "Invalid question, please try again! 😔", "suggestion": "Hỏi về giao thông hoặc SurTraff nhé! 😊" if lang == "vi" else "Ask about traffic or SurTraff! 😊", "type": "error", "lang": lang}

    question = clean_question(question)
    if not question:
        return {"response": "Câu hỏi không hợp lệ, vui lòng thử lại! 😔" if lang == "vi" else "Invalid question, please try again! 😔", "suggestion": "Hỏi về giao thông hoặc SurTraff nhé! 😊" if lang == "vi" else "Ask about traffic or SurTraff! 😊", "type": "error", "lang": lang}

    detected_lang = await detect_language(question, history)
    if detected_lang == "en" and lang == "vi":
        question = await translate_en2vi(question)
    elif detected_lang == "vi" and lang == "en":
        question = await translate_vi2en(question)

    plate = extract_plate(question)
    location = next((place for place in PLACE_NAMES if place.lower() in normalize_unicode(question.lower())), None)
    time_of_day = get_time_of_day()
    emotion = detect_emotion(question)
    question_type = classify_question_type(question, history)
    history_summary = await summarize_context(history)
    parsed_info = parse_question(question)

    async def plate_handler():
        if not plate:
            return {"response": None, "confidence": 0.0, "type": "plate_violation", "lang": lang}
        response = await fetch_violation_data(plate=plate, lang=lang)
        quality = await check_answer_quality(question, response, lang)
        return {"response": response, "confidence": quality, "type": "plate_violation", "lang": lang}

    async def traffic_handler():
        if not location:
            return {"response": None, "confidence": 0.0, "type": "traffic_external", "lang": lang}
        response = await fetch_external_traffic_data(question, lang, history)
        quality = await check_answer_quality(question, response, lang)
        return {"response": response, "confidence": quality, "type": "traffic_external", "lang": lang}

    async def method_handler():
        topic = detect_topic(question)
        response = surtraff_details.get(topic)
        if response:
            if lang == "en":
                response = await translate_vi2en(response)
            quality = await check_answer_quality(question, response, lang)
            return {"response": response, "confidence": quality, "type": "method_violation", "lang": lang}
        return {"response": None, "confidence": 0.0, "type": "method_violation", "lang": lang}

    async def social_handler():
        if question_type != "social":
            return {"response": None, "confidence": 0.0, "type": "social", "lang": lang}
        response = await get_social_response(question, lang, time_of_day, history, emotion)
        return {"response": response, "confidence": 1.0, "type": "social", "lang": lang}

    async def rag_handler():
        context_docs = await semantic_search(question, question_type)
        context = "\n".join(context_docs) if context_docs else surtraff_details.get(detect_topic(question), "")
        if not context:
            return {"response": None, "confidence": 0.0, "type": question_type, "lang": lang}
        response = await format_response(context, question, history_summary, emotion, lang, parsed_info)
        quality = await check_answer_quality(question, response, lang)
        return {"response": response, "confidence": quality, "type": question_type, "lang": lang}

    handlers = [plate_handler, traffic_handler, method_handler, social_handler, rag_handler]
    results = await asyncio.gather(*(run_handler(h) for h in handlers))
    best = max(results, key=lambda r: r["confidence"])

    if not best["response"] or best["confidence"] < 0.6:
        fallback_msg = "😔 Không có thông tin chi tiết, hỏi thêm nhé!" if lang == "vi" else "😔 No detailed information, ask more!"
        suggestion = await generate_suggested_questions(history, "General", lang)
        log_chat(question, fallback_msg, lang, question_type, plate)
        save_feedback(question, fallback_msg, lang)
        return {"response": fallback_msg, "suggestion": suggestion, "type": question_type, "lang": lang}

    suggestion = await generate_suggested_questions(history, best["type"], lang)
    log_chat(question, best["response"], lang, best["type"], plate)
    save_feedback(question, best["response"], lang)
    return {"response": best["response"], "suggestion": suggestion, "type": best["type"], "lang": lang}
