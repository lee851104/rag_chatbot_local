import type { TurnMetrics as Metrics } from '@/types/chat'

interface TurnMetricsProps {
  metrics: Metrics
  isStreaming?: boolean
}

/** Milliseconds as seconds once past a second, so the row stays narrow. */
function ms(value: number): string {
  return value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${Math.round(value)}ms`
}

/**
 * Timings for one answer.
 *
 * Only what the client can genuinely observe: when the first token landed, when
 * the stream went quiet, how many frames arrived. Anything needing backend
 * instrumentation -- how many LLM calls this turn cost, how long retrieval took
 * on its own -- is deliberately absent rather than estimated, because a plausible
 * wrong number is worse here than no number.
 */
export function TurnMetrics({ metrics, isStreaming }: TurnMetricsProps) {
  const { ttftMs, totalMs, tokens } = metrics
  if (ttftMs === null && tokens === 0) return null

  // Generation rate covers first-token onward, so it reflects the model's pace
  // rather than being dragged down by retrieval and the question rewrite.
  const genMs = totalMs !== null && ttftMs !== null ? totalMs - ttftMs : null
  const rate = genMs !== null && genMs > 0 && tokens > 1 ? (tokens / (genMs / 1000)).toFixed(1) : null

  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 font-mono text-[10.5px] text-faint">
      {ttftMs !== null && (
        <span>
          首字 <span className="text-muted-foreground">{ms(ttftMs)}</span>
        </span>
      )}
      {totalMs !== null && (
        <span>
          總計 <span className={totalMs > 15000 ? 'text-primary' : 'text-muted-foreground'}>{ms(totalMs)}</span>
        </span>
      )}
      <span>
        <span className="text-muted-foreground">{tokens}</span> tokens
      </span>
      {rate !== null && (
        <span>
          <span className="text-muted-foreground">{rate}</span> t/s
        </span>
      )}
      {isStreaming && <span className="text-primary">生成中⋯</span>}
    </div>
  )
}
