import { create } from 'zustand';
import type { Notification } from '../types/notification';

interface NotificationState {
  unreadCount: number;
  notifications: Notification[];
  
  setNotifications: (notifications: Notification[], unreadCount: number) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clear: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
  notifications: [],

  setNotifications: (notifications, unreadCount) => 
    set({ notifications, unreadCount }),

  addNotification: (notification) =>
    set((state) => {
      // Tránh duplicate
      if (state.notifications.some(n => n.id === notification.id)) return state;
      
      return {
        notifications: [notification, ...state.notifications].slice(0, 50),
        unreadCount: state.unreadCount + 1,
      };
    }),

  markAsRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    })),

  markAllAsRead: () =>
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, is_read: true })),
      unreadCount: 0,
    })),

  clear: () => set({ notifications: [], unreadCount: 0 }),
}));
