import { useCallback, useMemo, useState } from 'react'
import { AlertOctagon } from 'lucide-react'
import { ChatHeader, ChatViewport, ChatInput, StatusBar, type ChatModes } from '@/components/chat'
import { useChat } from '@/hooks/useChat'
import { useDocuments } from '@/hooks/useDocuments'
import { useHealth } from '@/hooks/useHealth'
import type { Message } from '@/types/chat'

function App() {
  const { messages: rawMessages, isStreaming, sendMessage, clearMessages } = useChat()
  const { documents, uploading, error, setDocuments, setUploading, setError } = useDocuments()
  const { status, version } = useHealth()

  const [modes, setModes] = useState<ChatModes>({ rag: false })

  // The hook keeps its own message shape; the components render a display shape.
  // This is the one place the two are mapped.
  const messages: Message[] = useMemo(
    () =>
      rawMessages.map((msg) => ({
        id: String(msg.id),
        role: msg.sender === 'user' ? ('user' as const) : ('assistant' as const),
        content: msg.text,
        timestamp: msg.timestamp,
        isStreaming: msg.isStreaming,
        retrieval: msg.retrieval,
        rawSources: msg.rawSources,
        metrics: msg.metrics,
      })),
    [rawMessages],
  )

  // ChatModes is the UI's own shape, ChatRequest is the wire shape. A rename on
  // either side surfaces here.
  const handleSend = useCallback(
    (content: string) => {
      sendMessage({ text: content, rag: modes.rag })
    },
    [sendMessage, modes.rag],
  )

  const handleUploadStart = useCallback(
    (filename: string) => {
      setError(null)
      setUploading({ filename, progress: 0 })
    },
    [setError, setUploading],
  )

  const handleUploadProgress = useCallback(
    (filename: string, progress: number) => setUploading({ filename, progress }),
    [setUploading],
  )

  const handleUploadEnd = useCallback(() => setUploading(null), [setUploading])

  return (
    <div className="flex h-screen flex-col bg-background">
      <ChatHeader
        onNewChat={clearMessages}
        disabled={isStreaming}
        status={status}
        version={version}
        documentCount={documents.length}
      />

      <main className="flex min-h-0 flex-1 flex-col">
        <ChatViewport messages={messages} />

        {error && (
          <div className="mx-auto w-full max-w-4xl px-5">
            <div className="flex items-center gap-2 rounded-sm border border-destructive/40 border-l-2 border-l-destructive bg-destructive/8 px-3 py-2 text-xs text-muted-foreground">
              <AlertOctagon className="h-3.5 w-3.5 shrink-0 text-destructive" />
              <span className="flex-1">{error}</span>
              <button
                type="button"
                onClick={() => setError(null)}
                className="font-mono text-[10.5px] text-faint hover:text-foreground"
              >
                關閉
              </button>
            </div>
          </div>
        )}

        <div className="shrink-0 border-t border-border">
          <ChatInput
            onSend={handleSend}
            isLoading={isStreaming}
            modes={modes}
            onModesChange={setModes}
            documents={documents}
            uploading={uploading}
            onDocumentsChange={setDocuments}
            onUploadStart={handleUploadStart}
            onUploadProgress={handleUploadProgress}
            onUploadEnd={handleUploadEnd}
            onError={setError}
          />
        </div>
      </main>

      <StatusBar
        status={status}
        documentCount={documents.length}
        modes={modes}
        isStreaming={isStreaming}
      />
    </div>
  )
}

export default App
