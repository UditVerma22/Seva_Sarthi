import { create } from 'zustand';
import api from '../lib/axios';
import { useLocationStore } from './useLocationStore';

export const useToolStore = create((set) => ({
  tools: [],
  loading: false,
  error: null,

  fetchTools: async (category = '') => {
    set({ loading: true, error: null });
    try {
      const { city } = useLocationStore.getState();
      const params = new URLSearchParams();
      if (category && category !== 'All') params.append('category', category);
      if (city) params.append('city', city);
      
      const url = `/tools${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get(url);
      if (response.success) {
        // Normalize tools for frontend consumption
        const normalized = response.data.tools.map(t => ({
          ...t,
          id: t._id,
          image: t.image || '',
          images: t.image ? [t.image] : [],
        }));
        set({ tools: normalized, loading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch tools', loading: false });
    }
  },

  createRental: async (rentalData) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/rentals', rentalData);
      if (response.success) {
        set({ loading: false });
        return response.data.rental;
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to create rental', loading: false });
      throw err;
    }
  },

  fetchUserRentals: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/users/rentals');
      if (response.success) {
        set({ loading: false });
        return response.data.rentals;
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch user rentals', loading: false });
      return [];
    }
  },

  fetchProviderRentals: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/rentals/provider');
      if (response.success) {
        set({ loading: false });
        return response.data.rentals;
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch provider rentals', loading: false });
      return [];
    }
  },

  updateRentalStatus: async (rentalId, status) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/rentals/${rentalId}/status`, { status });
      if (response.success) {
        set({ loading: false });
        return response.data.rental;
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to update rental status', loading: false });
      throw err;
    }
  }
}));
