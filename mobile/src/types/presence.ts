export type PresenceStatus = 'online' | 'offline' | 'away';

export interface PresenceResponse {
  user_id: string;
  status: PresenceStatus;
  last_seen_at: string | null;
  connection_count: number;
}

export interface PresenceBulkResponse {
  users: Record<string, PresenceResponse>;
}
