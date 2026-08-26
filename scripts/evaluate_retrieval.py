"""Evaluate vector retrieval and Cross-Encoder reranking against labelled ground truth."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT_FOLDER = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT_FOLDER / "backend"))

from config import settings  # noqa: E402
from evaluation.retrieval_metrics import (  # noqa: E402
    evaluate_rankings,
    load_retrieval_cases,
    normalize_source,
)

DEFAULT_DATASET = ROOT_FOLDER / "evaluation" / "retrieval_ground_truth.jsonl"


def parse_cutoffs(value: str) -> list[int]:
    """Parse a comma-separated list such as ``1,3,5``."""
    try:
        cutoffs = sorted({int(item.strip()) for item in value.split(",") if item.strip()})
    except ValueError as exc:
        raise argparse.ArgumentTypeError("Cutoffs must be comma-separated integers.") from exc
    if not cutoffs or cutoffs[0] <= 0:
        raise argparse.ArgumentTypeError("Cutoffs must contain positive integers.")
    return cutoffs


def source_names(sources: list[dict]) -> list[str]:
    """Extract normalized source filenames while preserving chunk rank."""
    return [normalize_source(str(document)) if (document := source.get("document")) else "" for source in sources]


def print_summary(results: dict, cutoffs: list[int]) -> None:
    """Print a compact comparison table for humans and CI logs."""
    metric_headers = [f"Recall@{cutoff}" for cutoff in cutoffs]
    print(f"{'Stage':<12}" + "".join(f"{header:>12}" for header in metric_headers) + f"{'MRR':>12}")
    for stage in ("vector", "reranked"):
        summary = results[stage]
        metrics = "".join(f"{summary['recall'][str(cutoff)]:>12.4f}" for cutoff in cutoffs)
        print(f"{stage:<12}{metrics}{summary['mrr']:>12.4f}")


def evaluate(args: argparse.Namespace) -> dict:
    """Run both retrieval stages and return serializable metrics and details."""
    cases = load_retrieval_cases(args.dataset)
    if not args.vector_store_path.exists():
        raise RuntimeError(f"Vector index not found at {args.vector_store_path}. Build the memory index first.")

    from memory.embedder import Embedder
    from memory.reranker import Reranker
    from memory.vector_database.chroma import Chroma

    embedding = Embedder(model_name=args.embedding_model)
    index = Chroma(
        is_persistent=True,
        persist_directory=str(args.vector_store_path),
        embedding=embedding,
    )
    reranker = Reranker(model_name=args.reranker_model, batch_size=args.rerank_batch_size)

    indexed_sources = {normalize_source(source) for source in index.get_indexed_documents()}
    labelled_sources = {source for case in cases for source in case.relevant_sources}
    missing_sources = sorted(labelled_sources - indexed_sources)
    if missing_sources:
        missing = ", ".join(missing_sources)
        raise RuntimeError(f"Ground-truth sources are missing from the index: {missing}. Rebuild the memory index.")

    vector_rankings: dict[str, list[str]] = {}
    reranked_rankings: dict[str, list[str]] = {}
    for case in cases:
        candidate_documents, candidate_sources = index.similarity_search_with_threshold(
            query=case.query,
            k=args.candidate_k,
            threshold=args.threshold,
        )
        vector_rankings[case.case_id] = source_names(candidate_sources)

        _, reranked_sources = reranker.rerank(
            case.query,
            candidate_documents,
            candidate_sources,
            top_n=len(candidate_documents),
        )
        reranked_rankings[case.case_id] = source_names(reranked_sources)

    return {
        "config": {
            "dataset": str(args.dataset),
            "embedding_model": args.embedding_model,
            "reranker_model": args.reranker_model,
            "candidate_k": args.candidate_k,
            "threshold": args.threshold,
            "cutoffs": args.cutoffs,
        },
        "vector": evaluate_rankings(cases, vector_rankings, args.cutoffs),
        "reranked": evaluate_rankings(cases, reranked_rankings, args.cutoffs),
    }


def get_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--dataset", type=Path, default=DEFAULT_DATASET)
    parser.add_argument("--vector-store-path", type=Path, default=settings.VECTOR_STORE_PATH)
    parser.add_argument("--embedding-model", default=settings.EMBEDDING_MODEL)
    parser.add_argument("--reranker-model", default=settings.RERANKER_MODEL)
    parser.add_argument("--rerank-batch-size", type=int, default=settings.RERANK_BATCH_SIZE)
    parser.add_argument("--candidate-k", type=int, default=settings.RERANK_CANDIDATES)
    parser.add_argument("--threshold", type=float, default=settings.RELEVANCE_THRESHOLD)
    parser.add_argument("--cutoffs", type=parse_cutoffs, default=parse_cutoffs("1,3,5"))
    parser.add_argument("--output", type=Path, help="Optional JSON result path.")
    return parser.parse_args()


def main() -> int:
    args = get_args()
    try:
        results = evaluate(args)
    except RuntimeError as exc:
        print(f"Evaluation failed: {exc}", file=sys.stderr)
        return 2
    print_summary(results, args.cutoffs)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(results, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
