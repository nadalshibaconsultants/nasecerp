// Chat API — talks to /api/v1/chat. Real users, persisted messages, unread counts.
import { apiFetch } from "@/lib/backend/api";

export type ChatUser = { id: string; displayName: string; role: string; avatarColor?: string | null };

export type ChatMember = { id: string; displayName: string; avatarColor?: string | null };

export type Conversation = {
  id: string;
  type: "dm" | "group";
  name: string;
  members: ChatMember[];
  lastMessage: string | null;
  lastMessageAt: string;
  unread: number;
};

export type ChatMessage = {
  id: string;
  conversationId?: string;
  body: string;
  createdAt: string;
  senderId: string | null;
  senderName?: string | null;
  avatarColor?: string | null;
  mine: boolean;
};

export const listChatUsers = () => apiFetch<ChatUser[]>("/chat/users");
export const listConversations = () => apiFetch<Conversation[]>("/chat/conversations");
export const createConversation = (body: { type: "dm" | "group"; memberIds: string[]; name?: string }) =>
  apiFetch<{ id: string; reused: boolean }>("/chat/conversations", { method: "POST", body });
export const getMessages = (conversationId: string) =>
  apiFetch<ChatMessage[]>(`/chat/conversations/${conversationId}/messages`);
export const sendMessage = (conversationId: string, body: string) =>
  apiFetch<ChatMessage>(`/chat/conversations/${conversationId}/messages`, { method: "POST", body: { body } });
export const markRead = (conversationId: string) =>
  apiFetch<{ ok: true }>(`/chat/conversations/${conversationId}/read`, { method: "POST" });
export const getUnreadCount = () => apiFetch<{ unread: number }>("/chat/unread-count");
