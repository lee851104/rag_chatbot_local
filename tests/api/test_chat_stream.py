"""Tests for the WebSocket chat streaming endpoint."""

import pytest
from pydantic import ValidationError
from starlette.testclient import TestClient

# A generous ceiling that still fails fast if the server never terminates the
# response. It is a safety net, not the end-of-stream signal: that is the `done`
# frame. Reading a fixed number of frames is what used to deadlock this suite.
MAX_FRAMES = 2000
CONVERSATION_ID = "test-stream"


def request_frame(text: str, **extra) -> dict:
    return {"text": text, "conversation_id": CONVERSATION_ID, **extra}


def read_until_done(websocket, max_frames: int = MAX_FRAMES) -> list[dict]:
    """
    Collect frames until the server signals the end of the response.

    Args:
        websocket: An open connection to `/chat/stream`.
        max_frames: Safety ceiling so a server that never sends `done` fails the
            test instead of hanging it forever.

    Returns:
        list[dict]: Every frame received, with the `done` frame last.
    """
    frames: list[dict] = []

    for _ in range(max_frames):
        frame = websocket.receive_json()
        frames.append(frame)
        if frame["type"] == "done":
            return frames

    raise AssertionError(f"Server sent {max_frames} frames without a 'done' frame.")


def answer_text(frames: list[dict]) -> str:
    """Concatenate the token frames the way a client would."""
    return "".join(frame["text"] for frame in frames if frame["type"] == "token")


def test_chat_stream_successful_response(client_with_overridden_deps: TestClient):
    """A plain chat request streams tokens and terminates with `done`."""
    with client_with_overridden_deps.websocket_connect("/chat/stream") as websocket:
        websocket.send_json(request_frame("Hello, how are you?"))
        frames = read_until_done(websocket)

    assert frames[-1]["type"] == "done"
    assert not [frame for frame in frames if frame["type"] == "error"]
    assert answer_text(frames)


def test_chat_stream_empty_message(client_with_overridden_deps: TestClient):
    """An empty prompt still produces a well-formed, terminated response."""
    with client_with_overridden_deps.websocket_connect("/chat/stream") as websocket:
        websocket.send_json(request_frame(""))
        frames = read_until_done(websocket)

    assert frames[-1]["type"] == "done"


def test_chat_stream_multiple_requests(client_with_overridden_deps: TestClient):
    """The same connection can serve several requests back to back."""
    with client_with_overridden_deps.websocket_connect("/chat/stream") as websocket:
        for i in range(3):
            websocket.send_json(request_frame(f"Question {i + 1}"))
            frames = read_until_done(websocket)

            assert frames[-1]["type"] == "done"
            assert answer_text(frames)


def test_chat_stream_rag_sends_sources_first(client_with_overridden_deps: TestClient):
    """In RAG mode the retrieved-chunk preview precedes every token frame."""
    with client_with_overridden_deps.websocket_connect("/chat/stream") as websocket:
        websocket.send_json(request_frame("What is in the documents?", rag=True))
        frames = read_until_done(websocket)

    assert frames[0]["type"] == "sources"
    assert frames[-1]["type"] == "done"


def test_chat_stream_exactly_one_done_frame(client_with_overridden_deps: TestClient):
    """`done` is the terminator, so it must appear once and only at the end."""
    with client_with_overridden_deps.websocket_connect("/chat/stream") as websocket:
        websocket.send_json(request_frame("Test message"))
        frames = read_until_done(websocket)

    assert [frame["type"] for frame in frames].count("done") == 1


def test_chat_stream_invalid_payload(client_with_overridden_deps: TestClient):
    """A frame that is not a valid ChatRequest is rejected before generation."""
    with pytest.raises(ValidationError, match="validation error for ChatRequest"):
        with client_with_overridden_deps.websocket_connect("/chat/stream") as websocket:
            websocket.send_json({"invalid": "data"})
            websocket.receive_json()
