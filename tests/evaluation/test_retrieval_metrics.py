from pathlib import Path

import pytest
from evaluation.retrieval_metrics import (
    RetrievalCase,
    evaluate_rankings,
    load_retrieval_cases,
    normalize_source,
    recall_at_k,
    reciprocal_rank,
)


def test_normalize_source_supports_windows_and_posix_paths():
    assert normalize_source(r"C:\docs\guide.md") == "guide.md"
    assert normalize_source("/srv/docs/guide.md") == "guide.md"


def test_recall_at_k_and_reciprocal_rank_use_chunk_positions():
    ranked = ["wrong.md", "relevant.md", "relevant.md"]

    assert recall_at_k({"relevant.md"}, ranked, 1) == 0.0
    assert recall_at_k({"relevant.md"}, ranked, 3) == 1.0
    assert reciprocal_rank({"relevant.md"}, ranked) == 0.5


def test_multi_source_ground_truth_uses_set_recall():
    ranked = ["a.md", "a.md", "wrong.md", "b.md"]

    assert recall_at_k({"a.md", "b.md"}, ranked, 3) == 0.5
    assert recall_at_k({"a.md", "b.md"}, ranked, 4) == 1.0


def test_evaluate_rankings_aggregates_recall_and_mrr():
    cases = [
        RetrievalCase("one", "q1", frozenset({"a.md"})),
        RetrievalCase("two", "q2", frozenset({"b.md"})),
    ]
    rankings = {
        "one": ["a.md", "wrong.md"],
        "two": ["wrong.md", "b.md"],
    }

    result = evaluate_rankings(cases, rankings, cutoffs=[1, 3])

    assert result["recall"] == {"1": 0.5, "3": 1.0}
    assert result["mrr"] == 0.75


def test_load_retrieval_cases_rejects_duplicate_ids(tmp_path: Path):
    dataset = tmp_path / "gt.jsonl"
    dataset.write_text(
        '{"id":"same","query":"q1","relevant_sources":["a.md"]}\n'
        '{"id":"same","query":"q2","relevant_sources":["b.md"]}\n',
        encoding="utf-8",
    )

    with pytest.raises(ValueError, match="duplicate id"):
        load_retrieval_cases(dataset)
