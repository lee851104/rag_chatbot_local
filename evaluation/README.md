# Retrieval evaluation

`retrieval_ground_truth.jsonl` is a manually labelled, source-level Ground
Truth (GT) set. Each JSON Lines record contains:

```json
{"id":"unique-id","query":"question","relevant_sources":["document.md"]}
```

Use source filenames rather than Chroma chunk IDs: chunk IDs can change after
re-indexing, while source filenames remain stable. Ranking positions are still
chunk positions, so duplicate chunks from one source do not shift later hits.

Run the evaluation after building the memory index:

```shell
make evaluate_retrieval
```

Or write the complete per-query results to JSON:

```shell
poetry run python scripts/evaluate_retrieval.py \
  --cutoffs 1,3,5 \
  --output evaluation/results/latest.json
```

The report compares:

- `vector`: first-stage Chroma retrieval, up to 20 chunks.
- `reranked`: the same candidates sorted by the Cross-Encoder reranker.
- `Recall@K`: fraction of labelled relevant sources found in the first K chunks.
- `MRR`: Mean Reciprocal Rank of the first relevant chunk.

The command fails if a labelled source is not present in the current index;
rebuild the index before interpreting metrics in that case.
