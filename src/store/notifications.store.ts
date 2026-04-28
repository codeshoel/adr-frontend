"use client";
import { create } from "zustand";
import type { Notification } from "@/types";
import { notificationsApi } from "@/lib/api/notifications";

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isPolling: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}

let pollingInterval: NodeJS.Timeout | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isPolling: false,

  fetchNotifications: async () => {
    try {
      const { data } = await notificationsApi.list();
      set({ notifications: data });
    } catch {
      // ignore
    }
  },

  fetchUnreadCount: async () => {
    try {
      const { data } = await notificationsApi.unreadCount();
      set({ unreadCount: data.unread_count });
    } catch {
      // ignore
    }
  },

  markRead: async (id) => {
    await notificationsApi.markRead(id);
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllRead: async () => {
    await notificationsApi.markAllRead();
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    }));
  },

  startPolling: () => {
    if (pollingInterval) return;
    get().fetchUnreadCount();
    pollingInterval = setInterval(() => {
      get().fetchUnreadCount();
    }, 30000);
    set({ isPolling: true });
  },

  stopPolling: () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    set({ isPolling: false });
  },
}));
