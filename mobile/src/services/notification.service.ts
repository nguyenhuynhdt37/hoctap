import { api } from './api';
import type { NotificationsResponse } from '../types/notification';

export const notificationService = {
  getNotifications: (params?: { page?: number; limit?: number; is_read?: boolean }) =>
    api.get<NotificationsResponse>('/notifications/user', { params }),

  markAsRead: (id: string) =>
    api.post(`/notifications/read/${id}`),

  markAllAsRead: () =>
    api.post('/notifications/read-all/user'),
};
