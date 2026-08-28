import { AlertTriangle, FileText } from 'lucide-react'
import type { Retrieval } from '@/types/chat'

interface SourceCardProps {
  retrieval: Retrieval
}

/**
 * What the retrieval step returned, shown above the answer it fed.
 *
 * The miss case is the reason this component earns its place. When every
 * candidate chunk falls below the relevance threshold the backend does not stop
 * -- `answer_with_context` falls back to a plain chat call, and the model
 * answers at full length with no document context. Without a visible marker
 * that answer is indistinguishable from a grounded one.
 */
export function SourceCard({ retrieval }: SourceCardProps) {
  if (retrieval.status === 'miss') {
    return (
      <div className="mb-3 flex items-start gap-2.5 rounded-sm border border-primary/35 border-l-2 border-l-primary bg-primary/8 px-3 py-2">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-primary">未命中任何片段</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            以下回答未使用你的文件，內容不受知識庫約束。可以調低門檻或確認文件已建立索引。
          </p>
        </div>
      </div>
    )
  }

  // `prettify_source` repeats the vector score as the rerank score when no
  // reranker ran, so showing both columns would just print the number twice.
  const reranked = retrieval.sources.some((s) => s.rerankScore !== s.vectorScore)

  return (
    <div className="mb-3 overflow-hidden rounded-sm border border-border-strong bg-card">
      <div className="flex items-center gap-2 border-b border-border px-3 py-1.5 font-mono text-[10.5px] text-faint">
        <span className="font-medium text-up">檢索命中 {retrieval.sources.length}</span>
        <span className="ml-auto">{reranked ? 'rerank · vector' : '相關度'}</span>
      </div>

      {retrieval.sources.length === 0 ? (
        <p className="px-3 py-2 text-xs text-muted-foreground">
          後端回報有命中，但來源明細解析不出來。可能是回傳格式變了。
        </p>
      ) : (
        <ul>
          {retrieval.sources.map((s, i) => (
            <li
              key={`${s.filename}-${i}`}
              className="grid grid-cols-[14px_1fr_72px_auto] items-center gap-2.5 px-3 py-2 [&:not(:first-child)]:border-t [&:not(:first-child)]:border-border/70"
            >
              <span className="text-center font-mono text-[10px] text-faint">{i + 1}</span>

              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  <FileText className="h-3 w-3 shrink-0 text-faint" />
                  <span className="truncate text-xs text-secondary-foreground">{s.filename}</span>
                </span>
                <span className="mt-0.5 block truncate text-[10.5px] text-faint">{s.preview}</span>
              </span>

              {/* The cross-encoder runs through a sigmoid, so both scores sit in
                  0-1 and the bar can track the one that decided the ordering. */}
              <span className="h-[3px] overflow-hidden rounded-[1px] bg-secondary">
                <span
                  className="block h-full bg-up"
                  style={{ width: `${Math.max(0, Math.min(100, s.rerankScore * 100))}%` }}
                />
              </span>

              <span className="text-right font-mono text-xs whitespace-nowrap text-up">
                {s.rerankScore.toFixed(3)}
                {reranked && (
                  <span className="ml-1.5 text-[10.5px] text-faint">
                    {s.vectorScore.toFixed(3)}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
