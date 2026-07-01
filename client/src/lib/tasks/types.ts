export type TaskStatus = "todo" | "in-progress" | "blocked" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskCategory = "design" | "review" | "meeting" | "submission" | "site" | "admin" | "client" | "other";
export type Task = {
  id: string; title: string; description?: string;
  status: TaskStatus; priority: TaskPriority; category: TaskCategory;
  projectId?: string; assigneeUserId?: string; assigneeUserIds?: string[]; reporterUserId?: string;
  dueDate?: string; createdAt: string; updatedAt: string; completedAt?: string;
  tags?: string[];
};

export type TaskMessageKind = "text" | "image" | "file" | "voice";
export type TaskMessage = {
  id: string;
  taskId: string;
  userId?: string | null;
  authorDisplay?: string | null;
  kind: TaskMessageKind;
  body?: string | null;
  fileStoreId?: string | null;
  fileName?: string | null;
  mimeType?: string | null;
  durationSec?: number | null;
  createdAt: string;
};
export const TASK_STATUS_ORDER: TaskStatus[] = ["todo", "in-progress", "blocked", "done"];
export const TASK_STATUS_LABEL: Record<TaskStatus, string> = { todo: "To Do", "in-progress": "In Progress", blocked: "Blocked", done: "Done" };
export const PRIORITY_LABEL: Record<TaskPriority, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
