import { useEffect, useRef } from 'react'
import { ChatMessage } from './chat-message'
import type { Message } from '@/types/chat'

interface ChatViewportProps {
  messages: Message[]
}

export function ChatViewport({ messages }: ChatViewportProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  if (messages.length === 0) {
    return <EmptyState />
  }

  // A plain scroll container rather than a styled scroll-area primitive: the
  // stream re-renders on every token, and `scrollIntoView` needs to act on the
  // real scrolling element to keep up.
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-4xl space-y-6 px-5 py-6">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto px-5">
      <div className="w-full max-w-lg py-8">
        <p className="font-mono text-[10.5px] tracking-[0.16em] text-faint uppercase">Ready</p>
        <h1 className="mt-2 text-xl font-semibold tracking-tight">問點什麼</h1>
        <p className="mt-1.5 max-w-md text-[13px] leading-relaxed text-muted-foreground">
          打開 RAG 之後，回答會先經過你上傳的 Markdown 文件；每則答案會標出用了哪些片段、相關度多少、花了多久。
        </p>

        <ul className="mt-6 overflow-hidden rounded-sm border border-border bg-card">
          <li className="flex items-start gap-3 px-3.5 py-2.5">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-up" />
            <span className="min-w-0">
              <span className="font-mono text-[11.5px] font-medium text-secondary-foreground">
                文件問答
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                上傳 Markdown，檢索後兩階段排序（向量搜尋加上 cross-encoder 重排）再作答。
              </span>
            </span>
          </li>
          <li className="flex items-start gap-3 border-t border-border/70 px-3.5 py-2.5">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-up" />
            <span className="min-w-0">
              <span className="font-mono text-[11.5px] font-medium text-secondary-foreground">
                對話保留
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                對話存在後端，重新整理不會消失。按「新對話」開一段新的。
              </span>
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}
