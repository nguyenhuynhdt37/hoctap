import { api as axiosClient } from './api';
import { Course } from '../types/course';

export interface FavoritesResponse {
  items: Course[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export const favoriteService = {
  getFavorites: (params: {
    page?: number;
    size?: number;
    keyword?: string;
    category_id?: string;
    level?: string;
    language?: string;
    sort_by?: string;
    order?: string;
  }) => {
    return axiosClient.get<FavoritesResponse>('/favourites', { params });
  },

  toggleFavorite: (courseId: string) => {
    return axiosClient.post(`/favourites/${courseId}`);
  },

  checkIsFavorite: (courseId: string) => {
    return axiosClient.get<{ is_favorite: boolean }>(`/favourites/${courseId}`);
  },
};
