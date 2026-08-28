import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export interface ChatModes {
  rag: boolean
}

interface ModeToggleProps {
  modes: ChatModes
  onModesChange: (modes: ChatModes) => void
}

const MODES = [
  {
    key: 'rag' as const,
    label: 'RAG',
    description: '先從你上傳的文件檢索，再讓模型作答；答案會附上來源與分數',
  },
]

/**
 * Mode switches, as indicator lamps rather than buttons.
 *
 * Whether RAG is armed changes what the backend does with the question and what
 * the answer is allowed to draw on, so the state has to survive a glance --
 * hence a filled lamp plus a colour shift plus a border change, not colour alone.
 */
export function ModeToggle({ modes, onModesChange }: ModeToggleProps) {
  const toggle = (key: keyof ChatModes) => {
    onModesChange({ ...modes, [key]: !modes[key] })
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1.5">
        {MODES.map(({ key, label, description }) => {
          const on = modes[key]
          return (
            <Tooltip key={key}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(key)}
                  className={cn(
                    'flex h-[22px] items-center gap-1.5 rounded-sm border px-2.5 text-[11.5px] transition-colors',
                    on
                      ? 'border-primary bg-primary/12 text-primary'
                      : 'border-border-strong text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'h-1.5 w-1.5 shrink-0 rounded-full transition-colors',
                      on ? 'bg-primary' : 'bg-faint',
                    )}
                  />
                  {label}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="border-border-strong bg-popover">
                <p className="text-xs">{description}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </TooltipProvider>
  )
}
