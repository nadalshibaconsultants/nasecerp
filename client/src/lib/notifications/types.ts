export type NotificationSeverity = "info" | "warning" | "critical";
export type NotificationKind =
  | "doc-expiry" | "training-expiry" | "leave-pending" | "leave-decided"
  | "task-overdue" | "approval-pending" | "letter-issued" | "punch-out-of-fence";

export type Notification = {
  id: string;
  recipientUserId: string;       // who should see it ("*" = all)
  kind: NotificationKind;
  severity: NotificationSeverity;
  title: string;
  body: string;
  link?: string;                 // optional deep link
  read: boolean;
  createdAt: string;
  // Optional source metadata
  sourceEntityType?: string;
  sourceEntityId?: string;
};
