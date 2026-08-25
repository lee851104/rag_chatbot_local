from types import SimpleNamespace

import pytest

from api.endpoints import documents


@pytest.mark.asyncio
async def test_list_documents_reads_persistent_registry(monkeypatch):
    record = SimpleNamespace(
        document_id="document-1",
        filename="indexed.md",
        size=42,
        content_type="text/markdown",
        version_hash="version-1",
    )

    class FakeRegistry:
        def __init__(self, session):
            self.session = session

        def get_all(self):
            return [record]

    monkeypatch.setattr(documents, "DocumentRegistry", FakeRegistry)

    response = await documents.list_documents(session=object())

    assert response.documents[0].model_dump() == {
        "document_id": "document-1",
        "filename": "indexed.md",
        "size": 42,
        "content_type": "text/markdown",
        "version_hash": "version-1",
    }
