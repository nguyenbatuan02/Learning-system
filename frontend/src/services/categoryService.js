import api from '../lib/api';

export const categoryService = {
  // Get all categories
  getAll: async (parentId = null) => {
    const { data } = await api.get('/api/v1/categories/', {
      params: parentId ? { parent_id: parentId } : {},
    });
    return data;
  },

  // Get category by ID
  getById: async (categoryId) => {
    const { data } = await api.get(`/api/v1/categories/${categoryId}`);
    return data;
  },

  // Get child categories
  getChildren: async (categoryId) => {
    const { data } = await api.get(`/api/v1/categories/${categoryId}/children`);
    return data;
  },
};