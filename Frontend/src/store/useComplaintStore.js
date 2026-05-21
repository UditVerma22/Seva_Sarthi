import { create } from 'zustand';
import api from '../lib/axios';

export const useComplaintStore = create((set) => ({
  complaints: [],
  currentComplaint: null,
  references: { bookings: [], rentals: [] },
  adminComplaints: [],
  adminStats: {},
  pagination: { total: 0, page: 1, pages: 1 },
  adminPagination: { total: 0, page: 1, pages: 1 },
  loading: false,
  submitting: false,

  // ── Customer Actions ──────────────────────────

  fetchReferences: async () => {
    set({ loading: true });
    try {
      const res = await api.get('/complaints/references');
      if (res.success) {
        set({ references: res.data, loading: false });
      }
    } catch (err) {
      console.error('Failed to fetch references', err);
      set({ loading: false });
    }
  },

  fetchMyComplaints: async (filters = {}) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.page) params.append('page', filters.page);
      params.append('limit', filters.limit || 10);

      const res = await api.get(`/complaints/my?${params}`);
      if (res.success) {
        set({
          complaints: res.data.complaints,
          pagination: res.data.pagination,
          loading: false,
        });
      }
    } catch (err) {
      console.error('Failed to fetch complaints', err);
      set({ loading: false });
    }
  },

  fetchComplaintById: async (id) => {
    set({ loading: true });
    try {
      const res = await api.get(`/complaints/${id}`);
      if (res.success) {
        set({ currentComplaint: res.data.complaint, loading: false });
        return res.data.complaint;
      }
    } catch (err) {
      console.error('Failed to fetch complaint', err);
      set({ loading: false });
      return null;
    }
  },

  createComplaint: async (data) => {
    set({ submitting: true });
    try {
      const res = await api.post('/complaints', data);
      if (res.success) {
        set((state) => ({
          complaints: [res.data.complaint, ...state.complaints],
          submitting: false,
        }));
        return res.data.complaint;
      }
    } catch (err) {
      set({ submitting: false });
      throw err;
    }
  },

  reopenComplaint: async (id, reason) => {
    set({ submitting: true });
    try {
      const res = await api.put(`/complaints/${id}/reopen`, { reason });
      if (res.success) {
        set((state) => ({
          complaints: state.complaints.map((c) =>
            c._id === id ? res.data.complaint : c
          ),
          currentComplaint: res.data.complaint,
          submitting: false,
        }));
        return res.data.complaint;
      }
    } catch (err) {
      set({ submitting: false });
      throw err;
    }
  },

  // ── Admin Actions ──────────────────────────

  fetchAdminComplaints: async (filters = {}) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.type) params.append('type', filters.type);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page);
      params.append('limit', filters.limit || 10);

      const res = await api.get(`/admin/complaints?${params}`);
      if (res.success) {
        set({
          adminComplaints: res.data.complaints,
          adminStats: res.data.stats,
          adminPagination: res.data.pagination,
          loading: false,
        });
      }
    } catch (err) {
      console.error('Failed to fetch admin complaints', err);
      set({ loading: false });
    }
  },

  fetchAdminComplaintById: async (id) => {
    set({ loading: true });
    try {
      const res = await api.get(`/admin/complaints/${id}`);
      if (res.success) {
        set({ currentComplaint: res.data.complaint, loading: false });
        return res.data.complaint;
      }
    } catch (err) {
      console.error('Failed to fetch complaint', err);
      set({ loading: false });
      return null;
    }
  },

  updateComplaintStatus: async (id, status, adminResponse) => {
    set({ submitting: true });
    try {
      const res = await api.put(`/admin/complaints/${id}/status`, { status, adminResponse });
      if (res.success) {
        set((state) => ({
          adminComplaints: state.adminComplaints.map((c) =>
            c._id === id ? res.data.complaint : c
          ),
          currentComplaint: res.data.complaint,
          submitting: false,
        }));
        return res.data.complaint;
      }
    } catch (err) {
      set({ submitting: false });
      throw err;
    }
  },

  takeAdminAction: async (id, action, details) => {
    set({ submitting: true });
    try {
      const res = await api.put(`/admin/complaints/${id}/action`, { action, details });
      if (res.success) {
        set((state) => ({
          adminComplaints: state.adminComplaints.map((c) =>
            c._id === id ? res.data.complaint : c
          ),
          currentComplaint: res.data.complaint,
          submitting: false,
        }));
        return res.data;
      }
    } catch (err) {
      set({ submitting: false });
      throw err;
    }
  },

  clearCurrent: () => set({ currentComplaint: null }),
}));
