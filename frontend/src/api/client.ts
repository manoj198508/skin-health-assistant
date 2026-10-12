import type {
  Conversation,
  ConversationDetail,
  ConversationMode,
  MessageCreateResponse,
  PhotoAnalysisResponse,
} from "./types";

// If VITE_API_BASE_URL isn't set at build time, assume the backend is reachable on the
// same host the page was loaded from (port 8000). This lets one production build work
// whether it's opened via localhost, a LAN IP, or a public static IP, with no rebuild needed.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || `${window.location.protocol}//${window.location.hostname}:8000`;

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const ACCESS_CODE_STORAGE_KEY = "accessCode";

function getStoredAccessCode(): string | null {
  try {
    return localStorage.getItem(ACCESS_CODE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredAccessCode(code: string): void {
  try {
    localStorage.setItem(ACCESS_CODE_STORAGE_KEY, code);
  } catch {
    // ignore (private browsing, etc.)
  }
}

export function clearStoredAccessCode(): void {
  try {
    localStorage.removeItem(ACCESS_CODE_STORAGE_KEY);
  } catch {
    // ignore
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  const code = getStoredAccessCode();
  if (code) headers.set("X-Access-Code", code);

  const res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // response body wasn't JSON; fall back to statusText
    }
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return res.json() as Promise<T>;
}

export async function verifyAccessCode(code: string): Promise<void> {
  await request<{ ok: boolean }>("/api/auth/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
}

export function createConversation(mode: ConversationMode): Promise<Conversation> {
  return request<Conversation>("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mode }),
  });
}

export function listConversations(): Promise<Conversation[]> {
  return request<Conversation[]>("/api/conversations");
}

export function getConversation(conversationId: string): Promise<ConversationDetail> {
  return request<ConversationDetail>(`/api/conversations/${conversationId}`);
}

export function deleteConversation(conversationId: string): Promise<void> {
  return request<void>(`/api/conversations/${conversationId}`, { method: "DELETE" });
}

export function postMessage(
  conversationId: string,
  content: string,
  language: string
): Promise<MessageCreateResponse> {
  return request<MessageCreateResponse>(`/api/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, language }),
  });
}

export function uploadPhoto(conversationId: string, file: File, language: string): Promise<PhotoAnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("language", language);
  return request<PhotoAnalysisResponse>(`/api/conversations/${conversationId}/photo`, {
    method: "POST",
    body: formData,
  });
}

export function getPhotoUrl(conversationId: string, imageId: string): string {
  return `${API_BASE_URL}/api/conversations/${conversationId}/photo/${imageId}`;
}
