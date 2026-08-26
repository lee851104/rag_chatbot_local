from functools import partial
from typing import Annotated

from chat_history import init_chat_history
from config import settings
from fastapi import APIRouter, Path, Response, WebSocket, WebSocketDisconnect
from helpers.log import get_logger
from schemas.chat import ChatHistoryResponse, ChatMessageInfo, ChatRequest
from services.chat_service.chat_history_repository import ChatHistoryRepository

from api.deps import LlamaCppClientDep, RerankerDep, SessionDep, VectorDatabaseDep
from api.services.chat_stream import stream_chat_response, stream_rag_response

logger = get_logger(__name__)

router = APIRouter()
ConversationIdPath = Annotated[
    str,
    Path(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$"),
]


@router.get("/chat/history/{conversation_id}", response_model=ChatHistoryResponse)
async def get_chat_history(conversation_id: ConversationIdPath, session: SessionDep):
    """Return one persisted conversation."""
    records = ChatHistoryRepository(session).get_all(conversation_id)
    return ChatHistoryResponse(
        conversation_id=conversation_id,
        messages=[
            ChatMessageInfo(
                id=record.id,
                question=record.question,
                answer=record.answer,
                created_at=record.created_at.isoformat(),
            )
            for record in records
            if record.id is not None
        ],
    )


@router.delete(path="/chat/history/{conversation_id}", status_code=204)
async def clear_chat_history(conversation_id: ConversationIdPath, session: SessionDep):
    """Delete one persisted conversation."""
    ChatHistoryRepository(session).clear(conversation_id)
    return Response(status_code=204)


@router.websocket(
    path="/chat/stream",
)
async def chat_stream(
    websocket: WebSocket,
    llm_client: LlamaCppClientDep,
    index: VectorDatabaseDep,
    reranker: RerankerDep,
    session: SessionDep,
):
    """WebSocket endpoint for streaming chat responses token by token."""
    await websocket.accept()
    logger.info("WebSocket connection accepted")
    repository = ChatHistoryRepository(session)
    try:
        while True:
            data = await websocket.receive_json()
            logger.info(f"Received data: {data}")
            query = ChatRequest(**data)
            records = repository.get_recent(query.conversation_id, settings.CHAT_HISTORY_LENGTH)
            chat_history = init_chat_history(
                total_length=settings.CHAT_HISTORY_LENGTH,
                messages=[f"question: {record.question}, answer: {record.answer}" for record in records],
            )
            persist_answer = partial(repository.append, query.conversation_id)
            if query.rag:
                await stream_rag_response(
                    websocket,
                    llm_client,
                    query,
                    chat_history,
                    index,
                    reranker,
                    on_complete=persist_answer,
                )
            else:
                await stream_chat_response(
                    websocket,
                    llm_client,
                    query,
                    chat_history,
                    on_complete=persist_answer,
                )
    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.exception(f"Unexpected error in WebSocket handler: {e}")
        raise
