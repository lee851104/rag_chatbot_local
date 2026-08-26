from unittest.mock import Mock

from memory.embedder import Embedder


def test_embed_query_disables_progress_bar():
    encoded = Mock()
    encoded.tolist.return_value = [0.1, 0.2]
    embedder = Embedder.__new__(Embedder)
    embedder.client = Mock()
    embedder.client.encode.return_value = encoded

    result = embedder.embed_query("hello\nworld", show_progress_bar=True)

    embedder.client.encode.assert_called_once_with(
        sentences="hello world",
        normalize_embeddings=False,
        show_progress_bar=False,
    )
    assert result == [0.1, 0.2]
