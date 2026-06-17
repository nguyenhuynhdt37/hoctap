export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  order_index: number;
  course_count: number;
  is_onboarding_visible?: boolean;
  children?: Category[];
}

export interface FlatCategoriesResponse extends Array<Category> {}

export interface CategoriesPaginatedResponse {
  items: Category[];
  pagination: {
    page: number;
    page_size: number;
    total_items: number;
    total_pages: number;
  };
}

export interface CategoryCreateRequest {
  name: string;
  parent_id?: string | null;
}

export interface CategoryUpdateRequest {
  name?: string;
  parent_id?: string | null;
}

export interface CategoryReorderRequest {
  id: string;
  parent_id: string | null;
  order_index: number;
}
