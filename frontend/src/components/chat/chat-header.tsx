import { Plus } from "lucide-react"

import robotLogo from "@/assets/robot-logo.png"
import { Button } from "@/components/ui/button"

interface ChatHeaderProps {
  onNewChat: () => void
  disabled?: boolean
}

export function ChatHeader({ onNewChat, disabled }: Readonly<ChatHeaderProps>) {
  return (
    <header className="shrink-0 h-16 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="h-full max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-sm bg-secondary overflow-hidden">
            <img
              src={robotLogo}
              alt=""
              className="w-full h-full object-contain p-1"
            />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground leading-tight">
              Autara AI
            </p>
            <p className="text-xs text-muted-foreground leading-tight mt-1 truncate">
              Document intelligence
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onNewChat}
          disabled={disabled}
          className="h-9 rounded-sm px-3 text-foreground hover:bg-secondary"
        >
          <Plus className="h-4 w-4" />
          <span>New chat</span>
        </Button>
      </div>
    </header>
  )
}
