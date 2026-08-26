import type { ChatStreamClientMessage, ChatStreamServerMessage } from '@/types/api';

type FrameHandler = (frame: ChatStreamServerMessage) => void;
type ErrorHandler = (error: string) => void;

const WS_BASE = (() => {
  const apiUrl = import.meta.env.VITE_API_URL ?? '';
  if (apiUrl) {
    return apiUrl.replace(/^http/, 'ws');
  }
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${window.location.host}`;
})();

const WS_URL = `${WS_BASE}/chat/stream`;

export class ChatWebSocket {
  private ws: WebSocket | null = null;
  private readonly onFrame: FrameHandler;
  private readonly onError: ErrorHandler;

  constructor(onFrame: FrameHandler, onError: ErrorHandler) {
    this.onFrame = onFrame;
    this.onError = onError;
  }

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      if (this.ws?.readyState === WebSocket.CONNECTING) {
        // Wait for existing connection attempt
        const checkConnection = setInterval(() => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            clearInterval(checkConnection);
            resolve();
          } else if (this.ws?.readyState === WebSocket.CLOSED) {
            clearInterval(checkConnection);
            reject(new Error('Connection failed'));
          }
        }, 50);
        return;
      }

      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        resolve();
      };

      this.ws.onmessage = (event) => {
        let frame: ChatStreamServerMessage;
        try {
          frame = JSON.parse(event.data as string) as ChatStreamServerMessage;
        } catch {
          this.onError('The server sent a frame that was not valid JSON');
          return;
        }
        this.onFrame(frame);
      };

      this.ws.onerror = () => {
        this.onError('WebSocket connection error');
        reject(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        this.ws = null;
        // No auto-reconnect
      };
    });
  }

  async sendMessage(message: ChatStreamClientMessage): Promise<void> {
    try {
      await this.connect();
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(message));
      } else {
        this.onError('WebSocket is not connected');
      }
    } catch (error) {
      this.onError(error instanceof Error ? error.message : 'Failed to connect');
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  reconnect(): void {
    this.disconnect();
    this.ws = null;
  }
}
