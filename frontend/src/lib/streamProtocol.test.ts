import { describe, expect, it } from 'vitest'
import { parseSourcesFrame } from './streamProtocol'

/**
 * These tests pin the Markdown shape the backend packs into `SourcesFrame.text`.
 * They are written against literal strings rather than a helper shared with
 * production code on purpose: if `helpers/prettier.py` or `stream_rag_response`
 * changes format, these should fail loudly rather than quietly agreeing with a
 * parser that drifted along with them.
 *
 * Reproduced from:
 *   backend/helpers/prettier.py::prettify_source
 *   backend/api/services/chat_stream.py::stream_rag_response
 */

/** One entry exactly as `prettify_source` formats it, including odd spacing. */
function entry(filename: string, rerank: number, vector: number, preview: string): string {
  return (
    `• **${filename}** \n\n` +
    ` **Rerank Score (${rerank})** · ` +
    `**Vector Score (${vector})** \n\n` +
    ` **Preview:** \n >${preview} \n`
  )
}

/** The trailing rule and heading `stream_rag_response` appends to every frame. */
const TAIL = `${'-'.repeat(20)}\n\n**Answer:** \n\n`

function hitFrame(...entries: string[]): string {
  return (
    'Here are the retrieved text chunks with a content preview: \n\n' +
    entries.map((e) => `${e}\n\n`).join('') +
    TAIL
  )
}

const MISS_FRAME = `I did not detect any pertinent chunk of text from the documents. \n\n${TAIL}`

describe('parseSourcesFrame', () => {
  it('pulls filename, both scores and preview out of a hit frame', () => {
    const retrieval = parseSourcesFrame(
      hitFrame(
        entry('tree-summarization-strategy.md', 0.94, 0.81, '每個 chunk 各自產生草稿後兩兩合併...'),
        entry('kv-cache.md', 0.71, 0.64, 'KV cache 讓後續 token 不必重算...'),
      ),
    )

    expect(retrieval).toEqual({
      status: 'hit',
      sources: [
        {
          filename: 'tree-summarization-strategy.md',
          rerankScore: 0.94,
          vectorScore: 0.81,
          preview: '每個 chunk 各自產生草稿後兩兩合併...',
        },
        {
          filename: 'kv-cache.md',
          rerankScore: 0.71,
          vectorScore: 0.64,
          preview: 'KV cache 讓後續 token 不必重算...',
        },
      ],
    })
  })

  it('keeps the rule and the Answer heading out of the last preview', () => {
    // The tail lives in the same frame as the sources, so the final preview
    // capture would otherwise swallow it whole.
    const retrieval = parseSourcesFrame(hitFrame(entry('only.md', 0.5, 0.5, 'just this...')))

    expect(retrieval?.sources).toHaveLength(1)
    expect(retrieval?.sources[0].preview).toBe('just this...')
  })

  it('keeps a preview that itself contains a bullet and bold text', () => {
    // Previews are 256 characters of raw document text, so they can contain the
    // same "• **" sequence that separates entries. Without a newline anchor the
    // preview is cut at the first one and its tail becomes a bogus source.
    const preview = '支援的模式： • **RAG** 會先檢索，• **Reasoning** 會輸出推理過程...'
    const retrieval = parseSourcesFrame(hitFrame(entry('modes.md', 0.6, 0.6, preview)))

    expect(retrieval?.sources).toHaveLength(1)
    expect(retrieval?.sources[0].preview).toBe(preview)
  })

  it('reads a negative vector score, which cosine relevance permits', () => {
    const retrieval = parseSourcesFrame(hitFrame(entry('weak.md', 0.02, -0.05, 'barely...')))
    expect(retrieval?.sources[0].vectorScore).toBeCloseTo(-0.05)
  })

  it('handles the no-reranker case, where both scores are the same number', () => {
    const retrieval = parseSourcesFrame(hitFrame(entry('plain.md', 0.42, 0.42, 'x...')))
    expect(retrieval?.sources[0].rerankScore).toBe(retrieval?.sources[0].vectorScore)
  })

  it('flags a miss so the fallback to an ungrounded answer stays visible', () => {
    expect(parseSourcesFrame(MISS_FRAME)).toEqual({ status: 'miss', sources: [] })
  })

  it('reports a hit with no detail rather than a miss when entries do not parse', () => {
    // Claiming a miss here would put a "not grounded in your documents" warning
    // on an answer that was, in fact, grounded.
    const retrieval = parseSourcesFrame(
      `Here are the retrieved text chunks with a content preview: \n\n(unrecognised)\n${TAIL}`,
    )
    expect(retrieval).toEqual({ status: 'hit', sources: [] })
  })

  it('returns null when neither marker is present, so the caller can fall back', () => {
    expect(parseSourcesFrame('Something else entirely')).toBeNull()
  })
})
