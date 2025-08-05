from typing import List, Dict, Optional
from services.chatbot.surtraff_utils import *

# Hàm xử lý câu hỏi
async def process_question(question: str, history: List[Dict], lang: str = "vi") -> Dict[str, str]:
    if not question or not isinstance(question, str) or not is_safe_input(question):
        return {
            "response": "Câu hỏi không hợp lệ, vui lòng thử lại! 😔" if lang == "vi" else "Invalid question, please try again! 😔",
            "suggestion": "Hỏi về giao thông hoặc SurTraff nhé! 😊" if lang == "vi" else "Ask about traffic or SurTraff! 😊",
            "type": "error",
            "lang": lang
        }
    
    question = clean_question(question)
    if not question:
        return {
            "response": "Câu hỏi không hợp lệ, vui lòng thử lại! 😔" if lang == "vi" else "Invalid question, please try again! 😔",
            "suggestion": "Hỏi về giao thông hoặc SurTraff nhé! 😊" if lang == "vi" else "Ask about traffic or SurTraff! 😊",
            "type": "error",
            "lang": lang
        }
    
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
    
    if question_type == "social":
        response = await get_social_response(question, lang, time_of_day, history, emotion)
        suggestion = await generate_suggested_questions(history, "General", lang)
        log_chat(question, response, lang, question_type)
        save_feedback(question, response, lang)
        return {
            "response": response,
            "suggestion": suggestion,
            "type": question_type,
            "lang": lang
        }
    
    if question_type == "plate_violation" and plate:
        cache_key = f"plate_violation:{plate}:{lang}"
        cached_response = check_similar_question(question, semantic_cache["plate_violation"])
        if cached_response:
            suggestion = await generate_suggested_questions(history, question_type, lang)
            log_chat(question, cached_response, lang, question_type, plate)
            return {
                "response": cached_response,
                "suggestion": suggestion,
                "type": question_type,
                "lang": lang
            }
        
        response = await fetch_violation_data(plate=plate, lang=lang)
        suggestion = await generate_suggested_questions(history, question_type, lang)
        quality_score = await check_answer_quality(question, response, lang)
        if quality_score < 0.8:
            response = f"😔 Không có thông tin chi tiết cho biển số {plate}. Hỏi thêm nhé!" if lang == "vi" else f"😔 No detailed information for plate {plate}. Ask more!"
        semantic_cache["plate_violation"][cache_key] = response
        log_chat(question, response, lang, question_type, plate)
        save_feedback(question, response, lang)
        return {
            "response": response,
            "suggestion": suggestion,
            "type": question_type,
            "lang": lang
        }
    
    if question_type == "traffic_external" and location:
        cache_key = f"traffic_external:{location}:{lang}"
        cached_response = check_similar_question(question, semantic_cache["traffic_external"])
        if cached_response:
            suggestion = await generate_suggested_questions(history, question_type, lang)
            log_chat(question, cached_response, lang, question_type)
            return {
                "response": cached_response,
                "suggestion": suggestion,
                "type": question_type,
                "lang": lang
            }
        
        response = await fetch_external_traffic_data(question, lang, history)
        suggestion = await generate_suggested_questions(history, question_type, lang)
        quality_score = await check_answer_quality(question, response, lang)
        if quality_score < 0.8:
            response = f"😔 Không có thông tin chi tiết về giao thông tại {location}. Hỏi thêm nhé!" if lang == "vi" else f"😔 No detailed traffic information for {location}. Ask more!"
        semantic_cache["traffic_external"][cache_key] = response
        log_chat(question, response, lang, question_type)
        save_feedback(question, response, lang)
        return {
            "response": response,
            "suggestion": suggestion,
            "type": question_type,
            "lang": lang
        }
    
    if question_type == "method_violation":
        cache_key = f"method_violation:{question}:{lang}"
        cached_response = check_similar_question(question, semantic_cache["method_violation"])
        if cached_response:
            suggestion = await generate_suggested_questions(history, question_type, lang)
            log_chat(question, cached_response, lang, question_type)
            return {
                "response": cached_response,
                "suggestion": suggestion,
                "type": question_type,
                "lang": lang
            }
        
        topic = detect_topic(question)
        response = surtraff_details.get(topic, f"😔 Không có thông tin chi tiết về cách phát hiện vi phạm này. Hỏi thêm nhé!" if lang == "vi" else f"😔 No detailed information on this violation detection method. Ask more!")
        if lang == "en" and topic in surtraff_details:
            response = await translate_vi2en(response)
        suggestion = await generate_suggested_questions(history, question_type, lang)
        quality_score = await check_answer_quality(question, response, lang)
        if quality_score < 0.8:
            response = f"😔 Không có thông tin chi tiết về cách phát hiện vi phạm này. Hỏi thêm nhé!" if lang == "vi" else f"😔 No detailed information on this violation detection method. Ask more!"
        semantic_cache["method_violation"][cache_key] = response
        log_chat(question, response, lang, question_type)
        save_feedback(question, response, lang)
        return {
            "response": response,
            "suggestion": suggestion,
            "type": question_type,
            "lang": lang
        }
    
    cache_key = f"{question_type}:{question}:{lang}"
    cached_response = check_similar_question(question, semantic_cache[question_type])
    if cached_response:
        suggestion = await generate_suggested_questions(history, question_type, lang)
        log_chat(question, cached_response, lang, question_type)
        return {
            "response": cached_response,
            "suggestion": suggestion,
            "type": question_type,
            "lang": lang
        }
    
    context_docs = await semantic_search(question, question_type)
    context = "\n".join(context_docs) if context_docs else ""
    if not context:
        context = surtraff_details.get(detect_topic(question), "")
    
    response = await format_response(context, question, history_summary, emotion, lang, parsed_info)
    suggestion = await generate_suggested_questions(history, question_type, lang)
    quality_score = await check_answer_quality(question, response, lang)
    if quality_score < 0.8:
        response = f"😔 Không có thông tin chi tiết, hỏi thêm nhé!" if lang == "vi" else f"😔 No detailed information, ask more!"
    
    semantic_cache[question_type][cache_key] = response
    log_chat(question, response, lang, question_type, plate)
    save_feedback(question, response, lang)
    
    return {
        "response": response,
        "suggestion": suggestion,
        "type": question_type,
        "lang": lang
    }
