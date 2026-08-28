import ReactMarkdown from 'react-markdown'
import { AlertOctagon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Message } from '@/types/chat'
import { SourceCard } from './source-card'
import { TurnMetrics } from './turn-metrics'

interface ChatMessageProps {
  message: Message
}

function stamp(d: Date): string {
  return d.toLocaleTimeString('zh-TW', { hour12: false })
}

/**
 * One turn.
 *
 * Both roles are laid out as records rather than speech bubbles: the user's
 * line sits right with a rule down its edge, the assistant's runs full width
 * under a labelled header. That keeps the retrieval card, the answer and the
 * timings reading as one block of evidence instead of three attachments to a
 * chat balloon.
 */
export function ChatMessage({ message }: ChatMessageProps) {
  if (message.role === 'user') {
    return (
      <div className="animate-fade-in-up">
        <div className="flex justify-end">
          <div className="max-w-[74%] rounded-sm border border-border border-r-2 border-r-info bg-card px-3 py-2 text-sm whitespace-pre-wrap">
            {message.content}
          </div>
        </div>
        <div className="mt-1 flex items-center justify-end gap-2 font-mono text-[10px] text-faint">
          <span>你</span>
          <span>{stamp(message.timestamp)}</span>
        </div>
      </div>
    )
  }

  const waiting = message.isStreaming && !message.content && !message.retrieval

  return (
    <div className="animate-fade-in-up">
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-[19px] w-[19px] shrink-0 place-items-center rounded-sm border border-primary bg-primary/12 text-[10px] font-bold text-primary">
          ▲
        </span>
        <span className="font-mono text-[10.5px] font-medium tracking-[0.09em] text-primary">
          ASSISTANT
        </span>
        <span className="font-mono text-[10px] text-faint">{stamp(message.timestamp)}</span>
      </div>

      <div className="pl-[27px]">
        {message.retrieval && <SourceCard retrieval={message.retrieval} />}

        {/* The sources frame arrived in a shape the parser did not recognise.
            Showing it raw keeps the information rather than losing it to a
            wording change on the backend. */}
        {message.rawSources && (
          <pre className="mb-3 max-w-[70ch] overflow-x-auto rounded-sm border border-border bg-card px-3 py-2 font-mono text-[10.5px] whitespace-pre-wrap text-muted-foreground">
            {message.rawSources}
          </pre>
        )}

        {message.error ? (
          <div className="flex items-center gap-2 rounded-sm border border-destructive/40 border-l-2 border-l-destructive bg-destructive/8 px-3 py-2 text-xs text-muted-foreground">
            <AlertOctagon className="h-3.5 w-3.5 shrink-0 text-destructive" />
            <span>{message.error}</span>
          </div>
        ) : waiting ? (
          <TypingIndicator />
        ) : (
          <div className="max-w-[70ch] text-sm leading-[1.78]">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2.5 last:mb-0">{children}</p>,
                strong: ({ children }) => (
                  <strong className="font-medium text-white">{children}</strong>
                ),
                code: ({ children, className }) =>
                  className ? (
                    <code className="block overflow-x-auto rounded-sm border border-border bg-secondary p-3 font-mono text-xs">
                      {children}
                    </code>
                  ) : (
                    <code className="rounded-sm border border-border bg-secondary px-1 py-px font-mono text-xs text-[#ffc48a]">
                      {children}
                    </code>
                  ),
                pre: ({ children }) => <pre className="my-2.5">{children}</pre>,
                ul: ({ children }) => (
                  <ul className="my-2 list-disc space-y-1 pl-5 marker:text-faint">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="my-2 list-decimal space-y-1 pl-5 marker:text-faint">{children}</ol>
                ),
                h1: ({ children }) => (
                  <h1 className="mt-3 mb-2 text-base font-semibold text-foreground">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="mt-3 mb-2 text-sm font-semibold text-foreground">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="mt-3 mb-1.5 text-sm font-medium text-foreground">{children}</h3>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-info underline underline-offset-2"
                  >
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-2 border-l-2 border-border-strong pl-3 text-muted-foreground">
                    {children}
                  </blockquote>
                ),
                hr: () => <hr className="my-3 border-border" />,
              }}
            >
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && message.content && (
              <span className="animate-caret ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 bg-primary" />
            )}
          </div>
        )}

        {message.metrics && (
          <TurnMetrics metrics={message.metrics} isStreaming={message.isStreaming} />
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn('animate-typing-dot h-1 w-1 rounded-full bg-primary')}
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </span>
      <span className="font-mono text-[10.5px] text-faint">等待模型回應⋯</span>
    </div>
  )
}
