import type { Task } from "@/lib/tasks/types";
const today = new Date();
function days(n: number) { return new Date(today.getTime() + n * 86_400_000).toISOString().slice(0, 10); }
function ts(n: number) { return new Date(today.getTime() + n * 86_400_000).toISOString(); }

export const SEED_TASKS: Task[] = [
  { id: "tk-1", title: "Issue IFC drawings — Marina Heights", category: "submission", priority: "urgent", status: "in-progress", projectId: "marina-heights", assigneeUserId: "u-pm", reporterUserId: "u-director", description: "All architectural IFC sheets reviewed and ready to issue.", dueDate: days(2), createdAt: ts(-5), updatedAt: ts(-1) },
  { id: "tk-2", title: "Concept design review — Al Wasl Tower", category: "review", priority: "high", status: "todo", projectId: "al-wasl-tower", assigneeUserId: "u-design", description: "Internal review before client gate G2.", dueDate: days(4), createdAt: ts(-3), updatedAt: ts(-3) },
  { id: "tk-3", title: "Client meeting prep — Dubai Creek Residences", category: "client", priority: "medium", status: "todo", projectId: "dubai-creek", assigneeUserId: "u-design", dueDate: days(6), createdAt: ts(-2), updatedAt: ts(-2) },
  { id: "tk-4", title: "RFI-2026-022 response — Marina Heights", category: "submission", priority: "high", status: "in-progress", projectId: "marina-heights", assigneeUserId: "u-pm", description: "Contractor RFI on rebar cover at pile cap zone B.", dueDate: days(1), createdAt: ts(-2), updatedAt: ts(-1) },
  { id: "tk-5", title: "Site inspection — JLT Commercial", category: "site", priority: "medium", status: "done", projectId: "jlt-commercial", assigneeUserId: "u-site", dueDate: days(-1), createdAt: ts(-7), updatedAt: ts(-1), completedAt: ts(-1) },
  { id: "tk-6", title: "BOQ revision — Palm Villas", category: "design", priority: "low", status: "blocked", projectId: "palm-villas", assigneeUserId: "u-pm", description: "Awaiting client decision on finishes spec.", dueDate: days(10), createdAt: ts(-10), updatedAt: ts(-2) },
  { id: "tk-7", title: "Authority NOC submission — Business Bay Tower B", category: "submission", priority: "urgent", status: "todo", projectId: "business-bay-tower", assigneeUserId: "u-design", dueDate: days(3), createdAt: ts(-1), updatedAt: ts(-1) },
  { id: "tk-8", title: "Renew DEWA contractor licence", category: "admin", priority: "high", status: "todo", assigneeUserId: "u-hr", dueDate: days(14), createdAt: ts(-5), updatedAt: ts(-5) },
  { id: "tk-9", title: "Q1 financial close", category: "admin", priority: "high", status: "in-progress", assigneeUserId: "u-finance", dueDate: days(7), createdAt: ts(-12), updatedAt: ts(-1) },
  { id: "tk-10", title: "Lead follow-up — Sobha Realty", category: "client", priority: "medium", status: "in-progress", assigneeUserId: "u-bd", dueDate: days(2), createdAt: ts(-3), updatedAt: ts(0) },
  { id: "tk-11", title: "Internal training — Revit advanced", category: "admin", priority: "low", status: "done", assigneeUserId: "u-design", dueDate: days(-3), createdAt: ts(-15), updatedAt: ts(-3), completedAt: ts(-3) },
  { id: "tk-12", title: "Contract negotiation — Aldar (Yas Island)", category: "client", priority: "urgent", status: "in-progress", assigneeUserId: "u-bd", dueDate: days(5), createdAt: ts(-7), updatedAt: ts(-1) },
];
