/**
 * UI-side types for one conversational turn.
 *
 * Hand-written, and deliberately separate from `types/api.ts`, which is
 * generated from the backend Pydantic models. Everything here describes what the
 * interface renders. Some of it is derived on the client: the retrieval scores
 * are parsed out of a Markdown blob (see `lib/streamProtocol.ts`), and the
 * timings are measured in the browser because the backend does not report them.
 */

/** One chunk that survived the relevance threshold. */
export interface RetrievedSource {
  /** Basename only -- the backend sends `os.path.basename(...)`. */
  filename: string;
  /**
   * Score after reranking, which is what the ordering reflects. When no
   * reranker ran the backend repeats the vector score here.
   */
  rerankScore: number;
  /** Raw cosine relevance from the vector search, before reranking. */
  vectorScore: number;
  /** First 256 characters of the chunk, ending in an ellipsis. */
  preview: string;
}

/**
 * Outcome of the retrieval step.
 *
 * `miss` matters more than it looks: when every candidate falls below the
 * threshold the backend does not stop, it answers with no document context at
 * all. Rendering that state is the difference between a visible fallback and a
 * silent one.
 */
export interface Retrieval {
  status: 'hit' | 'miss';
  sources: RetrievedSource[];
}

/** What the client can honestly measure about a turn. */
export interface TurnMetrics {
  /** Milliseconds from send to the first answer token. */
  ttftMs: number | null;
  /** Milliseconds from send to the `done` frame. Null while still streaming. */
  totalMs: number | null;
  /** Token frames received. */
  tokens: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  /** Assistant turns only, and only when RAG was requested. */
  retrieval?: Retrieval | null;
  /**
   * Set when the sources frame arrived in a shape the parser did not recognise.
   * Shown verbatim so the information is not lost to a format change.
   */
  rawSources?: string | null;
  /** Assistant turns only. Absent on turns restored from history. */
  metrics?: TurnMetrics | null;
  /** Set when the backend reported a failure instead of an answer. */
  error?: string | null;
}
