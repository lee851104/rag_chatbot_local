/**
 * Reads the `sources` frame of the `WS /chat/stream` protocol.
 *
 * The protocol itself is already typed (see `backend/schemas/ws.py`), so the
 * client no longer has to guess where a response starts or ends. What is still
 * untyped is the *inside* of `SourcesFrame.text`: the backend formats the whole
 * retrieval preview into one Markdown blob with `helpers/prettier.py`, then
 * appends a rule and an `**Answer:**` heading. Rendering that blob verbatim gives
 * a wall of bold text; rendering it as a table of filenames and scores needs it
 * broken apart first.
 *
 * This module is the only place that knows the blob's shape. If the backend ever
 * sends the sources as structured JSON, delete the parsing here and keep the
 * types -- nothing else in the UI reads the raw text.
 */

import type { Retrieval, RetrievedSource } from '@/types/chat';

/** Opening line when at least one chunk cleared the relevance threshold. */
const HIT_MARKER = 'Here are the retrieved text chunks';
/** Opening line when every candidate was filtered out. */
const MISS_MARKER = 'I did not detect any pertinent chunk';

/**
 * The frame carries a horizontal rule and an `**Answer:**` heading after the
 * last source. Both belong to the answer's presentation, not to the retrieval
 * data, and the trailing preview would otherwise swallow them whole.
 */
const TRAILING_HEADER_RE = /\n\s*-{5,}[\s\S]*$/;

/**
 * One entry of `prettify_source`, which formats as:
 *
 *     • **{basename}** \n\n **Rerank Score ({r})** · **Vector Score ({v})** \n\n **Preview:** \n >{preview} \n
 *
 * Both scores are rounded to 2 dp and either may be negative: relevance is
 * `1 - cosine distance`, which is free to go below zero, and a cross-encoder
 * reranker emits unbounded logits. When no reranker ran, `prettify_source`
 * falls back to the vector score for both.
 *
 * The trailing lookahead requires a newline before the next bullet. Previews are
 * raw document text and can contain "• **" mid-line; without the anchor such a
 * preview is cut short and its tail is reported as an extra source.
 */
const SOURCE_RE =
  /•\s*\*\*(.+?)\*\*\s*\*\*Rerank Score\s*\(\s*(-?[\d.]+)\s*\)\*\*\s*·\s*\*\*Vector Score\s*\(\s*(-?[\d.]+)\s*\)\*\*\s*\*\*Preview:\*\*\s*>([\s\S]*?)(?=\n\s*•\s*\*\*|$)/g;

/**
 * Turn one `SourcesFrame.text` into the retrieval outcome it describes.
 *
 * Returns `null` when the text matches neither marker, which means the backend's
 * wording changed. Callers should fall back to showing the raw text rather than
 * claiming a miss -- a false "not grounded in your documents" warning on a
 * grounded answer is worse than no warning at all.
 */
export function parseSourcesFrame(text: string): Retrieval | null {
  if (text.startsWith(MISS_MARKER)) {
    return { status: 'miss', sources: [] };
  }
  if (!text.startsWith(HIT_MARKER)) {
    return null;
  }

  const body = text.replace(TRAILING_HEADER_RE, '');
  const sources: RetrievedSource[] = [];

  // `matchAll` needs a global regex, and a shared global regex carries
  // `lastIndex` between calls -- build a fresh one per frame.
  for (const m of body.matchAll(new RegExp(SOURCE_RE))) {
    sources.push({
      filename: m[1].trim(),
      rerankScore: toScore(m[2]),
      vectorScore: toScore(m[3]),
      preview: m[4].trim(),
    });
  }

  return { status: 'hit', sources };
}

function toScore(raw: string): number {
  const value = Number.parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
}
