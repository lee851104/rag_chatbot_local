import { useEffect, useRef } from "react"

import robotLogo from "@/assets/robot-logo.png"
import { ScrollArea } from "@/components/ui/scroll-area"

import { ChatMessage, type Message } from "./chat-message"

interface ChatViewportProps {
  messages: Message[]
}

export function ChatViewport({ messages }: Readonly<ChatViewportProps>) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  if (messages.length === 0) {
    return <EmptyState />
  }

  return (
    <ScrollArea className="flex-1 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto py-10 sm:py-14 space-y-8">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}

function EmptyState() {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto flex items-center justify-center px-6 py-6 sm:py-12">
      <div className="max-w-xl w-full text-center">
        <div className="w-16 h-16 mx-auto rounded-sm bg-secondary overflow-hidden">
          <img
            src={robotLogo}
            alt=""
            className="w-full h-full object-contain p-2"
          />
        </div>

        <p className="mt-8 text-xs font-medium text-muted-foreground">
          RAG workspace
        </p>
        <h1 className="mt-3 text-3xl sm:text-[40px] leading-tight font-medium text-foreground">
          Ask with context.
        </h1>
        <p className="mt-4 max-w-md mx-auto text-sm leading-6 text-muted-foreground">
          Upload a document, enable RAG mode, and get focused answers grounded
          in your own material.
        </p>
      </div>
    </div>
  )
}
