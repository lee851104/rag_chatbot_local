"""Tests for the POST /chat/ endpoint."""

from fastapi import status
from starlette.testclient import TestClient

CONVERSATION_ID = "test-chat"


def request_body(text, **extra):
    return {"text": text, "conversation_id": CONVERSATION_ID, **extra}


def test_chat_successful_response(client_with_overridden_deps: TestClient):
    """Test successful chat request."""
    response = client_with_overridden_deps.post("/chat/", json=request_body("Hello, how are you?"))

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "response" in data
    assert isinstance(data["response"], str)
    assert len(data["response"]) > 0


def test_chat_empty_message(client_with_overridden_deps: TestClient):
    """Test chat with empty message."""
    response = client_with_overridden_deps.post("/chat/", json=request_body(""))

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "response" in data


def test_chat_long_message(client_with_overridden_deps: TestClient):
    """Test chat with a longer message."""
    long_text = "Explain quantum computing in detail. " * 10
    response = client_with_overridden_deps.post("/chat/", json=request_body(long_text))

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "response" in data
    assert len(data["response"]) > 0


def test_chat_multiple_requests(client_with_overridden_deps: TestClient):
    """Test sending multiple chat requests."""
    for i in range(3):
        response = client_with_overridden_deps.post("/chat/", json=request_body(f"Question {i + 1}"))
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "response" in data


def test_chat_invalid_payload_missing_text(client_with_overridden_deps: TestClient):
    """Test chat with missing text field."""
    response = client_with_overridden_deps.post("/chat/", json={"invalid": "data"})

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_chat_invalid_payload_wrong_type(client_with_overridden_deps: TestClient):
    """Test chat with wrong data type for text."""
    response = client_with_overridden_deps.post(
        "/chat/",
        json={"text": 123, "conversation_id": CONVERSATION_ID},
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_chat_rejects_unimplemented_mode_flags(client_with_overridden_deps: TestClient):
    """Do not silently accept frontend features that have no backend implementation."""
    response = client_with_overridden_deps.post(
        "/chat/",
        json=request_body("Hello", reasoning=True),
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_chat_no_body(client_with_overridden_deps: TestClient):
    """Test chat without request body."""
    response = client_with_overridden_deps.post("/chat/")

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
