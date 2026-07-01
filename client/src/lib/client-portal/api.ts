// Client Portal API — talks to /api/v1/client-portal.
import { apiFetch } from "@/lib/backend/api";

export type PortalClient = {
  id: string;            // client user id
  accessId?: string;     // client_project_access id
  name: string;
  email: string;
  role: "admin" | "viewer";
  status: "Active" | "Disabled" | "Pending";
  rawStatus?: string;
  lastLogin?: string | null;
  emailed?: boolean;
};

export type ClientLoginLog = {
  id: string;
  clientUserId: string;
  ipAddress?: string | null;
  device?: string | null;
  loginTime: string;
  logoutTime?: string | null;
};

export function listProjectClients(projectId: string) {
  return apiFetch<PortalClient[]>(`/client-portal/access?projectId=${encodeURIComponent(projectId)}`);
}

export function inviteClient(body: { projectId: string; name: string; email: string; password: string; role: "admin" | "viewer"; sendEmail?: boolean }) {
  return apiFetch<PortalClient>("/client-portal/invite", { method: "POST", body });
}

export function editClientAccess(accessId: string, body: { name?: string; role?: "admin" | "viewer" }) {
  return apiFetch<PortalClient>(`/client-portal/access/${accessId}`, { method: "PATCH", body });
}

export function resetClientPassword(userId: string, body: { password?: string; sendEmail?: boolean }) {
  return apiFetch<{ ok: true }>(`/client-portal/clients/${userId}/reset-password`, { method: "POST", body });
}

export function setClientStatus(userId: string, status: "active" | "disabled") {
  return apiFetch<PortalClient>(`/client-portal/clients/${userId}/status`, { method: "PATCH", body: { status } });
}

export function revokeAccess(accessId: string) {
  return apiFetch<{ ok: true }>(`/client-portal/access/${accessId}`, { method: "DELETE" });
}

export function listClientProjects(clientUserId: string) {
  return apiFetch<any[]>(`/client-portal/client-projects/${clientUserId}`);
}

export function saveClientProjects(clientUserId: string, body: { projectIds: string[]; role?: "admin" | "viewer" }) {
  return apiFetch<any[]>(`/client-portal/client-projects/${clientUserId}`, { method: "PUT", body });
}

export function deleteClient(userId: string) {
  return apiFetch<{ ok: true }>(`/client-portal/clients/${userId}`, { method: "DELETE" });
}

export function clientLoginLogs(clientId: string) {
  return apiFetch<ClientLoginLog[]>(`/client-portal/login-logs?clientId=${encodeURIComponent(clientId)}`);
}

export function myClientProjects() {
  return apiFetch<any[]>("/client-portal/my-projects");
}
