export interface Role {
  id: string;
  role_name: string;
  details: string;
  total_users: number;
}

export interface RolesResponse {
  page: number;
  size: number;
  total_items: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  items: Role[];
  operational_roles: number;
}

export interface RolesQueryParams {
  search?: string;
  sort_by?: string;
  order?: "asc" | "desc";
  page?: number;
  size?: number;
}
