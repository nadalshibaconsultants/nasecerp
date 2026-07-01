// Realtime fan-out via socket.io. Each authenticated socket joins:
//   - "user:<userId>"       — own private channel (notifications, DMs)
//   - "role:<role>"          — role-scoped broadcasts (e.g. submittal-overdue → directors)
//   - "project:<projectId>"  — broadcasts opt-in via emitToProject below
//
// Rooms are joined on connect using the verified JWT payload. App code should
// call the exported helpers (emit*) instead of touching the io instance.
import type { Server as HttpServer } from "node:http";
import { Server, type Socket } from "socket.io";
import { verifyAccessToken, type AccessTokenPayload } from "./jwt.js";
import { corsOrigins } from "../env.js";

let io: Server | null = null;

function authenticateSocket(socket: Socket, next: (err?: Error) => void) {
  const token = socket.handshake.auth?.token || socket.handshake.query?.token;
  if (!token || typeof token !== "string") return next(new Error("missing token"));
  try {
    const user = verifyAccessToken(token);
    (socket.data as any).user = user;
    next();
  } catch {
    next(new Error("invalid token"));
  }
}

export function startRealtime(server: HttpServer) {
  io = new Server(server, {
    path: "/api/v1/realtime",
    cors: { origin: corsOrigins, credentials: true },
  });

  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    const user = (socket.data as any).user as AccessTokenPayload;
    socket.join(`user:${user.sub}`);
    socket.join(`role:${user.role}`);
    socket.emit("ready", { userId: user.sub, role: user.role });

    socket.on("subscribe:project", (projectId: string) => {
      if (typeof projectId === "string" && projectId.length === 36) socket.join(`project:${projectId}`);
    });
    socket.on("unsubscribe:project", (projectId: string) => {
      socket.leave(`project:${projectId}`);
    });

    socket.on("subscribe:task", (taskId: string) => {
      if (typeof taskId === "string" && taskId.length === 36) socket.join(`task:${taskId}`);
    });
    socket.on("unsubscribe:task", (taskId: string) => {
      socket.leave(`task:${taskId}`);
    });
  });

  console.log("[realtime] socket.io listening on /api/v1/realtime");
}

// ---- emit helpers --------------------------------------------------------
function safeEmit(room: string, event: string, payload: unknown) {
  if (!io) return;
  io.to(room).emit(event, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  safeEmit(`user:${userId}`, event, payload);
}

export function emitToRole(role: string, event: string, payload: unknown) {
  safeEmit(`role:${role}`, event, payload);
}

export function emitToProject(projectId: string, event: string, payload: unknown) {
  safeEmit(`project:${projectId}`, event, payload);
}

export function emitToTask(taskId: string, event: string, payload: unknown) {
  safeEmit(`task:${taskId}`, event, payload);
}

export function emitGlobal(event: string, payload: unknown) {
  io?.emit(event, payload);
}
