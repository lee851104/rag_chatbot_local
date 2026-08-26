from datetime import datetime, timezone

from sqlmodel import Field, SQLModel


class ChatMessageRecord(SQLModel, table=True):
    """One persisted question/answer exchange in a conversation."""

    __tablename__ = "chat_messages"

    id: int | None = Field(default=None, primary_key=True)
    conversation_id: str = Field(index=True, max_length=64)
    question: str
    answer: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
