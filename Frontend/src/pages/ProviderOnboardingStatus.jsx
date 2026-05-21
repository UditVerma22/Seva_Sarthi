/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/useAuthStore';
import api from '../lib/axios';

export default function ProviderOnboardingStatus() {
  const { currentUser, providerStatus, logout } = useAuthStore();
  const navigate = useNavigate();
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await api.get('/providers/onboarding-status');
        if (res.success) {
          setStatusData(res.data);
          // If approved, update global auth store and redirect to dashboard
          if (res.data.verificationStatus === 'approved') {
            useAuthStore.getState().setProviderStatus('approved');
            navigate('/provider/dashboard', { replace: true });
          }
        }
      } catch (err) {
        console.error('Failed to fetch status', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
    // Poll every 30 seconds for status updates
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  const status = statusData?.verificationStatus || providerStatus || 'pending';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-muted">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-5xl text-accent animate-spin">progress_activity</span>
          <p className="text-slate-500 font-bold">Loading status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-[400px] bg-brand" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg relative z-10"
      >
        <div className="bg-surface rounded-3xl p-8 sm:p-12 shadow-premium border border-slate-200/50">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-surface text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>handyman</span>
            </div>
            <span className="font-extrabold text-brand font-headline text-lg">Seva Sarthi Pro</span>
          </div>

          {status === 'pending' && (
            <div className="text-center">
              {/* Animated hourglass */}
              <div className="w-24 h-24 mx-auto mb-8 bg-amber-50 rounded-full flex items-center justify-center border-2 border-amber-200">
                <motion.span
                  animate={{ rotateZ: [0, 180, 360] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  className="material-symbols-outlined text-amber-500 text-5xl"
                >hourglass_top</motion.span>
              </div>
              <h2 className="text-2xl font-extrabold font-headline text-brand mb-3">Application Under Review</h2>
              <p className="text-slate-500 font-medium mb-8 leading-relaxed">
                Your application has been submitted successfully. Our team is reviewing your details and documents. This usually takes <strong>24-48 hours</strong>.
              </p>

              {/* Application details */}
              <div className="bg-slate-50 rounded-2xl p-6 text-left space-y-4 border border-slate-100 mb-8">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Application Details</h4>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">Business Type</span>
                  <span className="text-sm font-bold text-brand capitalize">{statusData?.businessType || 'Individual'}</span>
                </div>
                {statusData?.businessName && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-500">Business Name</span>
                    <span className="text-sm font-bold text-brand">{statusData.businessName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">Category</span>
                  <span className="text-sm font-bold text-brand">{statusData?.primaryCategory || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-500">Applied On</span>
                  <span className="text-sm font-bold text-brand">{statusData?.appliedAt ? new Date(statusData.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</span>
                </div>
              </div>

              {/* Status timeline */}
              <div className="flex items-center justify-center gap-2 mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center"><span className="material-symbols-outlined text-white text-lg">check</span></div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Submitted</span>
                </div>
                <div className="w-12 h-0.5 bg-amber-300" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center animate-pulse"><span className="material-symbols-outlined text-white text-lg">pending</span></div>
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">In Review</span>
                </div>
                <div className="w-12 h-0.5 bg-slate-200" />
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center"><span className="material-symbols-outlined text-slate-400 text-lg">verified</span></div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Approved</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700 font-medium flex items-start gap-3">
                <span className="material-symbols-outlined text-blue-500 text-xl shrink-0 mt-0.5">info</span>
                <span>You'll receive a notification once your application is reviewed. This page auto-refreshes every 30 seconds.</span>
              </div>
            </div>
          )}

          {status === 'rejected' && (
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-8 bg-red-50 rounded-full flex items-center justify-center border-2 border-red-200">
                <span className="material-symbols-outlined text-red-500 text-5xl">cancel</span>
              </div>
              <h2 className="text-2xl font-extrabold font-headline text-brand mb-3">Application Not Approved</h2>
              <p className="text-slate-500 font-medium mb-6">Unfortunately, your application was not approved at this time.</p>

              {statusData?.rejectionReason && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-5 text-left mb-8">
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-2">Reason</p>
                  <p className="text-sm font-semibold text-red-700">{statusData.rejectionReason}</p>
                </div>
              )}

              <p className="text-sm text-slate-500 font-medium mb-6">
                You can update your details and re-apply, or contact our support team for assistance.
              </p>

              <div className="flex gap-3">
                <button onClick={() => navigate('/provider/auth')} className="flex-1 btn-accent !py-4">
                  <span className="material-symbols-outlined text-lg">refresh</span>
                  Re-apply
                </button>
                <button onClick={logout} className="flex-1 btn-secondary !py-4">
                  <span className="material-symbols-outlined text-lg">logout</span>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-white/50 font-medium mt-6">
          Need help? Contact us at <span className="underline">support@sevasarthi.in</span>
        </p>
      </motion.div>
    </div>
  );
}
