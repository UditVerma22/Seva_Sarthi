/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useComplaintStore } from '../store/useComplaintStore';
import { useAuthStore } from '../store/useAuthStore';
import socketService from '../lib/socket';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_review', label: 'In Review' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'escalated', label: 'Escalated' },
  { value: 'reopened', label: 'Reopened' },
];

const statusBadge = (status) => {
  const map = {
    pending: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: 'hourglass_top' },
    in_review: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: 'visibility' },
    resolved: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: 'check_circle' },
    rejected: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', icon: 'cancel' },
    escalated: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', icon: 'priority_high' },
    reopened: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', icon: 'refresh' },
  };
  return map[status] || { bg: 'bg-slate-50', text: 'text-slate-500', border: 'border-slate-200', icon: 'help' };
};

const actionLabel = (action) => {
  const map = {
    warning_issued: { label: 'Warning Issued', icon: 'warning', color: 'text-amber-600' },
    refund_initiated: { label: 'Refund Initiated', icon: 'payments', color: 'text-emerald-600' },
    free_reservice: { label: 'Free Re-Service', icon: 'home_repair_service', color: 'text-blue-600' },
    trust_score_reduced: { label: 'Trust Score Reduced', icon: 'trending_down', color: 'text-orange-600' },
    temporary_suspension: { label: 'Temporary Suspension', icon: 'block', color: 'text-red-500' },
    permanent_ban: { label: 'Permanent Ban', icon: 'gavel', color: 'text-red-700' },
    penalty_applied: { label: 'Penalty Applied', icon: 'receipt_long', color: 'text-rose-600' },
  };
  return map[action] || null;
};

