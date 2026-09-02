import { useEffect, useRef, useState } from "react"
import { Paperclip, Send } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { UploadProgress } from "@/hooks/useDocuments"
import { cn } from "@/lib/utils"
import type { DocumentInfo } from "@/types/api"

import { DocumentUpload } from "./document-upload"
import { ModeToggle, type ChatModes } from "./mode-toggle"

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading: boolean
  modes: ChatModes
  onModesChange: (modes: ChatModes) => void
  documents: DocumentInfo[]
  uploading: UploadProgress | null
  onDocumentsChange: (updater: (prev: DocumentInfo[]) => DocumentInfo[]) => void
  onUploadStart: (filename: string) => void
  onUploadProgress: (filename: string, progress: number) => void
  onUploadEnd: () => void
  onError: (message: string) => void
}

export function ChatInput({
  onSend,
  isLoading,
  modes,
  onModesChange,
  documents,
  uploading,
  onDocumentsChange,
  onUploadStart,
  onUploadProgress,
  onUploadEnd,
  onError,
}: Readonly<ChatInputProps>) {
  const [input, setInput] = useState("")
  const [isDocUploadExpanded, setIsDocUploadExpanded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!input.trim() || isLoading) return
    onSend(input.trim())
    setInput("")
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-5 pt-3">
      <div className="mb-2">
        <DocumentUpload
          documents={documents}
          uploading={uploading}
          onDocumentsChange={onDocumentsChange}
          onUploadStart={onUploadStart}
          onUploadProgress={onUploadProgress}
          onUploadEnd={onUploadEnd}
          onError={onError}
          isExpanded={isDocUploadExpanded}
          onToggleExpand={() => setIsDocUploadExpanded((expanded) => !expanded)}
        />
      </div>

      <form onSubmit={handleSubmit}>
        <div
          className={cn(
            "rounded-sm border bg-background transition-colors duration-300 focus-within:border-primary",
            modes.rag ? "border-primary/60" : "border-border",
          )}
        >
          <div className="flex items-center justify-between min-h-11 px-3 border-b border-border">
            <ModeToggle modes={modes} onModesChange={onModesChange} />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsDocUploadExpanded((expanded) => !expanded)}
              aria-label="Toggle documents"
              aria-expanded={isDocUploadExpanded}
              aria-controls="uploaded-documents"
              className={cn(
                "h-8 w-8 rounded-sm",
                documents.length > 0
                  ? "text-primary hover:bg-secondary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
              )}
            >
              <Paperclip className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-end gap-2 p-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your documents..."
              disabled={isLoading}
              rows={1}
              className="flex-1 min-h-11 max-h-[200px] resize-none bg-transparent border-0 rounded-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder:text-muted-foreground py-2.5 px-2 text-sm leading-6"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!input.trim() || isLoading}
              className="h-11 w-11 rounded-sm shrink-0 bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">Send message</span>
            </Button>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground mt-2">
          Enter to send. Shift + Enter for a new line.
        </p>
      </form>
    </div>
  )
}
