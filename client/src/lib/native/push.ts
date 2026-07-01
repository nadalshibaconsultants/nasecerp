/**
 * Push Notifications scaffold (Capacitor).
 *
 * To enable, run:
 *   pnpm add @capacitor/push-notifications
 *   npx cap sync
 *
 * Then configure FCM (Android) and APNs (iOS) credentials in the native
 * Xcode/Android Studio projects. Call init() from App.tsx after auth.
 */
import { Capacitor } from "@capacitor/core";
import { notificationsStore } from "@/lib/stores";

export type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

let initialised = false;

export async function initPushNotifications(userId: string | undefined): Promise<void> {
  if (initialised || !userId || !Capacitor.isNativePlatform()) return;
  initialised = true;
  try {
    // Lazy load so web builds work without the plugin.
    const { PushNotifications } = await import(/* @vite-ignore */ "@capacitor/push-notifications" as any);
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive !== "granted") return;
    await PushNotifications.register();
    PushNotifications.addListener("registration", (token: { value: string }) => {
      // Send token to backend so it can target this device when pushing alerts.
      console.log("[push] device token", token.value);
      try { localStorage.setItem("nasec-push-token", token.value); } catch { /* noop */ }
    });
    PushNotifications.addListener("pushNotificationReceived", (n: any) => {
      notificationsStore.put({
        id: "push-" + Math.random().toString(36).slice(2),
        recipientUserId: userId,
        kind: "approval-pending",
        severity: "info",
        title: n.title || "Notification",
        body: n.body || "",
        link: n.data?.link,
        read: false,
        createdAt: new Date().toISOString(),
      });
    });
  } catch (e) {
    console.warn("[push] init failed", e);
    initialised = false;
  }
}