export default function MyComplaints() {
  const { currentUser } = useAuthStore();
  const { complaints, pagination, loading, fetchMyComplaints, reopenComplaint, submitting } = useComplaintStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [reopenId, setReopenId] = useState(null);
  const [reopenReason, setReopenReason] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);

  useEffect(() => {
    fetchMyComplaints({ status: statusFilter });
  }, [statusFilter, fetchMyComplaints]);

  // Listen for real-time complaint updates
  useEffect(() => {
    const handleUpdate = () => {
      fetchMyComplaints({ status: statusFilter });
    };
    socketService.on('complaint:status_update', handleUpdate);
    return () => socketService.off('complaint:status_update', handleUpdate);
  }, [statusFilter, fetchMyComplaints]);

  const handleReopen = async (id) => {
    if (!reopenReason.trim()) {
      toast.error('Please provide a reason for reopening.');
      return;
    }
    try {
      await reopenComplaint(id, reopenReason.trim());
      toast.success('Complaint reopened successfully!');
      setReopenId(null);
      setReopenReason('');
      fetchMyComplaints({ status: statusFilter });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reopen complaint.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-surface-muted pb-24">
      {/* Header */}
      <header className="bg-brand pt-10 pb-14 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full translate-y-1/2 -translate-x-1/3" />
        <div className="section-container relative z-10 flex flex-col md:flex-row justify-between md:items-end gap-6">
          <div>
            <Link to="/user/dashboard" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm font-bold mb-4 transition-colors">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span> Dashboard
            </Link>
            <h1 className="text-3xl md:text-4xl font-extrabold font-headline text-white tracking-tight">My Complaints</h1>
            <p className="text-slate-300 font-medium mt-2">Track and manage all your filed complaints.</p>
          </div>
          <Link to="/complaints/new" className="btn-accent !rounded-xl text-sm inline-flex self-start md:self-auto">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            Raise New Complaint
          </Link>
        </div>
      </header>

      <div className="section-container -mt-6 relative z-10">
        {/* Status Filter Tabs */}
        <div className="bg-surface rounded-2xl shadow-card border border-slate-200/60 p-2 flex gap-1 overflow-x-auto no-scrollbar mb-8">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${statusFilter === tab.value
                ? 'bg-brand text-white shadow-sm'
                : 'text-slate-500 hover:text-brand hover:bg-slate-50'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Complaints List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <svg className="animate-spin h-10 w-10 text-brand mb-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            <p className="text-slate-500 font-bold">Loading complaints...</p>
          </div>
        ) : complaints.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-surface rounded-[2rem] shadow-card border border-slate-200/60 p-16 text-center"
          >
            <span className="material-symbols-outlined text-slate-200 text-7xl mb-4">inbox</span>
            <h3 className="text-xl font-extrabold font-headline text-brand mb-2">No Complaints Found</h3>
            <p className="text-slate-500 font-medium mb-6">
              {statusFilter ? `No complaints with status "${statusFilter.replace('_', ' ')}".` : "You haven't filed any complaints yet."}
            </p>
            <Link to="/complaints/new" className="btn-accent !rounded-xl inline-flex">
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Raise a Complaint
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {complaints.map((c, idx) => {
                const badge = statusBadge(c.status);
                const isExpanded = expandedId === c._id;
                const isServiceType = c.type === 'service_booking';
                const refTitle = isServiceType
                  ? (c.bookingId?.serviceName || 'Service Booking')
                  : (c.rentalId?.toolName || 'Tool Rental');
                const providerName = c.providerId?.userId?.name || 'Provider';
                const actionInfo = c.adminAction ? actionLabel(c.adminAction) : null;

                return (
                  <motion.div
                    key={c._id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="bg-surface rounded-2xl shadow-card border border-slate-200/60 overflow-hidden"
                  >
                    {/* Card Header */}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : c._id)}
                      className="w-full p-5 md:p-6 text-left flex items-center gap-4 hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Type Icon */}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${isServiceType ? 'bg-blue-50 text-blue-600' : 'bg-teal-50 text-teal-600'}`}>
                        <span className="material-symbols-outlined text-[22px]">{isServiceType ? 'home_repair_service' : 'construction'}</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-[10px] font-bold text-slate-400 tracking-widest">{c.ticketId}</span>
                          <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${badge.bg} ${badge.text} ${badge.border}`}>
                            {c.status?.replace('_', ' ')}
                          </span>
                          {actionInfo && (
                            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border bg-slate-50 border-slate-200 ${actionInfo.color}`}>
                              {actionInfo.label}
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-brand text-sm truncate">{c.category}</h4>
                        <p className="text-xs text-slate-500 font-medium truncate">{refTitle} • {providerName}</p>
                      </div>

                      {/* Date & Expand */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs font-semibold text-slate-400 hidden sm:block">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </span>
                        <motion.span
                          animate={{ rotate: isExpanded ? 180 : 0 }}
                          className="material-symbols-outlined text-slate-400 text-[20px]"
                        >
                          expand_more
                        </motion.span>
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="px-5 md:px-6 pb-6 border-t border-slate-100 pt-5 space-y-5">
                            {/* Description */}
                            <div>
                              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description</p>
                              <p className="text-sm text-slate-700 font-medium leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                {c.description}
                              </p>
                            </div>

                            {/* Proof Image */}
                            {c.proofImage && (
                              <div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Proof Attached</p>
                                <img
                                  src={c.proofImage}
                                  alt="Proof"
                                  onClick={() => setLightboxImage(c.proofImage)}
                                  className="max-h-48 rounded-xl object-contain border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                                />
                              </div>
                            )}

                            {/* Admin Response */}
                            {c.adminResponse && (
                              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="material-symbols-outlined text-blue-500 text-[18px]">admin_panel_settings</span>
                                  <p className="text-[11px] font-bold text-blue-500 uppercase tracking-widest">Admin Response</p>
                                </div>
                                <p className="text-sm text-blue-800 font-medium leading-relaxed">{c.adminResponse}</p>
                              </div>
                            )}

                            {/* Admin Action */}
                            {actionInfo && (
                              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`material-symbols-outlined text-[18px] ${actionInfo.color}`}>{actionInfo.icon}</span>
                                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Action Taken</p>
                                </div>
                                <p className={`text-sm font-bold ${actionInfo.color}`}>{actionInfo.label}</p>
                              </div>
                            )}

                            {/* Status History Timeline */}
                            {c.statusHistory && c.statusHistory.length > 0 && (
                              <div>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Status Timeline</p>
                                <div className="relative pl-6 space-y-3">
                                  <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-slate-200" />
                                  {c.statusHistory.map((entry, i) => {
                                    const entryBadge = statusBadge(entry.status);
                                    return (
                                      <div key={i} className="relative flex items-start gap-3">
                                        <div className={`absolute left-[-15px] w-5 h-5 rounded-full flex items-center justify-center border-2 bg-white ${i === c.statusHistory.length - 1 ? 'border-brand' : 'border-slate-200'}`}>
                                          <div className={`w-2 h-2 rounded-full ${i === c.statusHistory.length - 1 ? 'bg-brand' : 'bg-slate-300'}`} />
                                        </div>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2">
                                            <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${entryBadge.bg} ${entryBadge.text} ${entryBadge.border}`}>
                                              {entry.status?.replace('_', ' ')}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-semibold">
                                              {new Date(entry.timestamp).toLocaleString()}
                                            </span>
                                          </div>
                                          {entry.note && <p className="text-xs text-slate-600 font-medium mt-1">{entry.note}</p>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Reopen Action */}
                            {['resolved', 'rejected'].includes(c.status) && c.reopenCount < 3 && (
                              <div className="pt-2">
                                {reopenId === c._id ? (
                                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
                                    <p className="text-sm font-bold text-orange-700">Why are you reopening this complaint?</p>
                                    <textarea
                                      value={reopenReason}
                                      onChange={(e) => setReopenReason(e.target.value)}
                                      className="input-field !rounded-xl !min-h-[80px] resize-none text-sm"
                                      placeholder="Explain why you feel this needs to be revisited..."
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleReopen(c._id)}
                                        disabled={submitting}
                                        className="btn-accent !py-2.5 !text-sm !rounded-xl disabled:opacity-50"
                                      >
                                        {submitting ? 'Reopening...' : 'Confirm Reopen'}
                                      </button>
                                      <button
                                        onClick={() => { setReopenId(null); setReopenReason(''); }}
                                        className="btn-secondary !py-2.5 !text-sm !rounded-xl"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                    <p className="text-[10px] text-orange-500 font-bold">Reopens remaining: {3 - c.reopenCount}</p>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setReopenId(c._id)}
                                    className="inline-flex items-center gap-2 text-orange-600 font-bold text-sm bg-orange-50 px-4 py-2.5 rounded-xl border border-orange-200 hover:bg-orange-100 transition-colors"
                                  >
                                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                                    Reopen Complaint ({3 - c.reopenCount} left)
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => fetchMyComplaints({ status: statusFilter, page: pagination.page - 1 })}
              className="w-9 h-9 flex items-center justify-center bg-surface rounded-lg hover:bg-slate-50 border border-slate-200 text-slate-400 transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).slice(
              Math.max(0, pagination.page - 3), Math.min(pagination.pages, pagination.page + 2)
            ).map((p) => (
              <button
                key={p}
                onClick={() => fetchMyComplaints({ status: statusFilter, page: p })}
                className={`w-9 h-9 flex items-center justify-center rounded-lg font-bold text-sm transition-colors ${p === pagination.page ? 'bg-brand text-white shadow-sm' : 'bg-surface text-slate-500 border border-slate-200 hover:bg-slate-50'}`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchMyComplaints({ status: statusFilter, page: pagination.page + 1 })}
              className="w-9 h-9 flex items-center justify-center bg-surface rounded-lg hover:bg-slate-50 border border-slate-200 text-slate-400 transition-colors disabled:opacity-40"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImage && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setLightboxImage(null)}
          >
            <motion.img
              initial={{ scale: 0.8 }} animate={{ scale: 1 }} exit={{ scale: 0.8 }}
              src={lightboxImage}
              alt="Proof"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
