from unittest.mock import Mock

from memory.reranker import Reranker
from services.ingest_documents_service.document import Document


def test_reranker_sorts_scores_and_keeps_sources_aligned():
    client = Mock()
    client.predict.return_value = [0.1, 0.9, 0.5]
    reranker = Reranker(model_name="unused", batch_size=4, client=client)
    documents = [
        Document(page_content="first"),
        Document(page_content="second"),
        Document(page_content="third"),
    ]
    sources = [
        {"document": "first.md", "score": 0.8},
        {"document": "second.md", "score": 0.7},
        {"document": "third.md", "score": 0.6},
    ]

    ranked_documents, ranked_sources = reranker.rerank("query", documents, sources, top_n=2)

    client.predict.assert_called_once_with(
        [("query", "first"), ("query", "second"), ("query", "third")],
        batch_size=4,
        show_progress_bar=False,
    )
    assert [document.page_content for document in ranked_documents] == ["second", "third"]
    assert [source["document"] for source in ranked_sources] == ["second.md", "third.md"]
    assert [source["rerank_score"] for source in ranked_sources] == [0.9, 0.5]


def test_reranker_skips_model_call_when_there_are_no_candidates():
    client = Mock()
    reranker = Reranker(model_name="unused", client=client)

    assert reranker.rerank("query", [], [], top_n=3) == ([], [])
    client.predict.assert_not_called()
