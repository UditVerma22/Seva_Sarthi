/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import api from '../lib/axios';
import socketService from '../lib/socket';
import { useLanguageStore } from '../store/useLanguageStore';

const RENTALS_STORAGE_KEY = 'sevaSarthi.rentals.v1';

// Mock bookings removed. Real data fetched via useBookingStore.
// mapStatusToUI and trackingSteps are now created inside the component
// so they can use the t() translation function.

import { useBookingStore } from '../store/useBookingStore';
import { useToolStore } from '../store/useToolStore';

export default function UserDashboard() {
  const { currentUser } = useAuthStore();
  const { bookings, fetchUserBookings, loading: bookingsLoading } = useBookingStore();
  const { fetchUserRentals } = useToolStore();
  const { t } = useLanguageStore();

  const mapStatusToUI = (status) => {
    const normalizedStatus = status?.toLowerCase() || '';
    switch(normalizedStatus) {
      case 'pending':   return { id: 'pending',   text: t('ud_status_pending') };
      case 'accepted':  return { id: 'accepted',  text: t('ud_status_accepted') };
      case 'en_route':  return { id: 'en_route',  text: t('ud_status_enroute') };
      case 'working':   return { id: 'working',   text: t('ud_status_working') };
      case 'completed': return { id: 'completed', text: t('ud_status_completed') };
      default:          return { id: 'pending',   text: t('ud_status_pending') };
    }
  };

  const trackingSteps = [
    { id: 'pending',   label: t('ud_track_requested'), icon: 'schedule' },
    { id: 'accepted',  label: t('ud_track_accepted'),  icon: 'check_circle' },
    { id: 'en_route',  label: t('ud_track_onway'),     icon: 'directions_car' },
    { id: 'working',   label: t('ud_track_working'),   icon: 'build' },
    { id: 'completed', label: t('ud_track_completed'), icon: 'verified' },
  ];
  const [rentals, setRentals] = useState([]);
  
  // Feedback Modal State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackJob, setFeedbackJob] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    if (currentUser) {
      fetchUserBookings();
      fetchUserRentals().then(data => setRentals(data || []));
    }
  }, [currentUser, fetchUserBookings, fetchUserRentals]);

  // Real-time Booking Updates — events arrive via user's private socket room
  useEffect(() => {
    const handleStatusUpdate = (data) => {
      // { bookingId, status, timestamp, note }
      useBookingStore.getState().updateBookingStatusLocal(data.bookingId, data.status);
      toast(`Booking status updated to ${data.status.replace('_', ' ').toUpperCase()}`, { icon: '🔄' });
      // Also re-fetch from server to get full populated data
      fetchUserBookings();
    };

    // OTP codes arrive through the user's private socket room
    const handleOtpUpdate = (data) => {
      // { bookingId, otp?, completionOtp? }
      useBookingStore.getState().updateBookingOtpLocal(data.bookingId, data);
      if (data.otp) {
        toast('Start Code received! Share it with your provider.', { icon: '🔑', duration: 6000 });
      }
      if (data.completionOtp) {
        toast('Completion Code received! Share it when work is done.', { icon: '🔑', duration: 6000 });
      }
    };

    // New booking created (by this user) — refresh list
    const handleNewNotification = (notif) => {
      if (notif.type === 'booking') {
        fetchUserBookings();
      }
    };

    const handleRentalUpdated = (data) => {
      fetchUserRentals().then(res => setRentals(res || []));
      toast(`Tool Rental status updated to ${data.status.toUpperCase()}`, { icon: '🔧' });
    };

    socketService.on('booking:status_update', handleStatusUpdate);
    socketService.on('booking:otp_update', handleOtpUpdate);
    socketService.on('notification:new', handleNewNotification);
    socketService.on('rental_updated', handleRentalUpdated);

    return () => {
      socketService.off('booking:status_update', handleStatusUpdate);
      socketService.off('booking:otp_update', handleOtpUpdate);
      socketService.off('notification:new', handleNewNotification);
      socketService.off('rental_updated', handleRentalUpdated);
    };
  }, [fetchUserBookings, fetchUserRentals]);

  const handleReassign = (id) => {
    toast.loading('Finding a new professional...', { id: 'REASSIGN' });
    setTimeout(() => {
      toast.success('Successfully reassigned to Vikash Sharma.', { id: 'REASSIGN' });
      // Logic handled via backend in production
    }, 2000);
  };

  const handleProfilePic = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const res = await api.put('/users/profile', { avatar: reader.result });
        if (res.success) { useAuthStore.getState().checkAuth(); toast.success('Profile photo updated!'); }
      } catch { toast.error('Failed to update photo'); }
    };
    reader.readAsDataURL(file);
  };
  const handleRemovePhoto = async () => {
    try {
      await api.put('/users/profile', { avatar: '' });
      useAuthStore.getState().checkAuth();
      toast.success('Photo removed');
    } catch { toast.error('Failed'); }
  };

  const openFeedback = (booking) => {
    setFeedbackJob(booking);
    setRating(0);
    setComment('');
    setShowFeedbackModal(true);
  };

  const submitFeedback = async (e) => {
    e.preventDefault();
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    
    try {
      const payload = {
        providerId: feedbackJob.providerId?._id || feedbackJob.providerId,
        bookingId: feedbackJob._id,
        rating,
        comment
      };
      const res = await api.post('/reviews', payload);
      if (res.success) {
        toast.success('Feedback submitted! Thank you.');
        setShowFeedbackModal(false);
        fetchUserBookings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback');
    }
  };

  const getStepIndex = (status) => trackingSteps.findIndex(s => s.id === status);

  return (
    <div className="min-h-screen bg-surface-muted pb-24 relative">
      
      {/* Header */}
      <header className="pt-10 pb-8 relative z-10">
        <div className="section-container flex flex-col md:flex-row justify-between md:items-end gap-6">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-sm bg-white">
                <img className="w-full h-full object-cover" src={currentUser?.avatar || 'https://ui-avatars.com/api/?name='+(currentUser?.name||'U')+'&background=F5A623&color=0F172A&size=200'} alt="Profile" />
              </div>
              <label className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleProfilePic} />
              </label>
              {currentUser?.avatar && <button onClick={handleRemovePhoto} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600" title="Remove">✕</button>}
            </div>
            <div>
              <h2 className="text-3xl font-extrabold font-headline text-brand tracking-tight">{currentUser?.name || 'User'}</h2>
              <p className="text-slate-500 text-sm font-medium mt-1">{t('ud_manage_services')}</p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link to="/complaints/new" className="btn-secondary text-sm !py-2.5">
              <span className="material-symbols-outlined text-[18px]">report_problem</span>{t('ud_raise_complaint')}
            </Link>
            <Link to="/complaints" className="btn-secondary text-sm !py-2.5">
              <span className="material-symbols-outlined text-[18px]">list_alt</span>{t('ud_my_complaints')}
            </Link>
            <Link to="/services" className="btn-accent text-sm"><span className="material-symbols-outlined text-[20px]">add</span>{t('book_service')}</Link>
          </div>
        </div>
      </header>

      <main className="section-container mt-6 grid grid-cols-1 xl:grid-cols-12 gap-8 relative z-10">
        {/* Main Column */}
        <div className="xl:col-span-8 space-y-8">
          
          {/* Active Bookings with Tracking */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-2xl font-extrabold font-headline text-slate-800">{t('ud_my_bookings')}</h3>
              <button className="text-brand font-bold text-sm hover:underline">{t('ud_view_all')}</button>
            </div>
            
            <div className="space-y-6">
              {bookingsLoading ? (
                <div className="p-8 text-center text-slate-500 font-medium">{t('loading')}</div>
              ) : bookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled').length === 0 ? (
                <div className="p-8 text-center text-slate-500 font-medium">{t('ud_no_bookings')}</div>
              ) : bookings.filter(b => b.status !== 'completed' && b.status !== 'cancelled').map((b, idx) => {
                const uiStatus = mapStatusToUI(b.status);
                const title = b.serviceName || 'Service Booking';
                const providerName = b.providerId?.userId?.name || b.providerId?.title || 'Assigned Provider';
                const providerPhone = b.providerId?.userId?.phone || b.providerId?.phone || '';
                const image = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&q=80&w=200';
                
                return (
                <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} key={b._id} 
                  className="bg-surface rounded-3xl shadow-card border border-slate-200/60 p-6 relative overflow-hidden">
                  
                  <div className="flex flex-col sm:flex-row gap-5 items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 shadow-sm">
                        <img src={image} alt={title} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-widest bg-accent/10 text-accent-dark border-accent/20">
                          {uiStatus.text}
                        </span>
                        <h4 className="text-xl font-bold font-headline text-brand mt-2">{title}</h4>
                        <p className="text-sm text-slate-500 font-medium">{t('book_provider')}: <span className="text-brand font-bold">{providerName}</span></p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:items-end">
                      <span className="text-2xl font-extrabold text-brand tracking-tight">₹{b.totalAmount}</span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('book_total')}</span>
                    </div>
                  </div>

                  {/* Tracking UI */}
                  <div className="bg-surface-muted rounded-2xl p-5 border border-slate-100 mb-6">
                    <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">{t('ud_job_progress')}</h5>
                    <div className="relative">
                      {/* Progress Line */}
                      <div className="absolute top-4 left-4 right-4 h-1 bg-slate-200 rounded-full">
                        <div 
                          className="absolute top-0 left-0 h-full bg-accent rounded-full transition-all duration-1000" 
                          style={{ width: `${(getStepIndex(uiStatus.id) / (trackingSteps.length - 1)) * 100}%` }}
                        ></div>
                      </div>
                      
                      {/* Steps */}
                      <div className="relative flex justify-between">
                        {trackingSteps.map((step, index) => {
                          const isActive = getStepIndex(uiStatus.id) >= index;
                          const isCurrent = getStepIndex(uiStatus.id) === index;
                          return (
                            <div key={step.id} className="flex flex-col items-center gap-2 z-10 w-16">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2 
                                ${isActive ? 'bg-accent border-accent text-surface shadow-sm' : 'bg-surface border-slate-200 text-slate-300'}`}>
                                <span className="material-symbols-outlined text-[16px]">{step.icon}</span>
                              </div>
                              <span className={`text-[10px] font-bold text-center tracking-wide leading-tight ${isCurrent ? 'text-brand' : 'text-slate-400'}`}>
                                {step.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* OTP / Start Code */}
                  {b.otp && (b.status === 'accepted' || b.status === 'en_route') && (
                    <div className="bg-brand text-surface p-4 rounded-xl mb-6 flex items-center justify-between shadow-sm">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-300">{t('ud_start_code')}</p>
                        <p className="text-xs mt-1 text-slate-200">{t('ud_share_start_code')}</p>
                      </div>
                      <div className="text-3xl font-extrabold tracking-widest bg-white/10 px-4 py-2 rounded-lg">
                        {b.otp}
                      </div>
                    </div>
                  )}

                  {/* Completion Code */}
                  {b.completionOtp && b.status === 'working' && (
                    <div className="bg-emerald-600 text-surface p-4 rounded-xl mb-6 flex items-center justify-between shadow-sm">
                      <div>
                        <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-200">{t('ud_completion_code')}</p>
                        <p className="text-xs mt-1 text-emerald-100">{t('ud_share_completion_code')}</p>
                      </div>
                      <div className="text-3xl font-extrabold tracking-widest bg-white/10 px-4 py-2 rounded-lg">
                        {b.completionOtp}
                      </div>
                    </div>
                  )}

                  {/* Actions & Reassign Warning */}
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    {b.isProviderInactive ? (
                      <div className="flex items-center gap-3 bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100 w-full md:w-auto">
                        <span className="material-symbols-outlined text-xl">warning</span>
                        <div className="flex-1">
                          <p className="text-xs font-bold">{t('ud_provider_unresponsive')}</p>
                        </div>
                        <button onClick={() => handleReassign(b._id)} className="text-xs font-bold bg-white text-red-600 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50">
                          {t('ud_reassign_vendor')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100">
                        <span className="material-symbols-outlined text-base">verified</span>{t('ud_on_track')}
                      </div>
                    )}
                    
                    <div className="flex gap-3 w-full md:w-auto">
                      <a 
                        href={providerPhone ? `tel:${providerPhone}` : '#'} 
                        onClick={(e) => { if(!providerPhone) { e.preventDefault(); toast.error('Phone number not available'); } }}
                        className="flex-1 md:flex-none btn-secondary !py-2.5 !text-sm flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[18px]">call</span>{t('ud_call')}
                      </a>
                      <a 
                        href={providerPhone ? `https://wa.me/91${providerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${providerName}, this is regarding my Seva Sarthi booking for ${title}.`)}` : '#'} 
                        target="_blank" rel="noopener noreferrer"
                        onClick={(e) => { if(!providerPhone) { e.preventDefault(); toast.error('WhatsApp not available'); } }}
                        className="flex-1 md:flex-none btn-primary !py-2.5 !text-sm !bg-[#25D366] hover:!bg-[#128C7E] flex items-center justify-center gap-1.5 text-white"
                      >
                        <i className="fi fi-brands-whatsapp text-[16px]"></i> WhatsApp
                      </a>
                    </div>
                  </div>
                </motion.div>
              )})}
            </div>
          </section>

          {/* Past Services & Feedback */}
          <section className="bg-surface rounded-3xl shadow-card border border-slate-200/60 p-8">
            <h3 className="text-2xl font-extrabold font-headline text-slate-800 mb-6">{t('ud_completed')}</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                  <tr>
                    <th className="px-5 py-4 rounded-l-2xl">{t('ud_service_details')}</th>
                    <th className="px-5 py-4">{t('ud_date')}</th>
                    <th className="px-5 py-4">{t('ud_amount')}</th>
                    <th className="px-5 py-4 rounded-r-2xl text-right">{t('ud_action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.filter(b => b.status === 'completed').length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-5 py-8 text-center text-slate-500 font-medium">{t('ud_no_past_services')}</td>
                    </tr>
                  ) : (
                    bookings.filter(b => b.status === 'completed').map(b => (
                      <tr key={b._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-5">
                          <p className="font-bold text-brand">{b.serviceName || 'Service Booking'}</p>
                          <p className="text-xs font-semibold text-slate-500 mt-1">{t('book_provider')}: {b.providerId?.userId?.name || b.providerId?.title || 'Assigned Provider'}</p>
                        </td>
                        <td className="px-5 py-5 text-sm font-semibold text-slate-500">{new Date(b.scheduledDate).toLocaleDateString()}</td>
                        <td className="px-5 py-5 font-bold text-brand">₹{b.totalAmount}</td>
                        <td className="px-5 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {b.isReviewed ? (
                              <span className="text-slate-400 font-bold text-sm flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">check_circle</span> {t('ud_rated')}</span>
                            ) : (
                              <button onClick={() => openFeedback(b)} className="text-accent-dark font-bold text-sm hover:underline">{t('ud_rate_job')}</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Past Tool Rentals */}
          {rentals.filter(r => r.status === 'returned' || r.status === 'cancelled').length > 0 && (
            <section className="bg-surface rounded-3xl shadow-card border border-slate-200/60 p-8">
              <h3 className="text-2xl font-extrabold font-headline text-slate-800 mb-6">{t('ud_past_tool_rentals')}</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[11px] uppercase tracking-widest font-bold">
                    <tr>
                      <th className="px-5 py-4 rounded-l-2xl">{t('ud_tool_details')}</th>
                      <th className="px-5 py-4">{t('ud_duration')}</th>
                      <th className="px-5 py-4">{t('ud_amount')}</th>
                      <th className="px-5 py-4 rounded-r-2xl text-right">{t('ud_status_col')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rentals.filter(r => r.status === 'returned' || r.status === 'cancelled').map(r => (
                      <tr key={r._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-5">
                          <p className="font-bold text-brand">{r.toolId?.name || 'Tool Rental'}</p>
                          <p className="text-xs font-semibold text-slate-500 mt-1">Provider: {r.toolId?.ownerId?.name || 'Tool Owner'}</p>
                        </td>
                        <td className="px-5 py-5 text-sm font-semibold text-slate-500">{r.days} Days</td>
                        <td className="px-5 py-5 font-bold text-brand">₹{r.total}</td>
                        <td className="px-5 py-5 text-right">
                          <span className="px-3 py-1 rounded-md bg-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>

        {/* Right Column */}
        <div className="xl:col-span-4 space-y-8">
          {/* Active Rentals Widget */}
          <section className="bg-brand rounded-[2rem] p-7 text-surface relative overflow-hidden shadow-premium">
            <div className="absolute top-0 right-0 p-4 opacity-5"><span className="material-symbols-outlined text-[120px]">construction</span></div>
            <h3 className="text-xl font-bold font-headline mb-6 relative z-10 flex items-center gap-2 text-surface">
              <span className="material-symbols-outlined text-accent text-2xl">handyman</span>
              {t('ud_tool_rentals')}
            </h3>
            
            {rentals.filter(r => r.status !== 'returned' && r.status !== 'cancelled').length === 0 ? (
              <div className="relative z-10 bg-surface/10 border border-surface/20 rounded-2xl p-5 text-slate-300">
                <p className="font-bold mb-2 text-surface">{t('ud_no_rentals')}</p>
                <p className="text-sm font-medium leading-relaxed mb-4">{t('ud_no_rentals_hint')}</p>
                <Link to="/rentals" className="inline-flex items-center gap-2 bg-accent text-brand px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-accent-light transition-colors">
                  {t('ud_browse_catalog')}
                </Link>
              </div>
            ) : (
              rentals.filter(r => r.status !== 'returned' && r.status !== 'cancelled').slice(0, 3).map(rental => (
                <div key={rental._id} className="bg-surface/10 border border-surface/20 p-4 rounded-2xl relative z-10 mb-4 backdrop-blur-sm">
                  <div className="flex items-center gap-4 mb-4">
                    {rental.toolId?.image ? (
                      <img src={rental.toolId.image} className="w-12 h-12 rounded-xl object-cover bg-surface" alt={rental.toolId?.name || 'Tool rental'} />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-surface flex items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined text-xl">construction</span>
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-white">{rental.toolId?.name || 'Tool Rental'}</h4>
                      <p className="text-xs text-slate-300 font-medium mt-0.5">{rental.days} days • ₹{rental.total}</p>
                    </div>
                  </div>
                  <div className={`bg-brand-dark/50 p-2.5 rounded-xl border border-brand/50 flex items-center justify-between text-[11px] font-bold uppercase tracking-widest ${
                    rental.status === 'confirmed' ? 'text-emerald-400' :
                    rental.status === 'delivered' ? 'text-brand' :
                    'text-slate-300'
                  }`}>
                    <span>{t('ud_status')}</span>
                    <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10">{rental.status}</span>
                  </div>

                  {rental.status === 'confirmed' && rental.deliveryOtp && (
                    <div className="mt-4 bg-emerald-500/20 text-emerald-400 p-3 rounded-xl flex items-center justify-between border border-emerald-500/30">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest">{t('ud_delivery_otp')}</p>
                      </div>
                      <div className="text-xl font-extrabold tracking-widest bg-emerald-900/50 px-3 py-1 rounded-lg">
                        {rental.deliveryOtp}
                      </div>
                    </div>
                  )}

                  {rental.status === 'delivered' && rental.returnOtp && (
                    <div className="mt-4 bg-amber-500/20 text-amber-400 p-3 rounded-xl flex items-center justify-between border border-amber-500/30">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-widest">{t('ud_return_otp')}</p>
                      </div>
                      <div className="text-xl font-extrabold tracking-widest bg-amber-900/50 px-3 py-1 rounded-lg">
                        {rental.returnOtp}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
            <button onClick={() => toast('Rental portal coming soon...', { icon: '📦' })} className="w-full mt-2 bg-surface/10 hover:bg-surface/20 text-surface font-bold py-3 rounded-xl border border-surface/20 transition-colors text-sm">
              {t('ud_manage_orders')}
            </button>
          </section>

          {/* Promotional / Recommended */}
          <section className="bg-surface rounded-3xl shadow-card border border-slate-200/60 p-7">
            <h3 className="text-lg font-bold font-headline text-brand mb-5">{t('ud_recommended')}</h3>
            <div className="text-center p-4">
              <p className="text-sm font-medium text-slate-500 mb-4">{t('ud_recommended_desc')}</p>
              <Link to="/services" className="inline-flex items-center gap-2 text-brand font-bold text-sm bg-slate-50 hover:bg-slate-100 px-4 py-2 rounded-xl transition-colors border border-slate-200">
                {t('ud_browse_services')} <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>
          </section>
        </div>
      </main>

      {/* Feedback Modal */}
      <AnimatePresence>
        {showFeedbackModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center bg-brand/40 backdrop-blur-sm px-4">
            <motion.div initial={{scale:0.9, y:20}} animate={{scale:1, y:0}} exit={{scale:0.9, y:20}} className="bg-surface w-full max-w-lg rounded-[2rem] p-8 shadow-premium border border-slate-200/50">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-extrabold font-headline text-brand">{t('ud_rate_service')}</h3>
                <button onClick={() => setShowFeedbackModal(false)} className="text-slate-400 hover:text-brand bg-slate-100 hover:bg-slate-200 w-8 h-8 rounded-full flex items-center justify-center transition-colors">
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>
              
              <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{t('ud_job_details')}</p>
                <p className="font-bold text-brand">{feedbackJob?.serviceName || 'Service'}</p>
              </div>

              <form onSubmit={submitFeedback}>
                <div className="mb-8 flex flex-col items-center">
                  <p className="text-sm font-bold text-slate-500 mb-3">{t('ud_how_was_experience')}</p>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map((star) => (
                      <button 
                        key={star} type="button"
                        onClick={() => setRating(star)}
                        className="transition-transform hover:scale-110 active:scale-95 focus:outline-none"
                      >
                        <span className={`material-symbols-outlined text-4xl ${rating >= star ? 'text-accent' : 'text-slate-200'}`} style={{fontVariationSettings: rating >= star ? "'FILL' 1" : "'FILL' 0"}}>
                          star
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">{t('ud_leave_comment')}</label>
                  <textarea 
                    value={comment} onChange={(e) => setComment(e.target.value)}
                    className="input-field min-h-[100px] resize-none" 
                    placeholder={t('ud_comment_placeholder')} 
                  />
                </div>

                <button type="submit" className="w-full btn-accent !py-4 shadow-premium text-lg">
                  {t('ud_submit_feedback')}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
