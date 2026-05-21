/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../lib/axios';
import AdminComplaints from '../components/AdminComplaints';
import AdminCoupons from '../components/AdminCoupons';
import { useLocation } from 'react-router-dom';

export default function AdminDashboard() {
  const [verifications, setVerifications] = useState([]);
  const [pendingServices, setPendingServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [userPagination, setUserPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [stats, setStats] = useState({});
  const [analytics, setAnalytics] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const location = useLocation();
  const [activeSection, setActiveSection] = useState(location.state?.activeSection || 'overview');

  useEffect(() => {
    if (location.state?.activeSection) {
      setActiveSection(location.state.activeSection);
    }
  }, [location.state?.activeSection]);

  const [verificationFilter, setVerificationFilter] = useState('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState(null); // 'verif_id' or 'service_id'

  const fetchVerifications = useCallback(async (status) => {
    try {
      const res = await api.get(`/admin/verifications?status=${status}`);
      if (res.success) setVerifications(res.data.verifications || []);
    } catch (err) { toast.error('Failed to fetch verifications'); }
  }, []);

  const fetchAll = useCallback(async () => {
    try {
      const [s, u, a, ps] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users?limit=10'),
        api.get('/admin/analytics'),
        api.get('/admin/pending-services'),
      ]);
      if (s.success) setStats(s.data);
      if (u.success) { setUsers(u.data.users || []); setUserPagination(u.data.pagination || {}); }
      if (a.success) setAnalytics(a.data.analytics || []);
      if (ps.success) setPendingServices(ps.data.services || []);
      fetchVerifications('pending');
    } catch (err) { console.error('Admin data fetch failed', err); }
  }, [fetchVerifications]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    fetchVerifications(verificationFilter);
  }, [verificationFilter, fetchVerifications]);

  const fetchUsers = async (page = 1) => {
    try {
      const params = new URLSearchParams({ page, limit: 10 });
      if (searchQuery) params.append('search', searchQuery);
      if (roleFilter) params.append('role', roleFilter);
      const res = await api.get(`/admin/users?${params}`);
      if (res.success) { setUsers(res.data.users || []); setUserPagination(res.data.pagination || {}); }
    } catch (err) { toast.error('Failed to fetch users'); }
  };

  const handleVerification = async (id, action) => {
    if (action === 'reject' && !rejectionReason) {
      toast.error('Rejection reason is required');
      return;
    }
    try {
      await api.put(`/admin/verifications/${id}`, { action, reason: rejectionReason });
      toast.success(`Provider ${action}d successfully`);
      setRejectingId(null);
      setRejectionReason('');
      fetchVerifications(verificationFilter);
      fetchStats();
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
  };

  const handleServiceApproval = async (id, action) => {
    if (action === 'reject' && !rejectionReason) {
      toast.error('Rejection reason is required');
      return;
    }
    try {
      await api.put(`/admin/services/${id}/${action}`, { reason: rejectionReason });
      toast.success(`Service ${action}d successfully`);
      setRejectingId(null);
      setRejectionReason('');
      const res = await api.get('/admin/pending-services');
      if (res.success) setPendingServices(res.data.services || []);
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
  };

  const fetchStats = async () => {
    const s = await api.get('/admin/stats');
    if (s.success) setStats(s.data);
  };

  const handleToggleUser = async (id) => {
    try {
      const res = await api.put(`/admin/users/${id}/toggle-status`);
      if (res.success) {
        toast.success(res.message);
        setUsers(users.map(u => u._id === id ? { ...u, isActive: !u.isActive } : u));
      }
    } catch (err) { toast.error('Failed'); }
  };

  const handleDeleteUser = async (id) => {
    if (!confirm('Delete this user permanently?')) return;
    try {
      await api.delete(`/admin/users/${id}`);
      toast.success('User deleted');
      fetchUsers(userPagination.page);
    } catch (err) { toast.error('Failed'); }
  };

  const maxBookings = Math.max(...analytics.map(d => d.bookings), 1);

  return (
    <main className="min-h-[calc(100vh-5rem)] bg-surface-muted pb-24 relative">
      <div className="absolute top-0 left-0 w-full h-[350px] bg-brand" style={{ zIndex: 0 }} />

      <div className="max-w-[1400px] mx-auto px-4 md:px-8 pt-10 relative" style={{ zIndex: 1 }}>
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
          <div>
            <h2 className="text-3xl font-extrabold font-headline text-white tracking-tight">Admin Dashboard</h2>
            <p className="text-slate-300 font-medium mt-1">Platform analytics & management</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {['overview','users','verifications','services','complaints','offers'].map(s => (
              <button key={s} onClick={() => setActiveSection(s)}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${activeSection === s ? 'bg-surface text-brand shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10 border border-white/20'}`}>
                {s === 'offers' ? 'Offers & Coupons' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {/* KPI Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Total Users', value: stats.totalUsers || 0, badge: `${stats.totalProviders || 0} providers`, badgeType: 'positive', icon: 'group' },
            { label: 'Active Bookings', value: stats.activeBookings || 0, badge: 'Live', badgeType: 'neutral', icon: 'book_online' },
            { label: 'Platform Revenue', value: `₹${((stats.revenue || 0)).toLocaleString('en-IN')}`, badge: `MTD: ₹${((stats.monthlyRevenue || 0)).toLocaleString('en-IN')}`, badgeType: 'positive', icon: 'account_balance' },
            { label: 'Gross Volume', value: `₹${((stats.grossVolume || 0) / 1000).toFixed(1)}k`, badge: `${stats.completedBookings || 0} completed`, badgeType: 'neutral', icon: 'payments' },
            { label: 'Pending Verifs', value: stats.newProviders || 0, badge: pendingServices.length > 0 ? `${pendingServices.length} pending svcs` : 'All Clear', badgeType: stats.newProviders > 0 || pendingServices.length > 0 ? 'warning' : 'positive', icon: 'how_to_reg' }
          ].map((kpi, idx) => (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }} key={kpi.label}
              className="bg-surface rounded-3xl p-6 shadow-card border border-slate-200/60 hover:-translate-y-1 transition-transform group">
              <div className="flex justify-between items-start mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-sm transition-colors
                  ${kpi.badgeType === 'positive' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    kpi.badgeType === 'warning' ? 'bg-amber-50 text-amber-500 border-amber-100' :
                    'bg-accent/10 text-accent-dark border-accent/20'}`}>
                  <span className="material-symbols-outlined text-[24px]">{kpi.icon}</span>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border
                  ${kpi.badgeType === 'positive' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    kpi.badgeType === 'warning' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                    'bg-slate-50 text-slate-500 border-slate-200'}`}>
                  {kpi.badge}
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
              <h3 className="text-3xl font-extrabold font-headline text-brand tracking-tight">{kpi.value}</h3>
            </motion.div>
          ))}
        </section>

        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
            {/* Chart */}
            <div className="xl:col-span-2 bg-surface rounded-3xl p-8 shadow-card border border-slate-200/60">
              <h4 className="text-xl font-extrabold font-headline text-brand mb-8">Weekly Booking Trends</h4>
              <div className="relative h-64 w-full flex items-end justify-between gap-2 md:gap-4 mt-6">
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] font-bold text-slate-300">
                  <span>{maxBookings}</span><span>{Math.round(maxBookings*0.75)}</span><span>{Math.round(maxBookings*0.5)}</span><span>{Math.round(maxBookings*0.25)}</span><span>0</span>
                </div>
                <div className="ml-10 flex-1 flex items-end justify-between h-full gap-2 border-b-2 border-slate-100 relative">
                  {[0.25, 0.5, 0.75, 1].map(p => <div key={p} className="absolute w-full border-t border-slate-100/50" style={{ top: `${(1 - p) * 100}%` }} />)}
                  {analytics.map((bar, i) => (
                    <div key={i} className="relative w-full flex flex-col items-center justify-end h-full group">
                      <div className="w-full max-w-[40px] rounded-t-xl transition-all duration-500 relative z-10 hover:brightness-110"
                        style={{ height: `${Math.max((bar.bookings / maxBookings) * 100, 3)}%`, backgroundColor: i === analytics.length - 1 ? '#0F172A' : '#F5A623' }}>
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-brand text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm pointer-events-none">
                          {bar.bookings} bookings
                        </div>
                      </div>
                      <span className="absolute -bottom-6 text-[10px] font-bold text-slate-400 uppercase tracking-wider">{bar.day}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions / Summary */}
            <div className="bg-surface rounded-3xl p-8 shadow-card border border-slate-200/60 flex flex-col">
              <h4 className="text-xl font-extrabold font-headline text-brand mb-6">Action Items</h4>
              <div className="space-y-4">
                <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-amber-500">how_to_reg</span>
                    <div>
                      <p className="font-bold text-amber-900">{stats.newProviders || 0} pending providers</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveSection('verifications')} className="text-xs font-bold bg-amber-200 text-amber-800 px-3 py-1.5 rounded-lg">View</button>
                </div>
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-500">home_repair_service</span>
                    <div>
                      <p className="font-bold text-blue-900">{pendingServices.length} pending services</p>
                    </div>
                  </div>
                  <button onClick={() => setActiveSection('services')} className="text-xs font-bold bg-blue-200 text-blue-800 px-3 py-1.5 rounded-lg">View</button>
                </div>
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-emerald-500">book_online</span>
                    <div>
                      <p className="font-bold text-emerald-900">{stats.activeBookings || 0} active bookings</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Verifications Section */}
        {activeSection === 'verifications' && (
          <section className="bg-surface rounded-3xl p-8 shadow-card border border-slate-200/60 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <h4 className="text-xl font-extrabold font-headline text-brand">Provider Verifications</h4>
              <select value={verificationFilter} onChange={e => setVerificationFilter(e.target.value)}
                className="px-4 py-2.5 bg-surface text-brand text-sm font-bold rounded-xl border border-slate-200 shadow-sm outline-none focus:border-brand">
                <option value="all">All Providers</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="space-y-6">
              {verifications.length === 0 ? (
                <div className="py-12 text-center text-slate-500 font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                  No {verificationFilter} providers found.
                </div>
              ) : verifications.map(ver => (
                <div key={ver._id} className="bg-surface border border-slate-200 rounded-2xl p-6 shadow-sm hover:shadow-card-hover transition-shadow">
                  <div className="flex flex-col md:flex-row gap-6 justify-between items-start">
                    
                    {/* Basic Info */}
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0">
                        {ver.documents?.profilePhoto ? (
                          <img src={ver.documents.profilePhoto} className="w-full h-full object-cover" alt="Profile" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">No Pic</div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-extrabold text-brand text-lg">{ver.userId?.name || 'Unknown'}</h5>
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border 
                            ${ver.verificationStatus === 'approved' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 
                              ver.verificationStatus === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' : 
                              'bg-amber-50 text-amber-600 border-amber-200'}`}>
                            {ver.verificationStatus}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-600 mb-2">
                          <span className="capitalize">{ver.businessType || 'Individual'}</span> • {ver.businessName || 'No Business Name'}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">email</span> {ver.userId?.email}
                          <span className="material-symbols-outlined text-[14px] ml-2">phone</span> {ver.userId?.phone}
                        </p>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                          <span className="material-symbols-outlined text-[14px]">location_on</span> {ver.fullAddress}, {ver.city} - {ver.pincode}
                        </p>
                      </div>
                    </div>

                    {/* Documents & Actions */}
                    <div className="flex flex-col md:items-end w-full md:w-auto gap-4">
                      {ver.documents?.idProof && (
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl">
                          <span className="material-symbols-outlined text-slate-400 text-[18px]">badge</span>
                          <span className="text-xs font-bold text-slate-600 uppercase">{ver.documents.idProofType || 'ID Proof'}</span>
                          <a href={ver.documents.idProof} target="_blank" rel="noreferrer" className="text-xs font-bold text-brand hover:underline ml-2">View</a>
                        </div>
                      )}

                      {ver.verificationStatus === 'pending' && (
                        rejectingId === ver._id ? (
                          <div className="flex flex-col gap-2 w-full md:w-64">
                            <input type="text" className="input-field !py-2 text-sm" placeholder="Reason for rejection..." 
                              value={rejectionReason} onChange={e=>setRejectionReason(e.target.value)} />
                            <div className="flex gap-2">
                              <button onClick={()=>setRejectingId(null)} className="flex-1 btn-secondary !py-2 !text-xs">Cancel</button>
                              <button onClick={()=>handleVerification(ver._id, 'reject')} className="flex-1 btn-accent !py-2 !text-xs !bg-red-500 !text-white">Confirm</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={()=>setRejectingId(ver._id)} className="flex-1 md:flex-none btn-secondary !py-2 !text-sm text-red-600 hover:bg-red-50 hover:border-red-200">Reject</button>
                            <button onClick={()=>handleVerification(ver._id, 'approve')} className="flex-1 md:flex-none btn-accent !py-2 !text-sm">Approve</button>
                          </div>
                        )
                      )}
                      {ver.verificationStatus === 'rejected' && ver.rejectionReason && (
                        <p className="text-xs text-red-600 font-bold max-w-xs text-right bg-red-50 px-2 py-1 rounded">Reason: {ver.rejectionReason}</p>
                      )}
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Services Section */}
        {activeSection === 'services' && (
          <section className="bg-surface rounded-3xl p-8 shadow-card border border-slate-200/60 mb-8">
            <h4 className="text-xl font-extrabold font-headline text-brand mb-8">Pending Service Approvals</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pendingServices.length === 0 ? (
                <div className="col-span-full py-12 text-center text-slate-500 font-bold border-2 border-dashed border-slate-200 rounded-2xl">
                  No services pending approval.
                </div>
              ) : pendingServices.map(svc => (
                <div key={svc._id} className="bg-surface border border-slate-200 rounded-2xl p-5 flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <span className="material-symbols-outlined text-slate-500">{svc.icon}</span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{svc.category}</p>
                        <h5 className="font-extrabold text-brand line-clamp-1">{svc.name}</h5>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-50 rounded-xl p-3 mb-4">
                    <p className="text-xs text-slate-500 mb-1"><span className="font-bold">Provider:</span> {svc.providerId?.name}</p>
                    <p className="text-xs text-slate-500 mb-1"><span className="font-bold">Price:</span> ₹{svc.basePrice}</p>
                    <p className="text-xs text-slate-500 line-clamp-2"><span className="font-bold">Desc:</span> {svc.description || 'N/A'}</p>
                  </div>

                  {rejectingId === `svc_${svc._id}` ? (
                    <div className="flex flex-col gap-2 mt-auto">
                      <input type="text" className="input-field !py-2 text-sm" placeholder="Reason..." 
                        value={rejectionReason} onChange={e=>setRejectionReason(e.target.value)} />
                      <div className="flex gap-2">
                        <button onClick={()=>setRejectingId(null)} className="flex-1 btn-secondary !py-2 !text-xs">Cancel</button>
                        <button onClick={()=>handleServiceApproval(svc._id, 'reject')} className="flex-1 btn-accent !py-2 !text-xs !bg-red-500 !text-white">Confirm</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-auto">
                      <button onClick={()=>setRejectingId(`svc_${svc._id}`)} className="flex-1 btn-secondary !py-2 !text-sm text-red-600 hover:bg-red-50 hover:border-red-200">Reject</button>
                      <button onClick={()=>handleServiceApproval(svc._id, 'approve')} className="flex-1 btn-accent !py-2 !text-sm">Approve</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Users Section */}
        {activeSection === 'users' && (
          <section className="bg-surface rounded-3xl p-8 shadow-card border border-slate-200/60 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <h4 className="text-xl font-extrabold font-headline text-brand">User Management</h4>
              <div className="flex w-full md:w-auto gap-3">
                <div className="relative flex-1 md:w-64">
                  <span className="material-symbols-outlined absolute left-3.5 top-2.5 text-slate-400 text-[18px]">search</span>
                  <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchUsers(1)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl text-sm font-bold text-brand focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all placeholder:text-slate-400" placeholder="Search users..." />
                </div>
                <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setTimeout(() => fetchUsers(1), 0); }}
                  className="px-4 py-2.5 bg-surface text-brand text-sm font-bold rounded-xl border border-slate-200 shadow-sm">
                  <option value="">All Roles</option><option value="user">Users</option><option value="provider">Providers</option><option value="admin">Admins</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 rounded-tl-xl">User</th>
                    <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Role</th>
                    <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Status</th>
                    <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Joined</th>
                    <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 rounded-tr-xl text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => (
                    <tr key={u._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm border border-black/5 ${u.role === 'provider' ? 'bg-accent text-brand' : u.role === 'admin' ? 'bg-brand text-white' : 'bg-emerald-200 text-emerald-800'}`}>
                          {u.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-brand">{u.name}</p>
                          <p className="text-[11px] font-semibold text-slate-500">{u.email}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4"><span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md border bg-slate-50 text-slate-600 border-slate-200">{u.role}</span></td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border ${u.isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                          {u.isActive ? 'Active' : 'Banned'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-xs font-semibold text-slate-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          {u.role !== 'admin' && (
                            <>
                              <button onClick={() => handleToggleUser(u._id)} title={u.isActive ? 'Ban' : 'Activate'}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${u.isActive ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100'}`}>
                                <span className="material-symbols-outlined text-[16px]">{u.isActive ? 'block' : 'check_circle'}</span>
                              </button>
                              <button onClick={() => handleDeleteUser(u._id)} title="Delete"
                                className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 border border-red-200 text-red-500 hover:bg-red-100 transition-colors">
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex justify-between items-center p-5 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-400">Page {userPagination.page} of {userPagination.pages}</span>
                <div className="flex gap-2">
                  <button onClick={() => fetchUsers(userPagination.page - 1)} disabled={userPagination.page === 1} className="p-2 border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50">
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  <button onClick={() => fetchUsers(userPagination.page + 1)} disabled={userPagination.page === userPagination.pages} className="p-2 border border-slate-200 rounded-lg disabled:opacity-50 hover:bg-slate-50">
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Complaints Section */}
        {activeSection === 'complaints' && (
          <section className="bg-surface rounded-3xl p-8 shadow-card border border-slate-200/60 mb-8">
            <h4 className="text-xl font-extrabold font-headline text-brand mb-8">Complaint Management</h4>
            <AdminComplaints />
          </section>
        )}

        {/* Offers Section */}
        {activeSection === 'offers' && (
          <section className="bg-surface rounded-3xl p-8 shadow-card border border-slate-200/60 mb-8">
            <AdminCoupons />
          </section>
        )}
      </div>
    </main>
  );
}
