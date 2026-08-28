import { RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { BackendStatus } from '@/hooks/useHealth'

interface ChatHeaderProps {
  onNewChat: () => void
  disabled?: boolean
  status: BackendStatus
  version: string | null
  documentCount: number
}

const STATUS_TEXT: Record<BackendStatus, string> = {
  checking: '連線中',
  online: '已連線',
  offline: '連線中斷',
}

const STATUS_DOT: Record<BackendStatus, string> = {
  checking: 'bg-faint',
  online: 'bg-up',
  offline: 'bg-down',
}

export function ChatHeader({
  onNewChat,
  disabled,
  status,
  version,
  documentCount,
}: ChatHeaderProps) {
  return (
    <header className="h-[34px] shrink-0 border-b border-border bg-card">
      <div className="mx-auto flex h-full w-full max-w-4xl items-center gap-2.5 px-5">
        <span className="flex items-center gap-2 text-[13px] font-bold tracking-[0.03em]">
          <span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-primary">
            <span className="h-1 w-1 rounded-full bg-background" />
          </span>
          向量終端
        </span>

        <span className="h-[15px] w-px shrink-0 bg-border-strong" />

        <Chip>
          <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[status])} />
          {STATUS_TEXT[status]}
        </Chip>

        {version && <Chip>v{version}</Chip>}

        <Chip>
          {documentCount} {documentCount === 1 ? 'doc' : 'docs'}
        </Chip>

        <span className="flex-1" />

        <button
          type="button"
          onClick={onNewChat}
          disabled={disabled}
          className={cn(
            'flex h-[21px] items-center gap-1.5 rounded-sm border border-border-strong px-2.5 text-[11.5px] text-muted-foreground transition-colors',
            'hover:border-primary hover:text-primary',
            'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border-strong disabled:hover:text-muted-foreground',
          )}
        >
          <RotateCcw className="h-3 w-3" />
          新對話
        </button>
      </div>
    </header>
  )
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex h-5 items-center gap-1.5 rounded-sm border border-border-strong px-2 font-mono text-[10.5px] whitespace-nowrap text-muted-foreground">
      {children}
    </span>
  )
}
