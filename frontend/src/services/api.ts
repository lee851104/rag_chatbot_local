import axios from 'axios';

import type {
  ChatHistoryResponse,
  DocumentListResponse,
  DocumentUploadResponse,
  HealthResponse,
} from '@/types/api';

const API_BASE = import.meta.env.VITE_API_URL ?? '';

/**
 * Where this build is pointed. Shown in the status bar so a misconfigured
 * `VITE_API_URL` reads as "wrong address" rather than "backend is down".
 */
export const apiOrigin = API_BASE || window.location.origin;

export async function getHealth(): Promise<HealthResponse> {
  const response = await axios.get<HealthResponse>(`${API_BASE}/health`, { timeout: 5000 });
  return response.data;
}

export async function uploadDocument(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post<DocumentUploadResponse>(
    `${API_BASE}/documents`,
    formData,
    {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (event) => {
        if (onProgress && event.total) {
          onProgress(Math.round((event.loaded * 100) / event.total));
        }
      },
    },
  );
  return response.data;
}

export async function listDocuments(): Promise<DocumentListResponse> {
  const response = await axios.get<DocumentListResponse>(`${API_BASE}/documents`);
  return response.data;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await axios.delete(`${API_BASE}/documents/${documentId}`);
}

export async function getChatHistory(conversationId: string): Promise<ChatHistoryResponse> {
  const response = await axios.get<ChatHistoryResponse>(
    `${API_BASE}/chat/history/${conversationId}`,
  );
  return response.data;
}

export async function deleteChatHistory(conversationId: string): Promise<void> {
  await axios.delete(`${API_BASE}/chat/history/${conversationId}`);
}
