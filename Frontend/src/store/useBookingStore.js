import { create } from 'zustand';
import api from '../lib/axios';
import { get as getIDB, set as setIDB } from 'idb-keyval';

export const useBookingStore = create((set) => ({
  bookings: [],
  loading: false,
  error: null,

  fetchUserBookings: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/users/bookings');
      if (response.success) {
        set({ bookings: response.data.bookings, loading: false });
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to fetch bookings', loading: false });
    }
  },

  createBooking: async (bookingData) => {
    set({ loading: true, error: null });

    // Handle Offline Scenario
    if (!navigator.onLine) {
      console.log('User is offline, queueing booking...');
      const offlineBooking = {
        ...bookingData,
        _id: 'temp_' + Date.now(),
        status: 'queued_offline',
        createdAt: new Date().toISOString()
      };

      try {
        const queue = await getIDB('offlineBookings') || [];
        queue.push(offlineBooking);
        await setIDB('offlineBookings', queue);

        set((state) => ({
          bookings: [offlineBooking, ...state.bookings],
          loading: false,
        }));
        
        // Let the caller know it was queued
        return { ...offlineBooking, isOffline: true };
      } catch (err) {
        set({ error: 'Failed to queue offline booking', loading: false });
        throw err;
      }
    }

    try {
      const response = await api.post('/bookings', bookingData);
      if (response.success) {
        set((state) => ({
          bookings: [response.data.booking, ...state.bookings],
          loading: false,
        }));
        return response.data.booking;
      }
    } catch (err) {
      set({ error: err.response?.data?.message || 'Failed to create booking', loading: false });
      throw err;
    }
  },

  updateBookingStatusLocal: (bookingId, status) => {
    set((state) => ({
      bookings: state.bookings.map((b) => 
        b._id === bookingId ? { ...b, status } : b
      )
    }));
  },

  updateBookingOtpLocal: (bookingId, otpData) => {
    set((state) => ({
      bookings: state.bookings.map((b) => 
        b._id === bookingId ? { ...b, ...otpData } : b
      )
    }));
  },

  syncOfflineBookings: async () => {
    try {
      const queue = await getIDB('offlineBookings') || [];
      if (queue.length === 0) return;

      console.log(`Syncing ${queue.length} offline bookings...`);
      const remainingQueue = [];

      for (const booking of queue) {
        try {
          // Remove the temporary fields before sending to server
          const { _id, status: _status, isOffline: _isOffline, createdAt: _createdAt, ...payload } = booking;
          const response = await api.post('/bookings', payload);
          
          if (response.success) {
            // Remove from local state and add the real one
            set((state) => ({
              bookings: [
                response.data.booking,
                ...state.bookings.filter(b => b._id !== booking._id)
              ]
            }));
          } else {
            remainingQueue.push(booking); // Keep if failed for non-network reason
          }
        } catch (err) {
           console.error('Failed to sync booking', err);
           remainingQueue.push(booking); // keep in queue if network failed
        }
      }

      await setIDB('offlineBookings', remainingQueue);
    } catch (err) {
      console.error('Offline sync failed', err);
    }
  }
}));
