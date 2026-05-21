import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../lib/axios';

export const useAuthStore = create(
  persist(
    (set) => ({
      currentUser: null,
      token: null,
      refreshToken: null,
      providerStatus: null, // 'pending' | 'approved' | 'rejected' | null
      authLoading: false,
      error: null,

      setProviderStatus: (status) => set({ providerStatus: status }),

      login: async (identifier, password) => {
        set({ authLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', { identifier, password });
          if (response.success && response.data) {
            set({
              currentUser: response.data.user,
              token: response.data.accessToken,
              refreshToken: response.data.refreshToken || null,
              providerStatus: response.data.providerStatus || null,
              authLoading: false,
            });
            return { ...response.data.user, providerStatus: response.data.providerStatus };
          }
        } catch (err) {
          set({
            error: err.response?.data?.message || 'Login failed',
            authLoading: false,
          });
          return null;
        }
      },

      googleLogin: async (credential, role) => {
        set({ authLoading: true, error: null });
        try {
          const response = await api.post('/auth/google', { credential, role });
          if (response.success && response.data) {
            set({
              currentUser: response.data.user,
              token: response.data.accessToken,
              refreshToken: response.data.refreshToken || null,
              authLoading: false,
            });
            return response.data.user;
          }
        } catch (err) {
          set({
            error: err.response?.data?.message || 'Google authentication failed',
            authLoading: false,
          });
          return null;
        }
      },

      register: async (userData) => {
        set({ authLoading: true, error: null });
        try {
          const response = await api.post('/auth/register', userData);
          if (response.success && response.data) {
            set({
              currentUser: response.data.user,
              token: response.data.accessToken,
              refreshToken: response.data.refreshToken || null,
              providerStatus: response.data.providerStatus || null,
              authLoading: false,
            });
            return { ...response.data.user, providerStatus: response.data.providerStatus };
          }
        } catch (err) {
          set({
            error: err.response?.data?.message || 'Registration failed',
            authLoading: false,
          });
          return null;
        }
      },

      // Provider OTP
      sendProviderOtp: async (email) => {
        set({ authLoading: true, error: null });
        try {
          const response = await api.post('/auth/provider/send-otp', { email });
          set({ authLoading: false });
          return response;
        } catch (err) {
          set({ error: err.response?.data?.message || 'Failed to send OTP', authLoading: false });
          return null;
        }
      },

      verifyProviderOtp: async (email, otp) => {
        set({ authLoading: true, error: null });
        try {
          const response = await api.post('/auth/provider/verify-otp', { email, otp });
          set({ authLoading: false });
          return response.data;
        } catch (err) {
          set({ error: err.response?.data?.message || 'Invalid OTP', authLoading: false });
          return null;
        }
      },

      // User signup OTP
      sendUserOtp: async (type, emailOrPhone) => {
        set({ authLoading: true, error: null });
        try {
          const payload = { type };
          if (type === 'email') payload.email = emailOrPhone;
          else payload.phone = emailOrPhone;
          const response = await api.post('/auth/user/send-otp', payload);
          set({ authLoading: false });
          return response;
        } catch (err) {
          set({ error: err.response?.data?.message || 'Failed to send OTP', authLoading: false });
          return null;
        }
      },

      verifyUserOtp: async (type, emailOrPhone, otp) => {
        set({ authLoading: true, error: null });
        try {
          const payload = { type, otp };
          if (type === 'email') payload.email = emailOrPhone;
          else payload.phone = emailOrPhone;
          const response = await api.post('/auth/user/verify-otp', payload);
          set({ authLoading: false });
          return response.data;
        } catch (err) {
          set({ error: err.response?.data?.message || 'Invalid OTP', authLoading: false });
          return null;
        }
      },

      logout: async () => {
        try {
          await api.post('/auth/logout');
        } catch {
          // Ignore logout errors
        } finally {
          set({ currentUser: null, token: null, refreshToken: null, providerStatus: null, error: null });
        }
      },

      checkAuth: async () => {
        set({ authLoading: true, error: null });
        try {
          const response = await api.get('/auth/me');
          if (response.success && response.data) {
            set({
              currentUser: response.data.user,
              providerStatus: response.data.providerStatus || null,
              authLoading: false,
            });
          }
        } catch {
          set({ currentUser: null, token: null, refreshToken: null, providerStatus: null, authLoading: false });
        }
      },

      updateProfile: async (updates) => {
        const response = await api.put('/users/profile', updates);
        if (response.success && response.data) {
          set({ currentUser: response.data.user });
          return response.data.user;
        }
      },

      forgotPassword: async (email) => {
        set({ authLoading: true, error: null });
        try {
          const response = await api.post('/auth/forgot-password', { email });
          set({ authLoading: false });
          return response;
        } catch (err) {
          set({
            error: err.response?.data?.message || 'Failed to send OTP',
            authLoading: false,
          });
          return null;
        }
      },

      verifyOtp: async (email, otp) => {
        set({ authLoading: true, error: null });
        try {
          const response = await api.post('/auth/verify-otp', { email, otp });
          set({ authLoading: false });
          return response.data;
        } catch (err) {
          set({
            error: err.response?.data?.message || 'Invalid OTP',
            authLoading: false,
          });
          return null;
        }
      },

      resetPassword: async (email, resetToken, newPassword) => {
        set({ authLoading: true, error: null });
        try {
          const response = await api.post('/auth/reset-password', { email, resetToken, newPassword });
          set({ authLoading: false });
          return response;
        } catch (err) {
          set({
            error: err.response?.data?.message || 'Failed to reset password',
            authLoading: false,
          });
          return null;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ currentUser: state.currentUser, token: state.token, refreshToken: state.refreshToken, providerStatus: state.providerStatus }),
    }
  )
);
