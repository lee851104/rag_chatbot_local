import asyncio
import time
from collections.abc import Callable

from chat_history import ChatHistory
from config import settings
from fastapi import WebSocket
from helpers.log import get_logger
from helpers.prettier import prettify_source
from pydantic import BaseModel
from schemas.chat import ChatRequest
from schemas.ws import DoneFrame, ErrorFrame, SourcesFrame, TokenFrame
from services.chat_service.conversation_handler import (
    answer,
    answer_with_context,
    extract_content_after_reasoning,
    refine_question,
)
from services.chat_service.ctx_strategy import get_ctx_synthesis_strategy

from api.deps import LlamaCppClientDep, RerankerDep, VectorDatabaseDep

logger = get_logger(__name__)


async def send_frame(websocket: WebSocket, frame: BaseModel) -> None:
    """
    Send one tagged frame of the `WS /chat/stream` protocol.

    Args:
        websocket (WebSocket): The connection to send through.
        frame (BaseModel): Any model from `schemas.ws`.
    """
    await websocket.send_json(frame.model_dump())


async def stream_chat_response(
    websocket: WebSocket,
    llm_client: LlamaCppClientDep,
    query: ChatRequest,
    chat_history: ChatHistory,
    on_complete: Callable[[str, str], None] | None = None,
) -> str | None:
    """
    Stream a plain (non-RAG) chat response token by token.

    Emits `token` frames followed by exactly one `done` frame. On failure it
    emits an `error` frame and still terminates the response with `done`, so the
    client can always stop reading at `done`.

     Args:
        websocket (WebSocket): The WebSocket connection to send responses through.
        llm_client (LamaCppClientDep): The LLM client dependency for generating responses.
        query (ChatRequest): The chat request containing the user's query.
        chat_history (ChatHistory): The prior exchanges used as conversation context.
        on_complete (Callable | None): Called before `done` to persist a completed exchange.
    """
    final_answer = None
    try:
        start_time = time.time()

        full_response = ""
        stream = await answer(
            llm=llm_client,
            question=query.text,
            chat_history=chat_history,
            max_new_tokens=settings.MAX_NEW_TOKENS,
        )
        async for output in stream:
            token = llm_client.parse_token(output)
            if token:
                full_response += token
                await send_frame(websocket, TokenFrame(text=token))

        if llm_client.model_settings.reasoning:
            final_answer = extract_content_after_reasoning(full_response, llm_client.model_settings.reasoning_stop_tag)
            if final_answer == "":
                final_answer = "I didn't provide the answer; perhaps I can try again."
        else:
            final_answer = full_response

        chat_history.append(f"question: {query.text}, answer: {final_answer}")
        if on_complete is not None:
            on_complete(query.text, final_answer)
        logger.debug(f"Updated chat history: {chat_history}")

        took = time.time() - start_time
        logger.info(f"\n--- Took {took:.2f} seconds ---")
    except Exception as exc:
        logger.exception("Error during streaming: %s", exc)
        await send_frame(websocket, ErrorFrame(message="Error during streaming."))

    await send_frame(websocket, DoneFrame())
    return final_answer


async def stream_rag_response(
    websocket: WebSocket,
    llm_client: LlamaCppClientDep,
    query: ChatRequest,
    chat_history: ChatHistory,
    index: VectorDatabaseDep,
    reranker: RerankerDep,
    on_complete: Callable[[str, str], None] | None = None,
) -> str | None:
    """
    Stream a RAG response: retrieved-source preview first, then the answer.

    Emits one `sources` frame, then `token` frames, then exactly one `done`
    frame. On failure it emits an `error` frame and still terminates with `done`.

     Args:
        websocket (WebSocket): The WebSocket connection to send responses through.
        llm_client (LamaCppClientDep): The LLM client dependency for generating responses.
        query (ChatRequest): The chat request containing the user's query.
        chat_history (ChatHistory): The prior exchanges used as conversation context.
        index (VectorDatabaseDep): The vector database dependency for retrieval.
        reranker (RerankerDep): The Cross-Encoder used for second-stage ranking.
        on_complete (Callable | None): Called before `done` to persist a completed exchange.
    """
    final_answer = None
    try:
        start_time = time.time()
        ctx_synthesis_strategy = get_ctx_synthesis_strategy(settings.SYNTHESIS_STRATEGY, llm=llm_client)

        retrieval_response = ""
        full_response = ""

        refined_user_input = await refine_question(
            llm_client, query.text, chat_history=chat_history, max_new_tokens=settings.MAX_NEW_TOKENS
        )
        candidate_contents, candidate_sources = index.similarity_search_with_threshold(
            query=refined_user_input,
            k=settings.RERANK_CANDIDATES,
            threshold=settings.RELEVANCE_THRESHOLD,
        )
        retrieved_contents, sources = await asyncio.to_thread(
            reranker.rerank,
            refined_user_input,
            candidate_contents,
            candidate_sources,
            settings.RERANK_TOP_N,
        )
        logger.info(
            "Reranked %d vector candidates and kept %d chunks",
            len(candidate_contents),
            len(retrieved_contents),
        )
        if retrieved_contents:
            retrieval_response += "Here are the retrieved text chunks with a content preview: \n\n"

            for source in sources:
                retrieval_response += prettify_source(source)
                retrieval_response += "\n\n"
        else:
            retrieval_response += "I did not detect any pertinent chunk of text from the documents. \n\n"

        retrieval_response += "-" * 20 + "\n\n"
        retrieval_response += "**Answer:** \n\n"

        await send_frame(websocket, SourcesFrame(text=retrieval_response))

        streamer, _ = await answer_with_context(
            llm_client,
            ctx_synthesis_strategy,
            query.text,
            chat_history,
            retrieved_contents,
            settings.MAX_NEW_TOKENS,
        )

        async for output in streamer:
            token = llm_client.parse_token(output)
            if token:
                full_response += token
                await send_frame(websocket, TokenFrame(text=token))

        if llm_client.model_settings.reasoning:
            final_answer = extract_content_after_reasoning(full_response, llm_client.model_settings.reasoning_stop_tag)
            if final_answer == "":
                final_answer = "I wasn't able to provide the answer; Do you want me to try again?"
        else:
            final_answer = full_response

        chat_history.append(f"question: {query.text}, answer: {final_answer}")
        if on_complete is not None:
            on_complete(query.text, final_answer)

        took = time.time() - start_time
        logger.info(f"\n--- Took {took:.2f} seconds ---")

    except Exception as exc:
        logger.exception("Error during RAG streaming: %s", exc)
        await send_frame(websocket, ErrorFrame(message="Error during RAG streaming."))

    await send_frame(websocket, DoneFrame())
    return final_answer
