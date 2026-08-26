from unittest.mock import AsyncMock, Mock

import pytest
from services.chat_service.ctx_strategy import CreateAndRefineStrategy
from services.ingest_documents_service.document import Document


@pytest.mark.asyncio
async def test_create_and_refine_uses_initial_prompt_for_first_chunk():
    llm = Mock()
    llm.generate_ctx_prompt.return_value = "initial prompt"
    llm.generate_refined_ctx_prompt.return_value = "refined prompt"
    llm.async_generate_answer = AsyncMock(return_value="draft answer")
    llm.async_start_answer_iterator_streamer = AsyncMock(return_value="final stream")
    strategy = CreateAndRefineStrategy(llm)

    response, prompts = await strategy.generate_response(
        [Document("first chunk"), Document("second chunk")],
        question="question",
    )

    llm.generate_ctx_prompt.assert_called_once_with(question="question", context="first chunk")
    llm.generate_refined_ctx_prompt.assert_called_once_with(
        context="second chunk",
        question="question",
        existing_answer="draft answer",
    )
    assert prompts == ["initial prompt", "refined prompt"]
    assert response == "final stream"
