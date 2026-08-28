import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { apiOrigin } from '@/services/api'
import type { BackendStatus } from '@/hooks/useHealth'
import type { ChatModes } from './mode-toggle'

interface StatusBarProps {
  status: BackendStatus
  documentCount: number
  modes: ChatModes
  isStreaming: boolean
}

/**
 * Bottom strip.
 *
 * Limited to facts the client can stand behind: where it is pointed, whether
 * that endpoint answers, how many documents are indexed, whether RAG is armed.
 * Model name, embedding model and chunk totals would belong here too, but no
 * endpoint serves them -- `GET /health` returns only a status string and a
 * version. A hard-coded model name would be a caption, not a readout.
 */
export function StatusBar({ status, documentCount, modes, isStreaming }: StatusBarProps) {
  return (
    <footer className="h-[23px] shrink-0 border-t border-border bg-card">
      <div className="mx-auto flex h-full w-full max-w-4xl items-center gap-4 px-5 text-[10.5px] text-faint">
        <Item label="端點">
          <span className="text-muted-foreground">{shortOrigin(apiOrigin)}</span>
        </Item>

        <Item label="狀態">
          <span
            className={cn(
              status === 'online' && 'text-up',
              status === 'offline' && 'text-down',
              status === 'checking' && 'text-muted-foreground',
            )}
          >
            {status === 'online' ? '正常' : status === 'offline' ? '無回應' : '檢查中'}
          </span>
        </Item>

        <Item label="知識庫">
          <span className="text-muted-foreground">{documentCount} docs</span>
        </Item>

        <Item label="RAG">
          <span className={modes.rag ? 'text-primary' : 'text-muted-foreground'}>
            {modes.rag ? '開啟' : '關閉'}
          </span>
        </Item>

        <span className="flex-1" />

        {isStreaming && <span className="text-primary">● 生成中</span>}
        <Clock />
      </div>
    </footer>
  )
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 whitespace-nowrap">
      {label}
      <span className="font-mono">{children}</span>
    </span>
  )
}

/** `http://192.168.1.20:8000` -> `192.168.1.20:8000`. Keeps the bar narrow. */
function shortOrigin(origin: string): string {
  return origin.replace(/^https?:\/\//, '')
}

function Clock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <span className="font-mono text-muted-foreground">
      {now.toLocaleTimeString('zh-TW', { hour12: false })}
    </span>
  )
}
