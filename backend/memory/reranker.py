from threading import Lock
from typing import Any

import sentence_transformers
import torch
from services.ingest_documents_service.document import Document


class Reranker:
    """Cross-Encoder reranker for the second retrieval stage."""

    def __init__(
        self,
        model_name: str,
        batch_size: int = 8,
        cache_folder: str | None = None,
        client: Any | None = None,
    ) -> None:
        device = "cuda" if torch.cuda.is_available() else "cpu"
        self.batch_size = batch_size
        self._predict_lock = Lock()
        self.client = client
        if self.client is None:
            self.client = sentence_transformers.CrossEncoder(
                model_name_or_path=model_name,
                device=device,
                cache_folder=cache_folder,
                activation_fn=torch.nn.Sigmoid(),
            )

    def rerank(
        self,
        query: str,
        documents: list[Document],
        sources: list[dict[str, Any]],
        top_n: int,
    ) -> tuple[list[Document], list[dict[str, Any]]]:
        """Score query/document pairs and return the highest-ranked aligned results."""
        if len(documents) != len(sources):
            raise ValueError("Documents and sources must remain aligned for reranking.")
        if not documents:
            return [], []
        if top_n <= 0:
            raise ValueError("top_n must be greater than zero.")

        pairs = [(query, document.page_content) for document in documents]
        # A single model instance is shared by all WebSocket connections. The
        # lock prevents concurrent predict calls from racing on GPU state.
        with self._predict_lock:
            scores = self.client.predict(
                pairs,
                batch_size=self.batch_size,
                show_progress_bar=False,
            )

        ranked_indices = sorted(
            range(len(documents)),
            key=lambda index: float(scores[index]),
            reverse=True,
        )[:top_n]
        reranked_documents = [documents[index] for index in ranked_indices]
        reranked_sources = [
            {
                **sources[index],
                "rerank_score": round(float(scores[index]), 3),
            }
            for index in ranked_indices
        ]
        return reranked_documents, reranked_sources
