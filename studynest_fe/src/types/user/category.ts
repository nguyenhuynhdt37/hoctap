export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  order_index: number;
  category_id: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  order_index: number;
  subcategories: Subcategory[];
}

export interface LearningField {
  id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  children: LearningField[]; // đệ quy
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  level: number;
}

export interface CategoryRootAndLevel1Response {
  items: CategoryItem[];
}

export interface CategoryListItem {
  id: string;
  name: string;
  slug: string;
}
