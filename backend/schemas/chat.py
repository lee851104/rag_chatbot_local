from pydantic import BaseModel, ConfigDict, Field


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str
    conversation_id: str = Field(min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    rag: bool = False


class ChatMessageInfo(BaseModel):
    id: int
    question: str
    answer: str
    created_at: str


class ChatHistoryResponse(BaseModel):
    conversation_id: str
    messages: list[ChatMessageInfo]
