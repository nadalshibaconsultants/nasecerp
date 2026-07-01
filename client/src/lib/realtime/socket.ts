// Browser socket.io client. Lazily connects after the user is authenticated
// (access token available). Disconnects on logout. Surface as `getSocket()`
// and a `useRealtime(event, handler)` React hook.
import { io, type Socket } from "socket.io-client";
import { useEffect, useRef } from "react";
import { getAccessToken } from "@/lib/backend/api";

const PATH = "/api/v1/realtime";
let socket: Socket | null = null;

export function getSocket(): Socket | null {
  const token = getAccessToken();
  if (!token) return null;
  if (socket && socket.connected) return socket;
  if (!socket) {
    socket = io({
      path: PATH,
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1500,
    });
    socket.on("connect_error", (err) => {
      console.warn("[realtime] connect_error", err.message);
    });
  } else {
    socket.auth = { token };
    socket.connect();
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function useRealtime<T = unknown>(event: string, handler: (payload: T) => void) {
  const cbRef = useRef(handler);
  cbRef.current = handler;
  useEffect(() => {
    const s = getSocket();
    if (!s) return;
    const fn = (p: T) => cbRef.current(p);
    s.on(event, fn);
    return () => { s.off(event, fn); };
  }, [event]);
}

export function subscribeProject(projectId: string) {
  getSocket()?.emit("subscribe:project", projectId);
}
export function unsubscribeProject(projectId: string) {
  getSocket()?.emit("unsubscribe:project", projectId);
}
