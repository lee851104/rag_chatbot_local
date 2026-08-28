import { useState, useRef, useEffect } from 'react'
import { Paperclip, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModeToggle, type ChatModes } from './mode-toggle'
import { DocumentUpload } from './document-upload'
import type { DocumentInfo } from '@/types/api'
import type { UploadProgress } from '@/hooks/useDocuments'

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

/** Matches `ALLOWED_UPLOAD_EXTENSIONS` in `backend/config.py`. */
const ACCEPTED = '.md'

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
}: ChatInputProps) {
  const [input, setInput] = useState('')
  const [isDocUploadExpanded, setIsDocUploadExpanded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || isLoading) return
    onSend(input.trim())
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`
  }, [input])

  return (
    <div className="mx-auto w-full max-w-4xl px-5 pt-2.5 pb-2">
      <DocumentUpload
        documents={documents}
        uploading={uploading}
        onDocumentsChange={onDocumentsChange}
        onUploadStart={onUploadStart}
        onUploadProgress={onUploadProgress}
        onUploadEnd={onUploadEnd}
        onError={onError}
        isExpanded={isDocUploadExpanded}
        onToggleExpand={() => setIsDocUploadExpanded(!isDocUploadExpanded)}
      />

      <form onSubmit={handleSubmit}>
        <div className="rounded-[3px] border border-border-strong bg-card focus-within:border-primary">
          <div className="flex items-center gap-1.5 border-b border-border px-2.5 py-2">
            <ModeToggle modes={modes} onModesChange={onModesChange} />

            <button
              type="button"
              onClick={() => setIsDocUploadExpanded(!isDocUploadExpanded)}
              aria-label="附加文件"
              className={cn(
                'relative ml-auto flex h-[22px] w-[22px] items-center justify-center rounded-sm transition-colors',
                documents.length > 0 ? 'text-primary' : 'text-faint hover:text-foreground',
              )}
            >
              <Paperclip className="h-3.5 w-3.5" />
              {documents.length > 0 && (
                <span className="absolute -top-1 -right-1 grid h-3.5 min-w-3.5 place-items-center rounded-sm bg-primary px-0.5 font-mono text-[9px] font-semibold text-primary-foreground">
                  {documents.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex items-end gap-2.5 py-2 pr-2.5 pl-3">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="問點什麼⋯"
              disabled={isLoading}
              rows={1}
              className={cn(
                'max-h-[180px] min-h-[22px] flex-1 resize-none border-0 bg-transparent p-0 text-sm leading-relaxed',
                'text-foreground placeholder:text-faint focus:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="送出"
              className={cn(
                'grid h-[30px] w-[30px] shrink-0 place-items-center rounded-sm transition-all',
                'bg-primary text-primary-foreground hover:brightness-110',
                'disabled:cursor-not-allowed disabled:bg-secondary disabled:text-faint',
              )}
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-1.5 flex justify-between font-mono text-[10px] text-faint">
          <span>Enter 送出 · Shift + Enter 換行</span>
          <span>接受 {ACCEPTED}</span>
        </div>
      </form>
    </div>
  )
}
