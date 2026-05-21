/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useComplaintStore } from '../store/useComplaintStore';

const STATUS_OPTIONS = ['pending','in_review','resolved','rejected','escalated','reopened'];
const ACTIONS = [
  { value:'warning_issued', label:'Warning', icon:'warning', color:'amber', fields:['reason'] },
  { value:'refund_initiated', label:'Refund', icon:'payments', color:'emerald', fields:['amount'] },
  { value:'free_reservice', label:'Free Re-Service', icon:'home_repair_service', color:'blue', fields:[] },
  { value:'trust_score_reduced', label:'Reduce Trust', icon:'trending_down', color:'orange', fields:['amount'] },
  { value:'temporary_suspension', label:'Suspend', icon:'block', color:'red', fields:['days'] },
  { value:'permanent_ban', label:'Permanent Ban', icon:'gavel', color:'red', fields:[] },
  { value:'penalty_applied', label:'Penalty', icon:'receipt_long', color:'rose', fields:['amount','reason'] },
];

const badgeColor = (s) => {
  const m = { pending:'bg-amber-50 text-amber-600 border-amber-200', in_review:'bg-blue-50 text-blue-600 border-blue-200',
    resolved:'bg-emerald-50 text-emerald-600 border-emerald-200', rejected:'bg-red-50 text-red-600 border-red-200',
    escalated:'bg-purple-50 text-purple-600 border-purple-200', reopened:'bg-orange-50 text-orange-600 border-orange-200' };
  return m[s] || 'bg-slate-50 text-slate-500 border-slate-200';
};

