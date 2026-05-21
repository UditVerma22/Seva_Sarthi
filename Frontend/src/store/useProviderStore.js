import { create } from 'zustand';
import api from '../lib/axios';
import { useLocationStore } from './useLocationStore';

export const useProviderStore = create((set) => ({
  providers: [],
  services: [],
  loading: false,
  error: null,

  fetchProviders: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const { city } = useLocationStore.getState();
      const params = new URLSearchParams();
      if (filters.category && filters.category !== 'All Services') {
        params.append('category', filters.category);
      }
      if (filters.search) params.append('search', filters.search);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (city) params.append('city', city);

      const response = await api.get(`/providers?${params.toString()}`);
      if (response.success) {
        set({ providers: response.data.providers, loading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch providers', loading: false });
    }
  },

  fetchServices: async () => {
    set({ loading: true, error: null });
    try {
      const { city } = useLocationStore.getState();
      const url = city ? `/services?city=${encodeURIComponent(city)}` : '/services';
      const response = await api.get(url);
      if (response.success) {
        set({ services: response.data.services, loading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch services', loading: false });
    }
  },

  getProviderById: async (id) => {
    try {
      const response = await api.get(`/providers/${id}`);
      return response.success ? response.data.provider : null;
    } catch (err) {
      console.error('Failed to get provider', err);
      return null;
    }
  },

  aiSearchIntent: async (query) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/ai/extract-intent', { query });
      set({ loading: false });
      if (response.success) {
        return response.data;
      }
      return null;
    } catch (err) {
      console.error('AI Search error', err);
      set({ error: err.response?.data?.message || 'Failed to extract intent', loading: false });
      return null;
    }
  }
}));
