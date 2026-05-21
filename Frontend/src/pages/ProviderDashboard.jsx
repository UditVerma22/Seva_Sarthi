/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/useAuthStore';
import api from '../lib/axios';
import socketService from '../lib/socket';
import ServiceModal from '../components/provider/ServiceModal';
import ToolModal from '../components/provider/ToolModal';
import { useToolStore } from '../store/useToolStore';
import { useLanguageStore } from '../store/useLanguageStore';

import { useNavigate } from 'react-router-dom';

export default function ProviderDashboard() {
  const { currentUser, providerStatus } = useAuthStore();
  const navigate = useNavigate();

  const { setProviderStatus } = useAuthStore();

  useEffect(() => {
    // If cached status isn't approved, double-check with backend before redirecting
    if (providerStatus !== 'approved') {
      api.get('/providers/onboarding-status').then(res => {
        const freshStatus = res?.data?.verificationStatus;
        if (freshStatus === 'approved') {
          setProviderStatus('approved');
        } else {
          navigate('/provider/onboarding-status', { replace: true });
        }
      }).catch(() => {
        navigate('/provider/onboarding-status', { replace: true });
      });
    }
  }, [providerStatus, navigate, setProviderStatus]);

  const { t: tr, language } = useLanguageStore();
  const [requests, setRequests] = useState([]);
  const [myTools, setMyTools] = useState([]);
  const [myServices, setMyServices] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [rentals, setRentals] = useState([]);
  const { fetchProviderRentals, updateRentalStatus } = useToolStore();
  // Restore cached stats instantly on mount to avoid flash of zeros
  const [stats, setStats] = useState(() => {
    try {
      const cached = sessionStorage.getItem('pd_stats');
      return cached ? JSON.parse(cached) : { todayJobs:0, weeklyEarnings:0, totalEarnings:0, rating:0, completionRate:'0%', jobsCompleted:0 };
    } catch { return { todayJobs:0, weeklyEarnings:0, totalEarnings:0, rating:0, completionRate:'0%', jobsCompleted:0 }; }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('jobs');
  const [isAvailable, setIsAvailable] = useState(true);
  const [toolModal, setToolModal] = useState({ open:false, edit:null });
  const [svcModal, setSvcModal] = useState({ open:false, edit:null });
  const [whModal, setWhModal] = useState(false);
  const [workingHours, setWorkingHours] = useState({ start: '09:00', end: '18:00' });
  const [walletBalance, setWalletBalance] = useState(null);

  const fetchAll = async () => {
    if (!currentUser) return;
    try {
      const [rq, tl, sv, sc, st, rn] = await Promise.allSettled([
        api.get('/providers/requests'),
        api.get('/tools/my-tools'),
        api.get('/services/my-services'),
        api.get('/providers/schedule'),
        api.get('/providers/dashboard'),
        fetchProviderRentals()
      ]);
      if (rq.status==='fulfilled' && rq.value.success) setRequests(rq.value.data.requests);
      if (tl.status==='fulfilled' && tl.value.success) setMyTools(tl.value.data.tools);
      if (sv.status==='fulfilled' && sv.value.success) setMyServices(sv.value.data.services);
      if (sc.status==='fulfilled' && sc.value.success) setSchedule(sc.value.data.schedule);
      if (rn.status==='fulfilled') setRentals(rn.value || []);
        if (st.status==='fulfilled' && st.value.success) {
        const d = st.value.data;
        setIsAvailable(d.isAvailable);
        if (d.workingHours) setWorkingHours(d.workingHours);
        const newStats = {
          todayJobs: d.todayJobs || 0,
          weeklyEarnings: d.weeklyEarnings || 0,
          totalEarnings: d.totalEarnings || 0,
          rating: d.rating || 0,
          completionRate: d.completionRate || '0%',
          jobsCompleted: d.jobsCompleted || 0,
        };
        setStats(newStats);
        try { sessionStorage.setItem('pd_stats', JSON.stringify(newStats)); } catch { /* ignore */ }
      }
    } catch(e) { console.error(e); } finally {
      setIsLoading(false);
    }
  };

  const fetchWalletBalance = async () => {
    try {
      const res = await api.get('/wallet');
      if (res.success) setWalletBalance(res.data.balance);
    } catch { /* wallet may not exist yet */ }
  };

   
  useEffect(() => { 
    fetchAll(); 
    fetchWalletBalance();
    
    // New job request from a customer
    const handleNewRequest = (data) => {
      toast('New job request!', { icon: '🔔' });
      
      // Play localized audio alert
      if ('speechSynthesis' in window) {
        // Read fresh states from Zustand store
        const currentLang = useLanguageStore.getState().language;
        const currentUserName = useAuthStore.getState().currentUser?.name || 'Provider';
        
        let textToSpeak = `You have a new job request!`;
        let langCode = 'en-US';
        
        if (currentLang === 'hi') {
          textToSpeak = `Aapko ek naya kaam mila hai!`;
          langCode = 'hi-IN';
        }

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = langCode;
        utterance.rate = 0.85; // Slightly slower for clearer pronunciation
        
        // Try to find a voice that matches the language
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
        if (voice) {
          utterance.voice = voice;
        }

        window.speechSynthesis.speak(utterance);
      }

      setRequests(p => {
        // Avoid duplicates
        if (p.some(r => r._id === data._id)) return p;
        return [data, ...p];
      });
    };

    // Booking status changed (accept, decline, en_route, working, completed)
    const handleStatusUpdate = (data) => {
      // Update the schedule list in real-time
      const { bookingId, status } = data;
      
      if (status === 'accepted') {
        // Move from requests to schedule
        setRequests(p => p.filter(r => r._id !== bookingId));
        setSchedule(p => {
          if (p.some(s => s._id === bookingId)) {
            return p.map(s => s._id === bookingId ? { ...s, status } : s);
          }
          return p; // Will be fetched by fetchAll
        });
      } else if (status === 'cancelled') {
        // Remove from both lists
        setRequests(p => p.filter(r => r._id !== bookingId));
        setSchedule(p => p.filter(s => s._id !== bookingId));
      } else {
        // Update status in schedule
        setSchedule(p => p.map(s => s._id === bookingId ? { ...s, status } : s));
      }

      // Refresh stats
      fetchAll();
    };

    const handleNewRental = (data) => {
      toast('New tool rental request!', { icon: '🔧' });

      // Play localized audio alert for tool rental
      if ('speechSynthesis' in window) {
        const currentLang = useLanguageStore.getState().language;
        
        let textToSpeak = 'You have a new tool rental request!';
        let langCode = 'en-US';
        
        if (currentLang === 'hi') {
          textToSpeak = 'Aapko ek naya tool rental mila hai!';
          langCode = 'hi-IN';
        }

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = langCode;
        utterance.rate = 0.85;
        
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang.startsWith(langCode.split('-')[0]));
        if (voice) utterance.voice = voice;

        window.speechSynthesis.speak(utterance);
      }

      fetchAll();
    };

    const handleRentalUpdate = (data) => {
      fetchAll();
    };
    
    socketService.on('booking:new_request', handleNewRequest);
    socketService.on('booking:status_update', handleStatusUpdate);
    socketService.on('new_rental', handleNewRental);
    socketService.on('rental_updated', handleRentalUpdate);
    
    return () => {
      socketService.off('booking:new_request', handleNewRequest);
      socketService.off('booking:status_update', handleStatusUpdate);
      socketService.off('new_rental', handleNewRental);
      socketService.off('rental_updated', handleRentalUpdate);
    };
  }, [currentUser]);

  const handleAccept = async (r) => {
    try { 
      await api.post(`/bookings/${r._id}/accept`); 
      toast.success(`Accepted: ${r.serviceName}`); 
      setRequests(p=>p.filter(x=>x._id!==r._id)); 
      setSchedule(p=>[{...r, status: 'accepted'}, ...p]);
      fetchAll();
    } catch(e){ toast.error(e?.response?.data?.message || e?.message || 'Failed to accept job'); }
  };
  const handleDecline = async (r) => {
    try { await api.post(`/bookings/${r._id}/decline`); toast.error(`Declined: ${r.serviceName}`); setRequests(p=>p.filter(x=>x._id!==r._id)); fetchAll(); } catch(e){ toast.error(e?.response?.data?.message || e?.message || 'Failed to decline job'); }
  };
  const handleStatusUpdate = async (id, status) => {
    let payload = { status };
    if (status === 'working') {
      const otp = window.prompt("Enter the 4-digit Start Code provided by the customer:");
      if (!otp) {
        toast.error('Start Code is required to begin work.');
        return;
      }
      payload.otp = otp;
    }
    if (status === 'completed') {
      const otp = window.prompt("Enter the 4-digit Completion Code provided by the customer:");
      if (!otp) {
        toast.error('Completion Code is required to finish the job.');
        return;
      }
      payload.otp = otp;
    }

    try {
      await api.put(`/bookings/${id}/status`, payload);
      setSchedule(p => p.map(x => x._id === id ? { ...x, status } : x));
      toast.success(`Status updated to ${status.replace('_', ' ').toUpperCase()}`);
      fetchAll();
    } catch(e) {
      toast.error(e?.response?.data?.message || 'Failed to update status');
    }
  };
  const toggleAvailability = async () => {
    try {
      const res = await api.put('/providers/availability');
      if (res.success) { setIsAvailable(res.data.isAvailable); toast.success(res.message); }
    } catch(e){ toast.error('Failed'); }
  };
  const saveWorkingHours = async () => {
    try {
      const res = await api.put('/providers/profile', { workingHours });
      if (res.success) { 
        toast.success('Working hours updated');
        setWhModal(false);
      }
    } catch(e) { toast.error('Failed to update working hours'); }
  };
  const toggleToolStatus = async (tool) => {
    try {
      const res = await api.put(`/tools/${tool._id}/toggle-status`);
      if (res.success) { toast.success(res.message); fetchAll(); }
    } catch(e){ toast.error('Failed'); }
  };
  const toggleServiceActive = async (svc) => {
    try {
      const res = await api.put(`/services/${svc._id}/toggle-active`);
      if (res.success) { toast.success(res.message); fetchAll(); }
    } catch(e){ toast.error('Failed'); }
  };
  
  const handleRentalStatusUpdate = async (id, status) => {
    let payload = { status };
    if (status === 'delivered') { 
      const otp = window.prompt("Enter the Delivery OTP provided by the customer:");
      if (!otp) {
        toast.error('Delivery OTP is required to hand over the tool.');
        return;
      }
      payload.otp = otp;
    }
    if (status === 'returned') {
      const otp = window.prompt("Enter the Return OTP provided by the customer:");
      if (!otp) {
        toast.error('Return OTP is required to mark the tool as returned.');
        return;
      }
      payload.otp = otp;
    }

    try {
      // Direct API call since we need to pass OTP and updateRentalStatus in store doesn't take otp
      await api.put(`/rentals/${id}/status`, payload);
      toast.success(`Rental marked as ${status}`);
      fetchAll();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update rental status');
    }
  };

  const handleProfilePic = async (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      try { const res = await api.put('/users/profile',{avatar:reader.result}); if(res.success){useAuthStore.getState().checkAuth();toast.success('Photo updated!');}} catch{toast.error('Failed');}
    }; reader.readAsDataURL(file);
  };
  const handleRemovePhoto = async () => {
    try { await api.put('/users/profile',{avatar:''}); useAuthStore.getState().checkAuth(); toast.success('Removed'); } catch{toast.error('Failed');}
  };

  const tabs = [
    { key:'jobs', label: tr('pd_tab_jobs'), icon:'work' },
    { key:'services', label: tr('pd_tab_services'), icon:'home_repair_service' },
    { key:'tools', label: tr('pd_tab_tools'), icon:'construction' },
    { key:'wallet', label: 'Wallet', icon:'account_balance_wallet', action: () => navigate('/provider/wallet') },
  ];

  return (
    <div className="min-h-screen bg-surface-muted pb-24 relative">
      <div className="absolute top-0 left-0 w-full h-[320px] bg-brand" style={{zIndex:0}} />
      {toolModal.open && <ToolModal editData={toolModal.edit} onClose={()=>setToolModal({open:false,edit:null})} onSuccess={fetchAll} />}
      {svcModal.open && <ServiceModal editData={svcModal.edit} onClose={()=>setSvcModal({open:false,edit:null})} onSuccess={fetchAll} />}

      <AnimatePresence>
        {whModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{opacity:0, scale:0.95}} animate={{opacity:1, scale:1}} exit={{opacity:0, scale:0.95}} className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-premium">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-extrabold text-brand font-headline">Working Hours</h3>
                <button onClick={()=>setWhModal(false)} className="text-slate-400 hover:text-rose-500"><span className="material-symbols-outlined">close</span></button>
              </div>
              <div className="space-y-5 mb-8">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Start Time</label>
                  <input type="time" value={workingHours.start} onChange={e => setWorkingHours(prev => ({...prev, start: e.target.value}))} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-brand focus:border-accent focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">End Time</label>
                  <input type="time" value={workingHours.end} onChange={e => setWorkingHours(prev => ({...prev, end: e.target.value}))} className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-bold text-brand focus:border-accent focus:outline-none" />
                </div>
              </div>
              <button onClick={saveWorkingHours} className="w-full btn-accent !py-3">Save Changes</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="pt-10 pb-8 relative z-30">
        <div className="section-container flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5 w-full md:w-auto">
            <div className="relative group">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-surface/20 shadow-sm">
                <img className="w-full h-full object-cover" src={currentUser?.avatar||`https://ui-avatars.com/api/?name=${currentUser?.name||'P'}&background=F5A623&color=0F172A&size=200`} alt="Profile" />
              </div>
              <label className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                <span className="material-symbols-outlined text-white text-xl">photo_camera</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleProfilePic} />
              </label>
              {currentUser?.avatar && <button onClick={handleRemovePhoto} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600">✕</button>}
            </div>
            <div>
              <h2 className="text-2xl font-extrabold font-headline text-white drop-shadow-sm">{currentUser?.name||'Provider'}</h2>
              <div className="flex items-center gap-5 mt-1">
                <button onClick={toggleAvailability} className="flex items-center gap-2 group/avail">
                  <span className="relative flex h-2.5 w-2.5">
                    {isAvailable ? <><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" /></> : <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />}
                  </span>
                  <span className={`text-[11px] font-bold uppercase tracking-widest group-hover/avail:underline ${isAvailable?'text-emerald-300':'text-rose-300'}`}>{isAvailable? tr('pd_accepting_jobs') : tr('pd_not_accepting')}</span>
                </button>
                <button onClick={() => setWhModal(true)} className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors group/wh">
                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                  <span className="text-[11px] font-bold uppercase tracking-widest group-hover/wh:underline">Working Hours</span>
                </button>
              </div>
            </div>
          </div>
          <div className="flex w-full md:w-auto items-center bg-surface/10 p-1.5 rounded-2xl backdrop-blur-md border border-surface/20 overflow-x-auto scrollbar-hide">
            {tabs.map(t=>(
              <button key={t.key} onClick={()=> t.action ? t.action() : setActiveTab(t.key)} className={`flex-1 min-w-[120px] md:min-w-0 md:flex-none px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-1.5 whitespace-nowrap ${activeTab===t.key?'bg-surface text-brand shadow-sm':'text-white/70 hover:text-white hover:bg-white/10'}`}>
                <span className="material-symbols-outlined text-[18px]">{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="section-container mt-6 relative z-10">

        {/* Low wallet balance warning */}
        {walletBalance !== null && walletBalance < 100 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-amber-500 text-2xl">warning</span>
              <div>
                <p className="font-bold text-amber-900 text-sm">Low Wallet Balance — ₹{walletBalance}</p>
                <p className="text-xs text-amber-700">You need at least ₹49 to accept Cash on Delivery bookings. Top up now.</p>
              </div>
            </div>
            <button onClick={() => navigate('/provider/wallet')} className="whitespace-nowrap px-4 py-2 bg-amber-500 text-white rounded-xl text-xs font-bold hover:bg-amber-600 transition-colors shadow-sm">
              Top Up
            </button>
          </div>
        )}

        {activeTab !== 'tools' && (
          <section className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-10">
            {[
              {
                icon: 'task_alt',
                label: tr('pd_today_jobs'),
                value: stats.todayJobs < 10 ? `0${stats.todayJobs}` : `${stats.todayJobs}`,
                sub: tr('pd_active_scheduled'),
                color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100',
              },
              {
                icon: 'workspace_premium',
                label: tr('pd_total_jobs_completed'),
                value: stats.jobsCompleted < 10 ? `0${stats.jobsCompleted}` : `${stats.jobsCompleted}`,
                sub: tr('pd_all_time'),
                color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100',
              },
              {
                icon: 'account_balance_wallet',
                label: tr('pd_weekly_earnings'),
                value: `₹${stats.weeklyEarnings.toLocaleString('en-IN')}`,
                sub: tr('pd_this_week'),
                color: 'text-accent-dark', bg: 'bg-accent/10', border: 'border-accent/20',
              },
              {
                icon: 'currency_rupee',
                label: tr('pd_total_earnings'),
                value: `₹${stats.totalEarnings.toLocaleString('en-IN')}`,
                sub: tr('pd_all_time'),
                color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100',
                highlight: true,
              },
              {
                icon: 'star',
                label: tr('pd_avg_rating'),
                value: stats.rating ? `${stats.rating}★` : '—',
                sub: tr('pd_customer_rating'),
                color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', isFilled: true,
              },
              {
                icon: 'trending_up',
                label: tr('pd_completion_rate'),
                value: stats.completionRate,
                sub: tr('pd_jobs_finished'),
                color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100',
              },
            ].map(k => (
              <div key={k.label} className={`bg-surface rounded-2xl p-4 sm:p-5 shadow-sm border flex flex-col gap-3 hover:-translate-y-1 transition-transform duration-200 ${k.highlight ? 'border-teal-200 ring-1 ring-teal-100' : 'border-slate-200/60'}`}>
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${k.bg} ${k.border} ${k.color} flex-shrink-0`}>
                    <span className="material-symbols-outlined text-[20px]" style={k.isFilled ? { fontVariationSettings: "'FILL' 1" } : {}}>{k.icon}</span>
                  </div>
                  {k.highlight && <span className="text-[9px] font-bold uppercase tracking-widest text-teal-600 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full">{tr('pd_all_time')}</span>}
                </div>
                <div>
                  <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
                  {isLoading && !sessionStorage.getItem('pd_stats') ? (
                    <div className="h-8 w-20 bg-slate-200 rounded-lg animate-pulse mt-1" />
                  ) : (
                    <h3 className={`text-2xl sm:text-3xl font-extrabold font-headline leading-none ${k.color}`}>{k.value}</h3>
                  )}
                  {k.sub && <p className="text-[10px] text-slate-400 font-medium mt-1">{k.sub}</p>}
                </div>
              </div>
            ))}
          </section>
        )}

        <AnimatePresence mode="wait">
          {activeTab==='jobs' && (
            <motion.div key="jobs" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8">
                <div className="bg-surface rounded-3xl shadow-card border border-slate-200/60 p-8">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-2xl font-extrabold font-headline text-brand">{tr('pd_new_requests')}</h3>
                    {requests.length>0 && <span className="bg-rose-50 text-rose-600 text-xs font-bold px-3 py-1.5 rounded-lg border border-rose-100">{requests.length} {tr('pd_pending')}</span>}
                  </div>
                  <div className="space-y-5">
                    {requests.length===0 ? (
                      <div className="py-16 flex flex-col items-center justify-center text-center bg-surface-muted rounded-2xl border-2 border-dashed border-slate-200">
                        <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">inbox</span>
                        <p className="text-slate-500 font-bold">{tr('pd_no_requests')}</p><p className="text-sm text-slate-400 mt-1">{tr('pd_caught_up')}</p>
                      </div>
                    ) : requests.map(r=>(
                      <div key={r._id} className="bg-surface border border-slate-200 rounded-2xl p-6 hover:shadow-card-hover hover:border-slate-300 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
                          <div className="flex items-start gap-4">
                            <img className="w-14 h-14 rounded-2xl object-cover bg-slate-100 shadow-sm" src={r.userId?.avatar||'https://ui-avatars.com/api/?name=C&size=200'} alt="" />
                            <div>
                              <p className="font-extrabold text-lg text-brand">{r.userId?.name||'Customer'}</p>
                              <p className="text-sm font-semibold text-slate-500 flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px] text-slate-400">location_on</span>{r.location||'Location'}</p>
                            </div>
                          </div>
                          <div className="flex flex-col sm:items-end bg-slate-50 px-4 py-3 rounded-xl border border-slate-100">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{tr('pd_payout')}</p>
                            <p className="text-2xl font-extrabold text-accent-dark">₹{r.totalAmount}</p>
                          </div>
                        </div>
                        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="flex items-center gap-2"><span className="material-symbols-outlined text-accent text-xl">handyman</span><p className="text-sm font-bold text-brand">{r.serviceName}</p></div>
                          <div className="flex w-full sm:w-auto gap-3">
                            <button onClick={()=>handleDecline(r)} className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-surface border border-slate-200 text-slate-500 font-bold text-sm hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200 transition-colors">{tr('pd_decline')}</button>
                            <button onClick={()=>handleAccept(r)} className="flex-1 sm:flex-none btn-accent !px-8 !py-2.5 shadow-sm">{tr('pd_accept_job')}</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-4">
                <div className="bg-surface rounded-3xl shadow-card border border-slate-200/60 p-7 lg:sticky lg:top-40">
                  <h3 className="text-xl font-extrabold font-headline text-brand mb-8">{tr('pd_active_jobs')}</h3>
                  <div className="space-y-6 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-[2px] before:bg-slate-100">
                    {schedule.length===0 ? <div className="py-8 text-center text-slate-500 font-medium">{tr('pd_no_active_jobs')}</div> : schedule.map((it,i)=>{
                      const isFirst=i===0; const timeStr=it.scheduledTime||new Date(it.scheduledDate).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
                      return (<div key={it._id} className={`relative pl-12 ${isFirst?'':'opacity-70 hover:opacity-100 transition-all'}`}>
                        {isFirst?<div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-surface border-[3px] border-accent shadow-sm z-10 flex items-center justify-center"><div className="w-2.5 h-2.5 rounded-full bg-accent animate-pulse"/></div>:<div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-surface border-2 border-slate-200 shadow-sm z-10"/>}
                        <p className={`text-[11px] font-bold uppercase tracking-widest mb-2 ${isFirst?'text-accent-dark':'text-slate-400'}`}>{timeStr}</p>
                        <div className={`${isFirst?'bg-accent/5 border-accent/20':'bg-surface border-slate-200'} border p-4 rounded-2xl shadow-sm`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className={`${isFirst?'text-brand':'text-slate-600'} font-bold`}>{it.serviceName}</h4>
                              <p className={`text-xs ${isFirst?'text-slate-500':'text-slate-400'} font-medium mt-1`}>{it.location||it.address||'Customer Location'}</p>
                            </div>
                            <span className="text-[10px] font-bold uppercase px-2 py-1 bg-slate-100 text-slate-500 rounded">{it.status}</span>
                          </div>
                          {it.status !== 'completed' && it.status !== 'cancelled' && (
                            <div className="mt-4 flex flex-col gap-2 border-t border-slate-100/50 pt-3">
                              <div className="flex flex-wrap gap-2">
                                {it.status === 'accepted' && <button onClick={() => handleStatusUpdate(it._id, 'en_route')} className="flex-1 text-xs bg-brand text-white font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-brand-light transition-colors">{tr('pd_start_journey')}</button>}
                                {it.status === 'en_route' && <button onClick={() => handleStatusUpdate(it._id, 'working')} className="flex-1 text-xs bg-accent text-brand font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-accent-light transition-colors">{tr('pd_arrived_start')}</button>}
                                {it.status === 'working' && <button onClick={() => handleStatusUpdate(it._id, 'completed')} className="flex-1 text-xs bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl shadow-sm hover:bg-emerald-600 transition-colors">{tr('pd_mark_completed')}</button>}
                              </div>
                              <div className="flex gap-2">
                                <a 
                                  href={it.userId?.phone ? `tel:${it.userId.phone}` : '#'} 
                                  onClick={(e) => { if(!it.userId?.phone) { e.preventDefault(); toast.error('Phone number not available'); } }}
                                  className="flex-1 text-center bg-slate-100 text-slate-600 font-bold px-4 py-2 rounded-xl hover:bg-slate-200 transition-colors text-xs flex items-center justify-center gap-1.5"
                                >
                                  <span className="material-symbols-outlined text-[14px]">call</span> {tr('ud_call')}
                                </a>
                                <a 
                                  href={it.userId?.phone ? `https://wa.me/91${it.userId.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${it.userId?.name || 'Customer'}, I am your Seva Sarthi professional for ${it.serviceName}.`)}` : '#'} 
                                  target="_blank" rel="noopener noreferrer"
                                  onClick={(e) => { if(!it.userId?.phone) { e.preventDefault(); toast.error('WhatsApp not available'); } }}
                                  className="flex-1 text-center bg-[#25D366] text-white font-bold px-4 py-2 rounded-xl hover:bg-[#128C7E] transition-colors text-xs flex items-center justify-center gap-1.5"
                                >
                                  <i className="fi fi-brands-whatsapp text-[14px]"></i> WhatsApp
                                </a>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>);
                    })}
                  </div>
                </div>

                {/* Active Tool Rentals Section removed from here, moved to Tools tab */}
              </div>
            </motion.div>
          )}

          {activeTab==='services' && (
            <motion.div key="services" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="bg-surface rounded-3xl shadow-card border border-slate-200/60 p-8">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-8 border-b border-slate-100 pb-6 gap-5">
                <div><h2 className="text-2xl font-extrabold font-headline text-brand">{tr('pd_my_services')}</h2><p className="text-slate-500 font-medium text-sm mt-1">{tr('pd_manage_offerings')}</p></div>
                <button onClick={()=>setSvcModal({open:true,edit:null})} className="btn-accent flex items-center gap-2 text-sm shadow-premium"><span className="material-symbols-outlined text-lg">add</span>{tr('pd_add_service')}</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myServices.length===0 ? <div className="col-span-full py-8 text-center text-slate-500 font-medium">{tr('pd_no_services_yet')}</div> : myServices.map(svc=>(
                  <div key={svc._id} className={`bg-surface border rounded-2xl p-5 flex flex-col transition-all hover:shadow-card-hover ${svc.isActive?'border-slate-200 hover:border-slate-300':'border-rose-200 bg-rose-50/30'}`}>
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center">
                        {svc.image ? (
                          <img src={svc.image} alt={svc.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className={`material-symbols-outlined text-2xl ${svc.isActive?'text-accent-dark':'text-slate-400'}`}>{svc.icon||'home_repair_service'}</span>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border ${svc.isActive?'bg-emerald-50 text-emerald-600 border-emerald-200':'bg-rose-50 text-rose-600 border-rose-200'}`}>{svc.isActive?tr('pd_active'):tr('pd_inactive')}</span>
                        {svc.approvalStatus === 'pending' && <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-amber-50 text-amber-600 border-amber-200" title="Awaiting admin approval">{tr('pd_approval_pending')}</span>}
                        {svc.approvalStatus === 'rejected' && <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border bg-red-50 text-red-600 border-red-200" title={svc.rejectionReason}>{tr('pd_approval_rejected')}</span>}
                      </div>
                    </div>
                    <h3 className="font-extrabold text-brand text-lg mb-1">{svc.name}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">{svc.category}</p>
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2 flex-grow">{svc.description||'No description'}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <span className="text-xl font-extrabold text-accent-dark">₹{svc.basePrice}<span className="text-[10px] text-slate-400 font-bold ml-1">base</span></span>
                      <div className="flex gap-2">
                        <button onClick={()=>setSvcModal({open:true,edit:svc})} className="p-2 bg-slate-100 rounded-xl text-slate-500 hover:text-brand hover:bg-slate-200 transition-colors" title="Edit"><span className="material-symbols-outlined text-[18px]">edit</span></button>
                        {svc.approvalStatus === 'approved' && (
                          <button onClick={()=>toggleServiceActive(svc)} className={`p-2 rounded-xl transition-colors ${svc.isActive?'bg-rose-50 text-rose-500 hover:bg-rose-100':'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'}`} title={svc.isActive?tr('pd_deactivate'):tr('pd_activate')}><span className="material-symbols-outlined text-[18px]">{svc.isActive?'pause_circle':'play_circle'}</span></button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div onClick={()=>setSvcModal({open:true,edit:null})} className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[220px] group hover:border-accent hover:bg-accent/5 transition-all cursor-pointer">
                  <div className="w-14 h-14 bg-surface rounded-full shadow-sm border border-slate-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-slate-400 group-hover:text-accent-dark text-2xl">add</span></div>
                  <h3 className="font-bold text-slate-500 group-hover:text-brand transition-colors">{tr('pd_add_new_service')}</h3>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab==='tools' && (
            <motion.div key="tools" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} className="bg-surface rounded-3xl shadow-card border border-slate-200/60 p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                  { 
                    label: tr('pd_total_tools'), 
                    value: myTools.length < 10 ? `0${myTools.length}` : myTools.length, 
                    icon: 'construction', 
                    color: 'text-brand', 
                    bg: 'bg-surface' 
                  },
                  { 
                    label: tr('pd_active_rentals'), 
                    value: rentals.filter(r => r.status === 'confirmed' || r.status === 'delivered').length < 10 ? `0${rentals.filter(r => r.status === 'confirmed' || r.status === 'delivered').length}` : rentals.filter(r => r.status === 'confirmed' || r.status === 'delivered').length, 
                    icon: 'sync', 
                    color: 'text-blue-600', 
                    bg: 'bg-blue-50' 
                  },
                  { 
                    label: tr('pd_rental_earnings'), 
                    value: `₹${rentals.filter(r => r.status === 'returned').reduce((acc, r) => acc + r.total, 0).toLocaleString('en-IN')}`, 
                    icon: 'payments', 
                    color: 'text-teal-600', 
                    bg: 'bg-teal-50' 
                  },
                ].map(stat => (
                  <div key={stat.label} className="bg-surface rounded-2xl p-5 border border-slate-200/60 flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg} ${stat.color} border border-slate-100 shadow-sm`}>
                      <span className="material-symbols-outlined text-[24px]">{stat.icon}</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                      <h4 className="text-2xl font-extrabold text-brand font-headline leading-none">{stat.value}</h4>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row justify-between items-center mb-8 border-b border-slate-100 pb-6 gap-5">
                <div><h2 className="text-2xl font-extrabold font-headline text-brand">{tr('pd_tool_inventory')}</h2><p className="text-slate-500 font-medium text-sm mt-1">{tr('pd_manage_listings')}</p></div>
                <button onClick={()=>setToolModal({open:true,edit:null})} className="btn-accent flex items-center gap-2 text-sm shadow-premium"><span className="material-symbols-outlined text-lg">add</span>{tr('pd_list_new_tool')}</button>
              </div>



              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myTools.length===0 ? <div className="col-span-full py-8 text-center text-slate-500 font-medium">{tr('pd_no_tools_yet')}</div> : myTools.map(tool=>(
                  <div key={tool._id} className={`bg-surface border rounded-2xl p-4 flex flex-col group transition-all hover:shadow-card-hover ${tool.status==='available'?'border-slate-200 hover:border-slate-300':'border-amber-200 bg-amber-50/30'}`}>
                    <div className="relative h-44 bg-surface-muted rounded-xl overflow-hidden mb-5">
                      {tool.image ? (
                        <img src={tool.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={tool.name} />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-slate-400">
                          <span className="material-symbols-outlined text-5xl">construction</span>
                          <span className="text-xs font-bold uppercase tracking-wider">{tr('pd_no_image')}</span>
                        </div>
                      )}
                      <span className={`absolute top-3 right-3 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border shadow-sm backdrop-blur-md ${tool.status==='available'?'bg-emerald-500/90 border-emerald-400 text-white':'bg-amber-500/90 border-amber-400 text-white'}`}>{tool.status==='available'?tr('pd_active'):tool.status==='rented'?tr('pd_rented'):tr('pd_inactive')}</span>
                    </div>
                    <h3 className="font-extrabold text-brand mb-1 text-lg line-clamp-1">{tool.name}</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-1">{tool.category} · {tool.condition}</p>
                    <p className="text-sm text-slate-500 mb-3 line-clamp-2 flex-grow">{tool.description||''}</p>
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="text-2xl font-extrabold text-accent-dark">₹{tool.dailyRate}<span className="text-[11px] text-slate-400 font-bold uppercase ml-1">{tr('pd_per_day')}</span></span>
                      <div className="flex gap-2">
                        <button onClick={()=>setToolModal({open:true,edit:tool})} className="p-2.5 bg-surface-muted rounded-xl text-slate-400 hover:text-brand hover:bg-slate-100 transition-colors" title="Edit"><span className="material-symbols-outlined text-[20px]">edit</span></button>
                        <button onClick={()=>toggleToolStatus(tool)} className={`p-2.5 rounded-xl transition-colors ${tool.status==='available'?'bg-rose-50 text-rose-500 hover:bg-rose-100':'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'}`} title={tool.status==='available'?tr('pd_deactivate'):tr('pd_activate')}><span className="material-symbols-outlined text-[20px]">{tool.status==='available'?'pause_circle':'play_circle'}</span></button>
                      </div>
                    </div>
                  </div>
                ))}
                <div onClick={()=>setToolModal({open:true,edit:null})} className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[250px] group hover:border-accent hover:bg-accent/5 transition-all cursor-pointer">
                  <div className="w-14 h-14 bg-surface rounded-full shadow-sm border border-slate-200 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><span className="material-symbols-outlined text-slate-400 group-hover:text-accent-dark text-2xl">add</span></div>
                  <h3 className="font-bold text-slate-500 group-hover:text-brand transition-colors">{tr('pd_list_another_tool')}</h3>
                </div>
              </div>

              <div className="mt-12">
                <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
                  <div>
                    <h2 className="text-2xl font-extrabold font-headline text-brand">{tr('pd_active_tool_rentals')}</h2>
                    <p className="text-slate-500 font-medium text-sm mt-1">{tr('pd_manage_rentals')}</p>
                  </div>
                </div>

                {rentals.filter(r => r.status !== 'returned' && r.status !== 'cancelled').length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center bg-surface-muted rounded-2xl border-2 border-dashed border-slate-200">
                    <span className="material-symbols-outlined text-slate-300 text-6xl mb-4">inventory_2</span>
                    <p className="text-slate-500 font-bold">{tr('pd_no_active_rentals')}</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-3xl border border-slate-200 shadow-sm">
                    <table className="w-full text-left bg-white">
                      <thead className="bg-slate-50 text-slate-400 text-[10px] uppercase tracking-widest font-bold">
                        <tr>
                          <th className="px-8 py-5">{tr('pd_tool_col')}</th>
                          <th className="px-8 py-5">{tr('pd_customer_col')}</th>
                          <th className="px-8 py-5">{tr('pd_duration_payout')}</th>
                          <th className="px-8 py-5">{tr('pd_status_col')}</th>
                          <th className="px-8 py-5 text-right">{tr('pd_action_col')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {rentals.filter(r => r.status !== 'returned' && r.status !== 'cancelled').map(r => (
                          <tr key={r._id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-6 font-extrabold text-brand">{r.toolId?.name}</td>
                            <td className="px-8 py-6 font-bold text-slate-700">{r.userId?.name}</td>
                            <td className="px-8 py-6 font-black text-teal-600">₹{r.total}</td>
                            <td className="px-8 py-6 uppercase font-bold text-xs">{r.status}</td>
                            <td className="px-8 py-6 text-right">
                              {r.status === 'confirmed' && <button onClick={() => handleRentalStatusUpdate(r._id, 'delivered')} className="btn-accent !px-5 !py-2 text-xs shadow-sm">{tr('pd_mark_delivered')}</button>}
                              {r.status === 'delivered' && <button onClick={() => handleRentalStatusUpdate(r._id, 'returned')} className="bg-brand text-white font-bold px-5 py-2 rounded-xl text-xs hover:bg-brand-light transition-colors shadow-sm">{tr('pd_confirm_return')}</button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
