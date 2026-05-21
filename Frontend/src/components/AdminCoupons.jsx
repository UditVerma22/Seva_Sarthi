/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import api from '../lib/axios';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  const [formData, setFormData] = useState({
    isBannerOnly: false,
    title: '',
    subtitle: '',
    imageUrl: '',
    targetUrl: '',
    showOnHome: false,
    userType: 'all',
    code: '',
    discountType: 'flat',
    discountValue: 0,
    minOrderAmount: 0,
    expiresAt: ''
  });

  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    try {
      const res = await api.get('/coupons/admin');
      if (res.success) {
        setCoupons(res.data);
      }
    } catch (error) {
      toast.error('Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.expiresAt) delete payload.expiresAt;
      
      const res = await api.post('/coupons/admin', payload);
      if (res.success) {
        toast.success('Created successfully');
        setShowForm(false);
        fetchCoupons();
        setFormData({
          isBannerOnly: false, title: '', subtitle: '', imageUrl: '', targetUrl: '', 
          showOnHome: false, userType: 'all', code: '', discountType: 'flat', 
          discountValue: 0, minOrderAmount: 0, expiresAt: ''
        });
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    try {
      const res = await api.delete(`/coupons/admin/${id}`);
      if (res.success) {
        toast.success('Deleted');
        fetchCoupons();
      }
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-brand">Offers & Coupons Management</h3>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="btn-primary !py-2 !px-4 !text-sm"
        >
          {showForm ? 'Cancel' : '+ Create New'}
        </button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-8"
          >
            <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
              <div className="flex gap-4 mb-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={!formData.isBannerOnly} onChange={() => setFormData({...formData, isBannerOnly: false})} />
                  <span className="text-sm font-bold text-slate-700">Discount Coupon</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={formData.isBannerOnly} onChange={() => setFormData({...formData, isBannerOnly: true})} />
                  <span className="text-sm font-bold text-slate-700">Promotional Banner (No code)</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Title (Required for Banners)</label>
                  <input type="text" className="input-field !py-2" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} placeholder="e.g. Sofa cleaning at ₹569" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Subtitle</label>
                  <input type="text" className="input-field !py-2" value={formData.subtitle} onChange={e=>setFormData({...formData, subtitle: e.target.value})} placeholder="e.g. Book now to save" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Image URL</label>
                  <input type="text" className="input-field !py-2" value={formData.imageUrl} onChange={e=>setFormData({...formData, imageUrl: e.target.value})} placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Target URL</label>
                  <input type="text" className="input-field !py-2" value={formData.targetUrl} onChange={e=>setFormData({...formData, targetUrl: e.target.value})} placeholder="/services?category=Cleaning" />
                </div>
                
                {!formData.isBannerOnly && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Coupon Code</label>
                      <input type="text" required className="input-field !py-2 uppercase" value={formData.code} onChange={e=>setFormData({...formData, code: e.target.value})} placeholder="e.g. SAVE50" />
                    </div>
                    <div className="flex gap-2">
                      <div className="w-1/3">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Type</label>
                        <select className="input-field !py-2" value={formData.discountType} onChange={e=>setFormData({...formData, discountType: e.target.value})}>
                          <option value="flat">Flat ₹</option>
                          <option value="percent">Percent %</option>
                        </select>
                      </div>
                      <div className="w-2/3">
                        <label className="block text-xs font-bold text-slate-500 mb-1">Value</label>
                        <input type="number" required className="input-field !py-2" value={formData.discountValue} onChange={e=>setFormData({...formData, discountValue: Number(e.target.value)})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Min Order Amount (₹)</label>
                      <input type="number" className="input-field !py-2" value={formData.minOrderAmount} onChange={e=>setFormData({...formData, minOrderAmount: Number(e.target.value)})} />
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Target Users</label>
                  <select className="input-field !py-2" value={formData.userType} onChange={e=>setFormData({...formData, userType: e.target.value})}>
                    <option value="all">All Users</option>
                    <option value="new">First-time Users Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Expiry Date (Optional)</label>
                  <input type="datetime-local" className="input-field !py-2" value={formData.expiresAt} onChange={e=>setFormData({...formData, expiresAt: e.target.value})} />
                </div>
              </div>

              <div className="flex items-center gap-2 mb-6 mt-4">
                <input type="checkbox" id="showOnHome" checked={formData.showOnHome} onChange={e=>setFormData({...formData, showOnHome: e.target.checked})} className="w-4 h-4 text-brand rounded focus:ring-brand accent-brand" />
                <label htmlFor="showOnHome" className="text-sm font-bold text-slate-700">Display on Home Page Carousel</label>
              </div>

              <button type="submit" className="btn-brand w-full !py-3">Save</button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {coupons.map(c => (
          <div key={c._id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleDelete(c._id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100">
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
            
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${c.isBannerOnly ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {c.isBannerOnly ? 'Banner' : 'Coupon'}
              </span>
              {c.showOnHome && <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-amber-50 text-amber-600">Home Carousel</span>}
              {c.userType === 'new' && <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-purple-50 text-purple-600">New Users</span>}
            </div>

            {c.title && <h4 className="font-extrabold text-brand text-sm line-clamp-1 mb-1">{c.title}</h4>}
            
            {!c.isBannerOnly && (
              <div className="bg-slate-50 border border-slate-200 border-dashed rounded-lg p-2 text-center my-3">
                <span className="font-mono font-bold text-lg text-brand tracking-wider">{c.code}</span>
              </div>
            )}
            
            {!c.isBannerOnly && (
              <p className="text-xs text-slate-500 font-semibold mb-2">
                Discount: {c.discountType === 'flat' ? `₹${c.discountValue}` : `${c.discountValue}%`} 
                {c.minOrderAmount > 0 ? ` (Min ₹${c.minOrderAmount})` : ''}
              </p>
            )}

            {c.imageUrl && (
              <div className="mt-3 h-20 w-full rounded-lg bg-slate-100 overflow-hidden relative border border-slate-200">
                <img src={c.imageUrl} alt="banner" className="w-full h-full object-cover" />
              </div>
            )}
          </div>
        ))}
        {coupons.length === 0 && !loading && (
          <div className="col-span-full text-center py-10 text-slate-500 font-medium">No offers or coupons created yet.</div>
        )}
      </div>
    </div>
  );
}
