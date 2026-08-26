from fastapi import status
from services.chat_service.chat_history_repository import ChatHistoryRepository
from sqlmodel import Session
from starlette.testclient import TestClient


def test_get_chat_history_returns_persisted_exchanges(
    client_with_overridden_deps: TestClient,
    session: Session,
):
    ChatHistoryRepository(session).append("history-test", "question", "answer")

    response = client_with_overridden_deps.get("/chat/history/history-test")

    assert response.status_code == status.HTTP_200_OK
    assert response.json()["conversation_id"] == "history-test"
    assert response.json()["messages"][0]["question"] == "question"
    assert response.json()["messages"][0]["answer"] == "answer"


def test_delete_chat_history_only_clears_requested_conversation(
    client_with_overridden_deps: TestClient,
    session: Session,
):
    repository = ChatHistoryRepository(session)
    repository.append("history-test", "question", "answer")
    repository.append("history-other", "other question", "other answer")

    response = client_with_overridden_deps.delete("/chat/history/history-test")

    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert repository.get_all("history-test") == []
    assert len(repository.get_all("history-other")) == 1
