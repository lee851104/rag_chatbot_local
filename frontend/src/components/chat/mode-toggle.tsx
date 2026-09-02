import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Database } from "lucide-react"

export interface ChatModes {
  rag: boolean
}

interface ModeToggleProps {
  modes: ChatModes
  onModesChange: (modes: ChatModes) => void
}

const modeConfig = [
  {
    key: "rag" as const,
    icon: Database,
    label: "RAG Mode",
    description: "Use uploaded documents for context",
  },
]

export function ModeToggle({
  modes,
  onModesChange,
}: Readonly<ModeToggleProps>) {
  const toggleMode = (key: keyof ChatModes) => {
    onModesChange({ ...modes, [key]: !modes[key] })
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex items-center gap-1">
        {modeConfig.map(({ key, icon: Icon, label, description }) => (
          <Tooltip key={key}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => toggleMode(key)}
                aria-label={label}
                aria-pressed={modes[key]}
                className={cn(
                  "h-8 rounded-sm px-2.5 gap-1.5 text-xs font-medium transition-colors duration-300",
                  modes[key]
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="rounded-sm bg-popover border-border">
              <p className="font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
