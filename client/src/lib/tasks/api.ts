// Task detail helpers: assignee management + per-task group chat.
import { apiFetch } from "@/lib/backend/api";
import type { Task, TaskMessage, TaskMessageKind } from "./types";

export function getTask(id: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${id}`);
}
export function addAssignee(taskId: string, userId: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${taskId}/assignees`, { method: "POST", body: { userId } });
}
export function removeAssignee(taskId: string, userId: string): Promise<Task> {
  return apiFetch<Task>(`/tasks/${taskId}/assignees/${userId}`, { method: "DELETE" });
}
export function listMessages(taskId: string): Promise<TaskMessage[]> {
  return apiFetch<TaskMessage[]>(`/tasks/${taskId}/messages`);
}
export function postMessage(taskId: string, msg: {
  kind: TaskMessageKind; body?: string; fileStoreId?: string; fileName?: string; mimeType?: string; durationSec?: number;
}): Promise<TaskMessage> {
  return apiFetch<TaskMessage>(`/tasks/${taskId}/messages`, { method: "POST", body: msg });
}
