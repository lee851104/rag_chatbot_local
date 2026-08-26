from models.chat_message_record import ChatMessageRecord
from sqlmodel import Session, select


class ChatHistoryRepository:
    """SQLite-backed storage for conversation exchanges."""

    def __init__(self, session: Session) -> None:
        self._session = session

    def get_recent(self, conversation_id: str, limit: int) -> list[ChatMessageRecord]:
        """Return the most recent exchanges in chronological order."""
        if limit <= 0:
            return []

        statement = (
            select(ChatMessageRecord)
            .where(ChatMessageRecord.conversation_id == conversation_id)
            .order_by(ChatMessageRecord.id.desc())
            .limit(limit)
        )
        records = list(self._session.exec(statement).all())
        records.reverse()
        return records

    def get_all(self, conversation_id: str) -> list[ChatMessageRecord]:
        """Return the full conversation in chronological order."""
        statement = (
            select(ChatMessageRecord)
            .where(ChatMessageRecord.conversation_id == conversation_id)
            .order_by(ChatMessageRecord.id)
        )
        return list(self._session.exec(statement).all())

    def append(self, conversation_id: str, question: str, answer: str) -> ChatMessageRecord:
        """Persist one completed question/answer exchange."""
        record = ChatMessageRecord(
            conversation_id=conversation_id,
            question=question,
            answer=answer,
        )
        self._session.add(record)
        self._session.commit()
        self._session.refresh(record)
        return record

    def clear(self, conversation_id: str) -> None:
        """Delete every exchange belonging to one conversation."""
        for record in self.get_all(conversation_id):
            self._session.delete(record)
        self._session.commit()
