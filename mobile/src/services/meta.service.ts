import { api } from './api';

export interface Skill {
  id: string;
  name_en: string;
  name_vi: string;
}

export interface Specialization {
  id: string;
  code: string;
  name_en: string;
  name_vi: string;
  skills: Skill[];
}

export interface Interest {
  id: string;
  name_en: string;
  name_vi: string;
}

export const metaService = {
  getSpecializations: async () => {
    const response = await api.get<Specialization[]>('/meta/specializations');
    return response.data;
  },

  getInterests: async () => {
    const response = await api.get<Interest[]>('/meta/interests');
    return response.data;
  },

  getCategoriesWithTopics: async () => {
    const response = await api.get<any[]>('/categories/subcategories');
    return response.data;
  }
};
