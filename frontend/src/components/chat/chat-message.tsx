import { User } from "lucide-react"
import ReactMarkdown from "react-markdown"

import robotLogo from "@/assets/robot-logo.png"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  isStreaming?: boolean
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: Readonly<ChatMessageProps>) {
  const isUser = message.role === "user"

  return (
    <article
      className={cn(
        "flex gap-3 sm:gap-4 animate-fade-in-up",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <Avatar className="h-8 w-8 shrink-0 rounded-sm bg-secondary">
        {isUser ? (
          <AvatarFallback className="rounded-sm bg-secondary text-muted-foreground">
            <User className="h-4 w-4" />
          </AvatarFallback>
        ) : (
          <>
            <AvatarImage
              src={robotLogo}
              alt="Autara AI"
              className="object-contain p-1"
            />
            <AvatarFallback className="rounded-sm bg-secondary text-primary">
              AI
            </AvatarFallback>
          </>
        )}
      </Avatar>

      <div
        className={cn(
          "max-w-[82%] px-4 py-3 text-sm leading-6",
          isUser
            ? "rounded-sm bg-message-user text-foreground"
            : "px-0 pt-1 bg-message-ai text-foreground",
        )}
      >
        {message.isStreaming && !message.content ? (
          <TypingIndicator />
        ) : (
          <div className="max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => (
                  <p className="leading-6 mb-3 last:mb-0">{children}</p>
                ),
                code: ({ children, className }) => {
                  const isInline = !className
                  return isInline ? (
                    <code className="bg-secondary px-1.5 py-0.5 rounded-sm text-foreground font-mono text-[13px]">
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-secondary p-4 rounded-sm overflow-x-auto font-mono text-[13px] leading-5 text-foreground">
                      {children}
                    </code>
                  )
                },
                pre: ({ children }) => (
                  <pre className="bg-secondary rounded-sm overflow-hidden my-4">
                    {children}
                  </pre>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 space-y-1 my-3">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 space-y-1 my-3">{children}</ol>
                ),
                h1: ({ children }) => (
                  <h1 className="text-xl font-medium mb-3">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-medium mb-3">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-medium mb-2">{children}</h3>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    className="text-primary underline-offset-4 hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {children}
                  </a>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-border pl-4 text-muted-foreground my-3">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
            {message.isStreaming && message.content && (
              <span className="inline-block w-1.5 h-4 bg-primary ml-1 animate-pulse" />
            )}
          </div>
        )}
      </div>
    </article>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-2" aria-label="Generating response">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-typing-dot"
          style={{ animationDelay: `${index * 0.2}s` }}
        />
      ))}
    </div>
  )
}
