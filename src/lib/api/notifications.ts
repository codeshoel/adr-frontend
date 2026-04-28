import client from "./client";
import type { Notification } from "@/types";

export const notificationsApi = {
  list: (unreadOnly?: boolean) =>
    client.get<Notification[]>("/notifications/", { params: { unread_only: unreadOnly } }),

  unreadCount: () => client.get<{ unread_count: number }>("/notifications/unread-count"),

  markRead: (id: string) => client.post(`/notifications/${id}/read`),

  markAllRead: () => client.post("/notifications/read-all"),
};
