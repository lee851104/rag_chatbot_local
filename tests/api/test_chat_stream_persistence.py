from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from api.services import chat_stream
from chat_history import ChatHistory


@pytest.mark.asyncio
async def test_completed_exchange_is_persisted_before_done(monkeypatch):
    events: list[str] = []

    async def response_stream():
        yield "answer"

    async def send_json(frame):
        events.append(frame["type"])

    def persist(question: str, answer: str):
        events.append("persist")
        assert (question, answer) == ("question", "answer")

    llm_client = SimpleNamespace(
        model_settings=SimpleNamespace(reasoning=False),
        parse_token=lambda output: output,
    )
    monkeypatch.setattr(chat_stream, "answer", AsyncMock(return_value=response_stream()))

    await chat_stream.stream_chat_response(
        websocket=SimpleNamespace(send_json=send_json),
        llm_client=llm_client,
        query=SimpleNamespace(text="question"),
        chat_history=ChatHistory(total_length=2),
        on_complete=persist,
    )

    assert events == ["token", "persist", "done"]
