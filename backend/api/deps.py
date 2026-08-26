"""
Defines dependencies used by the endpoints.
"""

from typing import Annotated, Generator

import state
from fastapi import Depends
from llm_providers.llamacpp_client import LlamaCppClient
from memory.reranker import Reranker
from memory.vector_database.chroma import Chroma
from sqlmodel import Session


def get_llm_client() -> Generator[LlamaCppClient, None, None]:
    """
    Dependency to get the LLM client instance.
    """
    yield state.llm_client


def get_index() -> Generator[Chroma, None, None]:
    """
    Dependency to get the vector database index instance.
    """
    yield state.vector_database


def get_reranker() -> Generator[Reranker, None, None]:
    """Get the process-wide Cross-Encoder reranker."""
    yield state.reranker


def get_db_session() -> Generator[Session, None, None]:
    """
    Create a new database session and close the session after the operation has ended.
    """
    with Session(state.db_engine) as session:
        yield session


LlamaCppClientDep = Annotated[LlamaCppClient, Depends(get_llm_client)]
VectorDatabaseDep = Annotated[Chroma, Depends(get_index)]
RerankerDep = Annotated[Reranker, Depends(get_reranker)]
SessionDep = Annotated[Session, Depends(get_db_session)]
