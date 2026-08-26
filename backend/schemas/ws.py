"""
Frame models for the `WS /chat/stream` protocol.

Every server -> client frame is a JSON object tagged with a ``type`` field, so
the client can tell a source preview from an answer token from the end of the
response. Before this existed the endpoint sent bare strings, which left both
the browser and the tests guessing when a response had finished -- the browser
by watching for a pause, the tests by counting to a fixed number of frames.

Exactly one terminal frame ends every response: ``done`` on success, and
``error`` followed by ``done`` on failure. A client can therefore always stop
reading at ``done`` without a timeout.
"""

from typing import Literal

from pydantic import BaseModel


class SourcesFrame(BaseModel):
    """Retrieved-chunk preview. Sent once, in RAG mode only, before the answer."""

    type: Literal["sources"] = "sources"
    text: str


class TokenFrame(BaseModel):
    """One piece of the answer. Concatenate these in arrival order."""

    type: Literal["token"] = "token"
    text: str


class ErrorFrame(BaseModel):
    """Generation failed. No further token frames belong to this response."""

    type: Literal["error"] = "error"
    message: str


class DoneFrame(BaseModel):
    """End of the response. Always the last frame, on success and on failure."""

    type: Literal["done"] = "done"
