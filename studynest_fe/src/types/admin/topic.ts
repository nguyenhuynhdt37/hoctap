export interface Topic {
  id: string;
  name: string;
  slug: string;
  description: string;
  category_id: string;
  category_name: string;
  order_index: number;
  is_active: boolean;
  total_courses: number;
  created_at: string;
  updated_at: string;
}

export interface TopicsResponse {
  meta: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  data: Topic[];
}
