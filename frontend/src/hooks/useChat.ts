import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ChatWebSocket } from '../services/websocket';
import { getChatHistory } from '../services/api';
import type { ChatRequest } from '@/types/api';

const CONVERSATION_ID_KEY = 'rag-chatbot-conversation-id';

function createConversationId(): string {
  return crypto.randomUUID();
}

function getOrCreateConversationId(): string {
  const stored = localStorage.getItem(CONVERSATION_ID_KEY);
  if (stored) return stored;

  const created = createConversationId();
  localStorage.setItem(CONVERSATION_ID_KEY, created);
  return created;
}

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  isStreaming?: boolean;
}

/** Append streamed text to the answer bubble that is currently being filled. */
function appendToLastBotMessage(messages: Message[], text: string): Message[] {
  const last = messages[messages.length - 1];
  if (last?.sender !== 'bot') return messages;
  return [...messages.slice(0, -1), { ...last, text: last.text + text, isStreaming: true }];
}

/** Close out the answer bubble, optionally recording why it ended early. */
function finishLastBotMessage(
  messages: Message[],
  errorMessage: string | undefined,
  fallbackId: number,
): Message[] {
  const last = messages[messages.length - 1];

  if (last?.sender === 'bot') {
    const text = errorMessage
      ? [last.text, `Error: ${errorMessage}`].filter(Boolean).join('\n\n')
      : last.text;
    return [...messages.slice(0, -1), { ...last, text, isStreaming: false }];
  }

  // A transport error can arrive before any answer bubble exists.
  if (!errorMessage) return messages;

  return [
    ...messages,
    {
      id: fallbackId,
      text: `Error: ${errorMessage}`,
      sender: 'bot',
      timestamp: new Date(),
      isStreaming: false,
    },
  ];
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const wsRef = useRef<ChatWebSocket | null>(null);
  const idRef = useRef(0);
  const conversationIdRef = useRef(getOrCreateConversationId());

  // flushSync keeps each arriving chunk painted immediately, so the answer
  // types out instead of landing in batched jumps.
  const appendToAnswer = useCallback((text: string) => {
    const update = (prev: Message[]) => appendToLastBotMessage(prev, text);
    flushSync(() => setMessages(update));
  }, []);

  // The server ends every response with a `done` frame, so this runs exactly
  // once per request. Nothing here infers the end of a stream from a pause.
  const endResponse = useCallback((errorMessage?: string) => {
    const fallbackId = errorMessage ? ++idRef.current : 0;
    const update = (prev: Message[]) => finishLastBotMessage(prev, errorMessage, fallbackId);
    setMessages(update);
    setIsStreaming(false);
  }, []);

  useEffect(() => {
    const ws = new ChatWebSocket((frame) => {
      switch (frame.type) {
        case 'sources':
        case 'token':
          appendToAnswer(frame.text);
          break;
        case 'error':
          endResponse(frame.message);
          break;
        case 'done':
          endResponse();
          break;
      }
    }, endResponse);

    wsRef.current = ws;
    return () => {
      ws.disconnect();
    };
  }, [appendToAnswer, endResponse]);

  useEffect(() => {
    let active = true;

    void getChatHistory(conversationIdRef.current)
      .then((history) => {
        if (!active) return;

        const restored: Message[] = history.messages.flatMap((exchange) => [
          {
            id: exchange.id * 2 - 1,
            text: exchange.question,
            sender: 'user' as const,
            timestamp: new Date(exchange.created_at),
          },
          {
            id: exchange.id * 2,
            text: exchange.answer,
            sender: 'bot' as const,
            timestamp: new Date(exchange.created_at),
            isStreaming: false,
          },
        ]);

        idRef.current = restored.reduce((largest, message) => Math.max(largest, message.id), 0);
        setMessages(restored);
      })
      .catch(() => {
        if (active) endResponse('Failed to load persisted chat history');
      })
      .finally(() => {
        if (active) setIsLoadingHistory(false);
      });

    return () => {
      active = false;
    };
  }, [endResponse]);

  const sendMessage = useCallback((request: Omit<ChatRequest, 'conversation_id'>) => {
    if (!request.text.trim() || isStreaming || isLoadingHistory) return;

    const userMsg: Message = {
      id: ++idRef.current,
      text: request.text,
      sender: 'user',
      timestamp: new Date(),
    };
    const botPlaceholder: Message = {
      id: ++idRef.current,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, botPlaceholder]);
    setIsStreaming(true);
    wsRef.current?.sendMessage({
      ...request,
      conversation_id: conversationIdRef.current,
    });
  }, [isLoadingHistory, isStreaming]);

  const clearMessages = useCallback(() => {
    const conversationId = createConversationId();
    localStorage.setItem(CONVERSATION_ID_KEY, conversationId);
    conversationIdRef.current = conversationId;
    setMessages([]);
    idRef.current = 0;
    wsRef.current?.reconnect();
  }, []);

  return { messages, isStreaming: isStreaming || isLoadingHistory, sendMessage, clearMessages };
}
