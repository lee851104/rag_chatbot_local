from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Mapping, Sequence


def normalize_source(source: str) -> str:
    """Normalize Windows or POSIX source paths to a stable filename."""
    return source.strip().replace("\\", "/").rstrip("/").rsplit("/", maxsplit=1)[-1]


@dataclass(frozen=True)
class RetrievalCase:
    """One query with manually labelled relevant source documents."""

    case_id: str
    query: str
    relevant_sources: frozenset[str]


def load_retrieval_cases(path: Path) -> list[RetrievalCase]:
    """Load and validate a JSON Lines retrieval ground-truth dataset."""
    cases: list[RetrievalCase] = []
    seen_ids: set[str] = set()

    for line_number, raw_line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue

        try:
            payload = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON on line {line_number} of {path}: {exc}") from exc
        if not isinstance(payload, dict):
            raise ValueError(f"Line {line_number}: each case must be a JSON object.")

        case_id = payload.get("id")
        query = payload.get("query")
        relevant_sources = payload.get("relevant_sources")
        if not isinstance(case_id, str) or not case_id.strip():
            raise ValueError(f"Line {line_number}: 'id' must be a non-empty string.")
        if case_id in seen_ids:
            raise ValueError(f"Line {line_number}: duplicate id '{case_id}'.")
        if not isinstance(query, str) or not query.strip():
            raise ValueError(f"Line {line_number}: 'query' must be a non-empty string.")
        if not isinstance(relevant_sources, list) or not relevant_sources:
            raise ValueError(f"Line {line_number}: 'relevant_sources' must be a non-empty list.")
        if not all(isinstance(source, str) and source.strip() for source in relevant_sources):
            raise ValueError(f"Line {line_number}: every relevant source must be a non-empty string.")

        normalized_sources = frozenset(normalize_source(source) for source in relevant_sources)
        cases.append(
            RetrievalCase(
                case_id=case_id,
                query=query,
                relevant_sources=normalized_sources,
            )
        )
        seen_ids.add(case_id)

    if not cases:
        raise ValueError(f"No retrieval cases found in {path}.")
    return cases


def recall_at_k(relevant_sources: Iterable[str], ranked_sources: Sequence[str], k: int) -> float:
    """Return source-level recall within the first ``k`` ranked chunks."""
    if k <= 0:
        raise ValueError("k must be greater than zero.")
    relevant = {normalize_source(source) for source in relevant_sources}
    if not relevant:
        raise ValueError("At least one relevant source is required.")
    retrieved = {normalize_source(source) for source in ranked_sources[:k] if source}
    return len(relevant & retrieved) / len(relevant)


def reciprocal_rank(relevant_sources: Iterable[str], ranked_sources: Sequence[str]) -> float:
    """Return the reciprocal rank of the first relevant retrieved chunk."""
    relevant = {normalize_source(source) for source in relevant_sources}
    if not relevant:
        raise ValueError("At least one relevant source is required.")

    for rank, source in enumerate(ranked_sources, start=1):
        if source and normalize_source(source) in relevant:
            return 1.0 / rank
    return 0.0


def evaluate_rankings(
    cases: Sequence[RetrievalCase],
    rankings: Mapping[str, Sequence[str]],
    cutoffs: Sequence[int],
) -> dict:
    """Aggregate Recall@K and Mean Reciprocal Rank over an evaluation set."""
    if not cases:
        raise ValueError("At least one retrieval case is required.")
    normalized_cutoffs = sorted(set(cutoffs))
    if not normalized_cutoffs or normalized_cutoffs[0] <= 0:
        raise ValueError("Cutoffs must contain positive integers.")

    recall_totals = {cutoff: 0.0 for cutoff in normalized_cutoffs}
    reciprocal_rank_total = 0.0
    per_query: list[dict] = []

    for case in cases:
        if case.case_id not in rankings:
            raise ValueError(f"Missing ranking for case '{case.case_id}'.")
        # Keep blank source entries in place. A malformed chunk still occupies
        # a rank and must not move later relevant chunks upward artificially.
        ranked_sources = [normalize_source(source) if source else "" for source in rankings[case.case_id]]
        recalls = {cutoff: recall_at_k(case.relevant_sources, ranked_sources, cutoff) for cutoff in normalized_cutoffs}
        rr = reciprocal_rank(case.relevant_sources, ranked_sources)
        first_relevant_rank = round(1.0 / rr) if rr else None

        for cutoff, recall in recalls.items():
            recall_totals[cutoff] += recall
        reciprocal_rank_total += rr
        per_query.append(
            {
                "id": case.case_id,
                "query": case.query,
                "relevant_sources": sorted(case.relevant_sources),
                "ranked_sources": ranked_sources,
                "recall": {str(cutoff): recalls[cutoff] for cutoff in normalized_cutoffs},
                "reciprocal_rank": rr,
                "first_relevant_rank": first_relevant_rank,
            }
        )

    count = len(cases)
    return {
        "query_count": count,
        "recall": {str(cutoff): recall_totals[cutoff] / count for cutoff in normalized_cutoffs},
        "mrr": reciprocal_rank_total / count,
        "per_query": per_query,
    }
