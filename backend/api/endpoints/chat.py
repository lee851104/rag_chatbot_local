from chat_history import init_chat_history
from config import settings
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from helpers.log import get_logger
from schemas.chat import ChatRequest
from services.chat_service.chat_history_repository import ChatHistoryRepository

from api.deps import LlamaCppClientDep, SessionDep

logger = get_logger(__name__)

router = APIRouter()


@router.post("/chat/")
async def chat(query: ChatRequest, llm_client: LlamaCppClientDep, session: SessionDep):
    logger.info(query)

    try:
        repository = ChatHistoryRepository(session)
        records = repository.get_recent(query.conversation_id, settings.CHAT_HISTORY_LENGTH)
        chat_history = init_chat_history(
            total_length=settings.CHAT_HISTORY_LENGTH,
            messages=[f"question: {record.question}, answer: {record.answer}" for record in records],
        )
        prompt = query.text
        if chat_history:
            prompt = llm_client.generate_refined_answer_conversation_awareness_prompt(
                query.text,
                str(chat_history),
            )

        answer_text = await llm_client.async_generate_answer(prompt, max_new_tokens=settings.MAX_NEW_TOKENS)
        repository.append(query.conversation_id, query.text, answer_text)
        return JSONResponse({"response": answer_text})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Failed to generate response: {str(e)}"})
