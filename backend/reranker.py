from config import settings
from memory.reranker import Reranker


def init_reranker() -> Reranker:
    """Load the configured Cross-Encoder once for all online queries."""
    return Reranker(
        model_name=settings.RERANKER_MODEL,
        batch_size=settings.RERANK_BATCH_SIZE,
    )
