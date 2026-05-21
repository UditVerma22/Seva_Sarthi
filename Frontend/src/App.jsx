import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleProtectedRoute from "./components/RoleProtectedRoute";
import LandingPage from "./pages/LandingPage";
import ServiceDiscovery from "./pages/ServiceDiscovery";
import ToolRentalPage from "./pages/ToolRentalPage";
import ProviderProfile from "./pages/ProviderProfile";
import BookingFlow from "./pages/BookingFlow";
import Authentication from "./pages/Authentication";
import ProviderAuthentication from "./pages/ProviderAuthentication";
import UserDashboard from "./pages/UserDashboard";
import ProviderDashboard from "./pages/ProviderDashboard";
import ProviderOnboardingStatus from "./pages/ProviderOnboardingStatus";
import ProviderWallet from "./pages/ProviderWallet";
import AdminDashboard from "./pages/AdminDashboard";
import RaiseComplaint from "./pages/RaiseComplaint";
import MyComplaints from "./pages/MyComplaints";
import NotFound from "./pages/NotFound";
import SevaAI from "./components/SevaAI";

import { Toaster } from 'react-hot-toast';
import SessionManager from "./components/SessionManager"; // New component for session timeouts
import socketService from "./lib/socket";
import { useAuthStore } from "./store/useAuthStore";
import { useNotificationStore } from "./store/useNotificationStore";
import InstallPWA from "./components/InstallPWA";

function App() {
  const { token } = useAuthStore();

  useEffect(() => {
    if (token) {
      socketService.connect(token);
      // Start listening for real-time notifications once socket is connected
      // Small delay to ensure socket is ready
      const timer = setTimeout(() => {
        useNotificationStore.getState().startListening();
        useNotificationStore.getState().fetchNotifications();
        useNotificationStore.getState().subscribeToWebPush();
      }, 500);
      return () => {
        clearTimeout(timer);
        useNotificationStore.getState().stopListening();
        socketService.disconnect();
      };
    } else {
      useNotificationStore.getState().stopListening();
      socketService.disconnect();
    }
  }, [token]);

  // Sync offline bookings when network returns
  useEffect(() => {
    const handleOnline = () => {
      import('./store/useBookingStore').then(({ useBookingStore }) => {
        useBookingStore.getState().syncOfflineBookings();
      });
    };
    window.addEventListener('online', handleOnline);
    // Initial check on load
    if (navigator.onLine) handleOnline();

    return () => window.removeEventListener('online', handleOnline);
  }, []);

  return (
      <Router>
        <SessionManager />
        <Toaster
          position="top-center"
          reverseOrder={false}
          toastOptions={{
            duration: 4000,
            style: {
              background: '#FFFFFF',
              color: '#0F172A',
              borderRadius: '16px',
              padding: '16px 24px',
              fontWeight: '600',
              fontSize: '15px',
              border: '1px solid rgba(226, 232, 240, 0.6)',
              boxShadow: '0 10px 40px -10px rgba(15, 23, 42, 0.1)',
            },
            success: {
              iconTheme: {
                primary: '#10B981', // Emerald
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#EF4444', // Red
                secondary: '#fff',
              },
            }
          }}
        />
        <Layout>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Authentication />} />
            <Route path="/provider/auth" element={<ProviderAuthentication />} />
            <Route path="/services" element={<ServiceDiscovery />} />
            <Route path="/rentals" element={<ToolRentalPage />} />

            <Route path="/provider/:id" element={<ProtectedRoute><ProviderProfile /></ProtectedRoute>} />
            <Route path="/booking" element={<ProtectedRoute><BookingFlow /></ProtectedRoute>} />

            <Route
              path="/user/dashboard"
              element={
                <RoleProtectedRoute allowedRoles={["user"]}>
                  <UserDashboard />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/my-bookings"
              element={
                <RoleProtectedRoute allowedRoles={["user"]}>
                  <UserDashboard />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/complaints/new"
              element={
                <RoleProtectedRoute allowedRoles={["user"]}>
                  <RaiseComplaint />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/complaints"
              element={
                <RoleProtectedRoute allowedRoles={["user"]}>
                  <MyComplaints />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/provider/onboarding-status"
              element={
                <RoleProtectedRoute allowedRoles={["provider"]}>
                  <ProviderOnboardingStatus />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/provider/dashboard"
              element={
                <RoleProtectedRoute allowedRoles={["provider"]}>
                  <ProviderDashboard />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/provider/wallet"
              element={
                <RoleProtectedRoute allowedRoles={["provider"]}>
                  <ProviderWallet />
                </RoleProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <RoleProtectedRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </RoleProtectedRoute>
              }
            />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Layout>
        <InstallPWA />
        <SevaAI />
      </Router>
  );
}

export default App;

