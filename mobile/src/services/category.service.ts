import { api as axiosClient } from './api';

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  parent_id?: string;
}

export const categoryService = {
  getCategories: () => {
    return axiosClient.get<Category[]>('/categories');
  },

  getAllCategories: () => {
    return axiosClient.get<Category[]>('/categories/all');
  },
};
