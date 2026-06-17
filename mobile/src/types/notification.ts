export interface Notification {
  id: string;
  user_id: string;
  title: string;
  content: string;
  url: string | null;
  metadata_: Record<string, any>;
  metadata?: Record<string, any>;
  is_read: boolean;
  created_at: string;
  action: string;
  type: string;
  read_at: string | null;
  updated_at: string;
  role_target: string[];
}

export interface NotificationsResponse {
  total: number;
  page: number;
  limit: number;
  unread: number;
  items: Notification[];
}
