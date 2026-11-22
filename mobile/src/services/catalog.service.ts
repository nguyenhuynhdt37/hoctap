import { api } from './api';
import type { CatalogOptions, CatalogResult, CourseEducation } from '../types/catalog';
export interface CatalogQuery {
  level?: string; grade?: number; subject?: string; goal?: string; exam?: string;
  delivery_type?: 'recorded_video'; currency?: 'VND' | 'USD'; min_price?: number; max_price?: number; rating?: number;
  keyword?: string; sort?: 'newest' | 'popular' | 'rating' | 'price_asc' | 'price_desc'; cursor?: string; limit?: number;
}
export const catalogService = {
  filters: () => api.get<CatalogOptions>('/catalog/filters'),
  courses: (params?: CatalogQuery) => api.get<CatalogResult>('/catalog/courses', { params }),
  taxonomy: (id: string) => api.get<CourseEducation>(`/catalog/courses/${encodeURIComponent(id)}/taxonomy`),
};