export default function AdminComplaints() {
  const { adminComplaints, adminStats, adminPagination, loading, submitting,
    fetchAdminComplaints, updateComplaintStatus, takeAdminAction, fetchAdminComplaintById, currentComplaint, clearCurrent } = useComplaintStore();

  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [statusInput, setStatusInput] = useState('');
  const [responseInput, setResponseInput] = useState('');
  const [actionModal, setActionModal] = useState(null);
  const [actionInputs, setActionInputs] = useState({});
  const [lightbox, setLightbox] = useState(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAdminComplaints({ status: statusFilter, type: typeFilter, search }); }, [statusFilter, typeFilter]);

  const handleSearch = () => fetchAdminComplaints({ status: statusFilter, type: typeFilter, search });

  const openDetail = async (id) => {
    setSelectedId(id);
    await fetchAdminComplaintById(id);
  };

  const handleStatusUpdate = async () => {
    if (!statusInput) return toast.error('Select a status');
    try {
      await updateComplaintStatus(selectedId, statusInput, responseInput);
      toast.success('Status updated');
      setSelectedId(null); setStatusInput(''); setResponseInput('');
      fetchAdminComplaints({ status: statusFilter, type: typeFilter, search });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    try {
      await takeAdminAction(selectedId, actionModal.value, actionInputs);
      toast.success(`Action "${actionModal.label}" applied`);
      setActionModal(null); setActionInputs({});
      fetchAdminComplaints({ status: statusFilter, type: typeFilter, search });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const c = currentComplaint;

  return (
    <section className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Pending', val: adminStats.pendingCount||0, color:'amber' },
          { label:'In Review', val: adminStats.inReviewCount||0, color:'blue' },
          { label:'Resolved', val: adminStats.resolvedCount||0, color:'emerald' },
          { label:'Escalated', val: adminStats.escalatedCount||0, color:'purple' },
        ].map(s=>(
          <div key={s.label} className={`bg-${s.color}-50 border border-${s.color}-200 rounded-2xl p-4 text-center`}>
            <p className={`text-2xl font-extrabold text-${s.color}-600`}>{s.val}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-surface rounded-2xl p-5 border border-slate-200/60 shadow-card flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleSearch()}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-brand focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none placeholder:text-slate-400" placeholder="Search ticket ID, category..." />
        </div>
        <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-surface text-brand text-sm font-bold rounded-xl border border-slate-200 shadow-sm">
          <option value="">All Status</option>
          {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s.replace('_',' ').toUpperCase()}</option>)}
        </select>
        <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)}
          className="px-4 py-2.5 bg-surface text-brand text-sm font-bold rounded-xl border border-slate-200 shadow-sm">
          <option value="">All Types</option>
          <option value="service_booking">Service</option>
          <option value="tool_rental">Rental</option>
        </select>
        <button onClick={handleSearch} className="btn-primary !py-2.5 !text-sm !rounded-xl">Search</button>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-2xl shadow-card border border-slate-200/60 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center"><svg className="animate-spin h-8 w-8 text-brand mx-auto" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg></div>
        ) : adminComplaints.length === 0 ? (
          <div className="p-12 text-center"><span className="material-symbols-outlined text-slate-200 text-5xl mb-2">inbox</span><p className="text-slate-500 font-bold">No complaints found</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  {['Ticket','User','Type','Category','Status','Date',''].map((h,i)=>(
                    <th key={i} className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 ${i===0?'rounded-tl-xl':''} ${i===6?'rounded-tr-xl':''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adminComplaints.map(comp=>(
                  <tr key={comp._id} className="hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={()=>openDetail(comp._id)}>
                    <td className="px-4 py-3 text-xs font-bold text-brand">{comp.ticketId}</td>
                    <td className="px-4 py-3"><p className="text-sm font-bold text-brand">{comp.userId?.name||'User'}</p><p className="text-[11px] text-slate-500">{comp.userId?.email}</p></td>
                    <td className="px-4 py-3"><span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border bg-slate-50 text-slate-600 border-slate-200">{comp.type==='service_booking'?'Service':'Rental'}</span></td>
                    <td className="px-4 py-3 text-xs font-semibold text-slate-600">{comp.category}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ${badgeColor(comp.status)}`}>{comp.status?.replace('_',' ')}</span></td>
                    <td className="px-4 py-3 text-xs text-slate-500 font-semibold">{new Date(comp.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><button className="w-8 h-8 rounded-lg flex items-center justify-center bg-brand/5 text-brand hover:bg-brand/10 transition-colors"><span className="material-symbols-outlined text-[16px]">open_in_new</span></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        {adminPagination.pages>1&&(
          <div className="p-4 border-t border-slate-100 flex justify-between items-center">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Page {adminPagination.page} of {adminPagination.pages}</p>
            <div className="flex gap-2">
              <button disabled={adminPagination.page<=1} onClick={()=>fetchAdminComplaints({status:statusFilter,type:typeFilter,search,page:adminPagination.page-1})} className="w-8 h-8 flex items-center justify-center bg-surface rounded-lg border border-slate-200 text-slate-400 disabled:opacity-40"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
              <span className="w-8 h-8 flex items-center justify-center bg-brand text-surface font-bold rounded-lg shadow-sm">{adminPagination.page}</span>
              <button disabled={adminPagination.page>=adminPagination.pages} onClick={()=>fetchAdminComplaints({status:statusFilter,type:typeFilter,search,page:adminPagination.page+1})} className="w-8 h-8 flex items-center justify-center bg-surface rounded-lg border border-slate-200 text-slate-400 disabled:opacity-40"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedId && c && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-start justify-center bg-brand/40 backdrop-blur-sm px-4 pt-10 pb-10 overflow-y-auto">
            <motion.div initial={{scale:0.95,y:20}} animate={{scale:1,y:0}} exit={{scale:0.95,y:20}} className="bg-surface w-full max-w-2xl rounded-[2rem] shadow-premium border border-slate-200/50 relative" onClick={e=>e.stopPropagation()}>
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 tracking-widest mb-1">{c.ticketId}</p>
                  <h3 className="text-xl font-extrabold font-headline text-brand">{c.category}</h3>
                  <p className="text-sm text-slate-500 font-medium mt-1">{c.userId?.name} • {c.type==='service_booking'?'Service Booking':'Tool Rental'}</p>
                </div>
                <button onClick={()=>{setSelectedId(null);clearCurrent();}} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"><span className="material-symbols-outlined text-[18px] text-slate-500">close</span></button>
              </div>

              <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
                {/* Status */}
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-md border ${badgeColor(c.status)}`}>{c.status?.replace('_',' ')}</span>
                  {c.adminAction&&<span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-md border bg-slate-100 text-slate-600 border-slate-200">{c.adminAction.replace('_',' ')}</span>}
                </div>

                {/* Description */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Description</p>
                  <p className="text-sm text-slate-700 leading-relaxed">{c.description}</p>
                </div>

                {/* Proof */}
                {c.proofImage&&(
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Proof Image</p>
                    <img src={c.proofImage} alt="Proof" onClick={()=>setLightbox(c.proofImage)} className="max-h-48 rounded-xl object-contain border border-slate-200 cursor-pointer hover:opacity-90 shadow-sm"/>
                  </div>
                )}

                {/* Reference Info */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">{c.type==='service_booking'?'Booking':'Rental'} Details</p>
                  {c.type==='service_booking'&&c.bookingId&&(
                    <div className="text-sm text-slate-700"><p><b>Service:</b> {c.bookingId.serviceName||'N/A'}</p><p><b>Amount:</b> ₹{c.bookingId.totalAmount}</p><p><b>Status:</b> {c.bookingId.status}</p></div>
                  )}
                  {c.type==='tool_rental'&&c.rentalId&&(
                    <div className="text-sm text-slate-700"><p><b>Tool:</b> {c.rentalId.toolName||'N/A'}</p><p><b>Amount:</b> ₹{c.rentalId.total}</p><p><b>Duration:</b> {c.rentalId.days} days</p></div>
                  )}
                </div>

                {/* Provider Info */}
                {c.providerId&&(
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Provider</p>
                    <p className="text-sm font-bold text-brand">{c.providerId?.userId?.name||'Provider'}</p>
                    <p className="text-xs text-slate-500">{c.providerId?.userId?.email}</p>
                    <div className="flex gap-4 mt-2 text-xs text-slate-500">
                      <span>Trust: <b className="text-brand">{c.providerId?.trustScore??100}</b></span>
                      <span>Warnings: <b className="text-amber-600">{c.providerId?.warnings?.length||0}</b></span>
                      <span>Suspended: <b className={c.providerId?.isSuspended?'text-red-600':'text-emerald-600'}>{c.providerId?.isSuspended?'Yes':'No'}</b></span>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                {c.statusHistory?.length>0&&(
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Timeline</p>
                    <div className="relative pl-6 space-y-2">
                      <div className="absolute left-[9px] top-1 bottom-1 w-0.5 bg-slate-200"/>
                      {c.statusHistory.map((e,i)=>(
                        <div key={i} className="relative flex items-start gap-3">
                          <div className={`absolute left-[-15px] w-4 h-4 rounded-full border-2 bg-white ${i===c.statusHistory.length-1?'border-brand':'border-slate-200'}`}/>
                          <div>
                            <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${badgeColor(e.status)}`}>{e.status?.replace('_',' ')}</span>
                            <span className="text-[10px] text-slate-400 ml-2">{new Date(e.timestamp).toLocaleString()}</span>
                            {e.note&&<p className="text-xs text-slate-600 mt-0.5">{e.note}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Update Status */}
                <div className="border-t border-slate-100 pt-5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Update Status</p>
                  <div className="flex gap-3 mb-3">
                    <select value={statusInput} onChange={e=>setStatusInput(e.target.value)} className="flex-1 px-4 py-2.5 bg-surface text-brand text-sm font-bold rounded-xl border border-slate-200">
                      <option value="">Select status...</option>
                      {STATUS_OPTIONS.map(s=><option key={s} value={s}>{s.replace('_',' ').toUpperCase()}</option>)}
                    </select>
                    <button onClick={handleStatusUpdate} disabled={submitting} className="btn-primary !py-2.5 !text-sm !rounded-xl disabled:opacity-50">{submitting?'Saving...':'Update'}</button>
                  </div>
                  <textarea value={responseInput} onChange={e=>setResponseInput(e.target.value)} className="input-field !rounded-xl !min-h-[80px] resize-none text-sm" placeholder="Admin response to the customer (optional)..."/>
                </div>

                {/* Admin Actions */}
                <div className="border-t border-slate-100 pt-5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Take Action Against Provider</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ACTIONS.map(a=>(
                      <button key={a.value} onClick={()=>{setActionModal(a);setActionInputs({});}}
                        className={`p-3 rounded-xl border text-left hover:shadow-sm transition-all bg-${a.color}-50 border-${a.color}-200 hover:bg-${a.color}-100`}>
                        <span className={`material-symbols-outlined text-${a.color}-600 text-[18px]`}>{a.icon}</span>
                        <p className={`text-[11px] font-bold text-${a.color}-700 mt-1`}>{a.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Confirmation Modal */}
      <AnimatePresence>
        {actionModal&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4">
            <motion.div initial={{scale:0.9}} animate={{scale:1}} exit={{scale:0.9}} className="bg-surface w-full max-w-md rounded-2xl p-6 shadow-premium">
              <h4 className="text-lg font-extrabold text-brand mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined">{actionModal.icon}</span>{actionModal.label}
              </h4>
              <p className="text-sm text-slate-500 mb-4">This action will be applied to the provider. Are you sure?</p>
              {actionModal.fields.includes('amount')&&(
                <div className="mb-3"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">{actionModal.value==='refund_initiated'?'Refund Amount (₹)':actionModal.value==='trust_score_reduced'?'Points to Reduce':'Penalty Amount (₹)'}</label>
                <input type="number" value={actionInputs.amount||''} onChange={e=>setActionInputs(p=>({...p,amount:Number(e.target.value)}))} className="input-field !rounded-xl" placeholder="Enter amount..."/></div>
              )}
              {actionModal.fields.includes('days')&&(
                <div className="mb-3"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Suspension Days</label>
                <input type="number" value={actionInputs.days||''} onChange={e=>setActionInputs(p=>({...p,days:Number(e.target.value)}))} className="input-field !rounded-xl" placeholder="e.g. 7"/></div>
              )}
              {actionModal.fields.includes('reason')&&(
                <div className="mb-3"><label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Reason</label>
                <input value={actionInputs.reason||''} onChange={e=>setActionInputs(p=>({...p,reason:e.target.value}))} className="input-field !rounded-xl" placeholder="Reason..."/></div>
              )}
              <div className="flex gap-3 mt-5">
                <button onClick={()=>setActionModal(null)} className="flex-1 btn-secondary !py-2.5 !rounded-xl">Cancel</button>
                <button onClick={handleAction} disabled={submitting} className="flex-1 btn-accent !py-2.5 !rounded-xl disabled:opacity-50">{submitting?'Applying...':'Confirm'}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4" onClick={()=>setLightbox(null)}>
            <img src={lightbox} alt="Proof" className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl" onClick={e=>e.stopPropagation()}/>
            <button onClick={()=>setLightbox(null)} className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white"><span className="material-symbols-outlined">close</span></button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
