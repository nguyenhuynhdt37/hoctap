import { api } from './api';
import type { PresenceBulkResponse, PresenceResponse } from '../types/presence';

export const presenceService = {
  getMe: () =>
    api.get<PresenceResponse>('/notifications/presence/me'),

  getBulk: (userIds: string[]) =>
    api.post<PresenceBulkResponse>('/notifications/presence/bulk', {
      user_ids: userIds,
    }),
};
