from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from api.services import chat_stream
from chat_history import ChatHistory


@pytest.mark.asyncio
async def test_rag_stream_uses_configured_relevance_threshold(monkeypatch):
    async def empty_stream():
        if False:
            yield None

    websocket = SimpleNamespace(send_json=AsyncMock())
    llm_client = SimpleNamespace(model_settings=SimpleNamespace(reasoning=False))
    index = Mock()
    index.similarity_search_with_threshold.return_value = ([], [])
    reranker = Mock()
    reranker.rerank.return_value = ([], [])

    monkeypatch.setattr(chat_stream.settings, "RELEVANCE_THRESHOLD", 0.73)
    monkeypatch.setattr(chat_stream.settings, "RERANK_CANDIDATES", 20)
    monkeypatch.setattr(chat_stream.settings, "RERANK_TOP_N", 5)
    monkeypatch.setattr(chat_stream, "refine_question", AsyncMock(return_value="refined query"))
    monkeypatch.setattr(chat_stream, "get_ctx_synthesis_strategy", Mock(return_value=object()))
    monkeypatch.setattr(
        chat_stream,
        "answer_with_context",
        AsyncMock(return_value=(empty_stream(), [])),
    )

    await chat_stream.stream_rag_response(
        websocket=websocket,
        llm_client=llm_client,
        query=SimpleNamespace(text="question"),
        chat_history=ChatHistory(total_length=2),
        index=index,
        reranker=reranker,
    )

    index.similarity_search_with_threshold.assert_called_once_with(
        query="refined query",
        k=20,
        threshold=0.73,
    )
    reranker.rerank.assert_called_once_with("refined query", [], [], 5)
