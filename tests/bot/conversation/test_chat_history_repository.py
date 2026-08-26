from services.chat_service.chat_history_repository import ChatHistoryRepository
from sqlmodel import Session


def test_history_is_persisted_and_isolated_by_conversation(session: Session):
    repository = ChatHistoryRepository(session)
    repository.append("conversation-a", "question 1", "answer 1")
    repository.append("conversation-b", "other question", "other answer")
    repository.append("conversation-a", "question 2", "answer 2")

    records = repository.get_all("conversation-a")

    assert [(record.question, record.answer) for record in records] == [
        ("question 1", "answer 1"),
        ("question 2", "answer 2"),
    ]


def test_get_recent_returns_chronological_tail(session: Session):
    repository = ChatHistoryRepository(session)
    for number in range(4):
        repository.append("conversation-a", f"question {number}", f"answer {number}")

    records = repository.get_recent("conversation-a", limit=2)

    assert [record.question for record in records] == ["question 2", "question 3"]


def test_clear_only_deletes_the_selected_conversation(session: Session):
    repository = ChatHistoryRepository(session)
    repository.append("conversation-a", "question", "answer")
    repository.append("conversation-b", "other question", "other answer")

    repository.clear("conversation-a")

    assert repository.get_all("conversation-a") == []
    assert len(repository.get_all("conversation-b")) == 1
