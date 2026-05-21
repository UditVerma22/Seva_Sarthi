/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useComplaintStore } from '../store/useComplaintStore';
import { useAuthStore } from '../store/useAuthStore';

const SERVICE_CATEGORIES = [
  'Provider No Show', 'Poor Quality Work', 'Overcharging', 'Delayed Service',
  'Rude Behavior', 'Property Damage', 'Incomplete Work', 'Other',
];
const RENTAL_CATEGORIES = [
  'Damaged Tool Received', 'Wrong Tool Delivered', 'Late Delivery', 'Tool Malfunction',
  'Overcharged Deposit', 'Missing Parts', 'Return Not Processed', 'Other',
];

const statusColor = (s) => {
  const map = {
    pending: 'bg-amber-50 text-amber-600 border-amber-200',
    accepted: 'bg-blue-50 text-blue-600 border-blue-200',
    confirmed: 'bg-blue-50 text-blue-600 border-blue-200',
    en_route: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    working: 'bg-violet-50 text-violet-600 border-violet-200',
    completed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    cancelled: 'bg-red-50 text-red-600 border-red-200',
    delivered: 'bg-teal-50 text-teal-600 border-teal-200',
    returned: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return map[s] || 'bg-slate-50 text-slate-500 border-slate-200';
};

export default function RaiseComplaint() {
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { references, fetchReferences, createComplaint, submitting } = useComplaintStore();
  const fileInputRef = useRef(null);

  // Form state
  const [type, setType] = useState('');
  const [selectedRef, setSelectedRef] = useState(null);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [proofPreview, setProofPreview] = useState('');
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);

  useEffect(() => {
    fetchReferences();
  }, [fetchReferences]);

  const categories = type === 'service_booking' ? SERVICE_CATEGORIES : type === 'tool_rental' ? RENTAL_CATEGORIES : [];
  const refList = type === 'service_booking' ? (references.bookings || []) : type === 'tool_rental' ? (references.rentals || []) : [];

  const validate = () => {
    const errs = {};
    if (!type) errs.type = 'Please select a complaint type.';
    if (!selectedRef) errs.ref = `Please select a ${type === 'service_booking' ? 'booking' : 'rental'}.`;
    if (!category) errs.category = 'Please select a category.';
    if (!description || description.trim().length < 10) errs.description = 'Description must be at least 10 characters.';
    if (description.length > 1000) errs.description = 'Description cannot exceed 1000 characters.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setProofImage(reader.result);
      setProofPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      const payload = {
        type,
        category,
        description: description.trim(),
        proofImage,
      };
      if (type === 'service_booking') payload.bookingId = selectedRef._id;
      else payload.rentalId = selectedRef._id;

      const complaint = await createComplaint(payload);
      setCreatedTicket(complaint);
      setSubmitted(true);
      toast.success('Complaint submitted successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit complaint.');
    }
  };

  // Success screen
  if (submitted && createdTicket) {
    return (
      <div className="min-h-[calc(100vh-5rem)] bg-surface-muted flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="bg-surface rounded-[2rem] shadow-premium border border-slate-200/60 p-10 max-w-lg w-full text-center"
        >
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-emerald-600 text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
          </div>
          <h2 className="text-3xl font-extrabold font-headline text-brand mb-2">Complaint Submitted!</h2>
          <p className="text-slate-500 font-medium mb-6">Your complaint has been registered and will be reviewed by our team.</p>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-6">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ticket ID</p>
            <p className="text-2xl font-extrabold text-brand tracking-wider">{createdTicket.ticketId}</p>
          </div>

          <div className="flex gap-3">
            <Link to="/complaints" className="flex-1 btn-primary !rounded-xl">
              <span className="material-symbols-outlined text-[18px]">list_alt</span>
              My Complaints
            </Link>
            <Link to="/user/dashboard" className="flex-1 btn-secondary !rounded-xl">
              <span className="material-symbols-outlined text-[18px]">dashboard</span>
              Dashboard
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-surface-muted pb-24">
      {/* Header */}
      <header className="bg-brand pt-10 pb-14 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="section-container relative z-10">
          <Link to="/user/dashboard" className="inline-flex items-center gap-2 text-white/60 hover:text-white text-sm font-bold mb-4 transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back to Dashboard
          </Link>
          <h1 className="text-3xl md:text-4xl font-extrabold font-headline text-white tracking-tight">Raise a Complaint</h1>
          <p className="text-slate-300 font-medium mt-2">We take your concerns seriously. Please provide details below.</p>
        </div>
      </header>

      {/* Form */}
      <div className="section-container -mt-8 relative z-10">
        <form onSubmit={handleSubmit} className="bg-surface rounded-[2rem] shadow-card border border-slate-200/60 p-8 md:p-10 max-w-3xl mx-auto">

          {/* Step 1: Type Selection */}
          <div className="mb-8">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              1. Complaint Type <span className="text-red-400">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { value: 'service_booking', label: 'Service Booking', icon: 'home_repair_service', desc: 'Issues with booked services' },
                { value: 'tool_rental', label: 'Tool Rental', icon: 'construction', desc: 'Issues with rented tools' },
              ].map((opt) => (
                <motion.button
                  type="button" key={opt.value}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { setType(opt.value); setSelectedRef(null); setCategory(''); setErrors({}); }}
                  className={`p-5 rounded-2xl border-2 text-left transition-all ${type === opt.value
                    ? 'border-brand bg-brand/5 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${type === opt.value ? 'bg-brand text-white' : 'bg-slate-100 text-slate-400'}`}>
                      <span className="material-symbols-outlined text-[20px]">{opt.icon}</span>
                    </div>
                    <span className="font-bold text-brand">{opt.label}</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium ml-[52px]">{opt.desc}</p>
                </motion.button>
              ))}
            </div>
            {errors.type && <p className="text-red-500 text-xs font-bold mt-2">{errors.type}</p>}
          </div>

          {/* Step 2: Reference Selection */}
          <AnimatePresence>
            {type && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden"
              >
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  2. Select {type === 'service_booking' ? 'Booking' : 'Rental'} <span className="text-red-400">*</span>
                </label>
                {refList.length === 0 ? (
                  <div className="bg-slate-50 rounded-2xl p-6 text-center border border-slate-100">
                    <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">inbox</span>
                    <p className="text-slate-500 font-medium text-sm">No {type === 'service_booking' ? 'bookings' : 'rentals'} found.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                    {refList.map((item) => {
                      const isSelected = selectedRef?._id === item._id;
                      const title = type === 'service_booking'
                        ? (item.serviceName || 'Service Booking')
                        : (item.toolName || item.toolId?.name || 'Tool Rental');
                      const subtitle = type === 'service_booking'
                        ? `${new Date(item.scheduledDate).toLocaleDateString()} • ₹${item.totalAmount}`
                        : `${item.days} days • ₹${item.total}`;
                      const provider = type === 'service_booking'
                        ? (item.providerId?.userId?.name || '')
                        : '';

                      return (
                        <motion.button
                          type="button" key={item._id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => { setSelectedRef(item); setErrors((prev) => ({ ...prev, ref: undefined })); }}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${isSelected
                            ? 'border-brand bg-brand/5'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                        >
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-brand bg-brand' : 'border-slate-300'}`}>
                            {isSelected && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <p className="font-bold text-brand text-sm truncate">{title}</p>
                              <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${statusColor(item.status)}`}>
                                {item.status}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium">{subtitle}{provider ? ` • ${provider}` : ''}</p>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
                {errors.ref && <p className="text-red-500 text-xs font-bold mt-2">{errors.ref}</p>}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 3: Category */}
          <AnimatePresence>
            {type && selectedRef && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden"
              >
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  3. Complaint Category <span className="text-red-400">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => { setCategory(e.target.value); setErrors((prev) => ({ ...prev, category: undefined })); }}
                  className="input-field !rounded-xl"
                >
                  <option value="">Select a category...</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                {errors.category && <p className="text-red-500 text-xs font-bold mt-2">{errors.category}</p>}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 4: Description */}
          <AnimatePresence>
            {category && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden"
              >
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  4. Describe the Issue <span className="text-red-400">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => { setDescription(e.target.value); setErrors((prev) => ({ ...prev, description: undefined })); }}
                  className={`input-field !rounded-xl min-h-[140px] resize-none ${errors.description ? 'input-error' : ''}`}
                  placeholder="Please describe your issue in detail. What happened? When did it happen? What was expected?"
                  maxLength={1000}
                />
                <div className="flex justify-between mt-2">
                  {errors.description && <p className="text-red-500 text-xs font-bold">{errors.description}</p>}
                  <p className={`text-xs font-bold ml-auto ${description.length > 900 ? 'text-red-400' : 'text-slate-400'}`}>
                    {description.length}/1000
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step 5: Proof Image */}
          <AnimatePresence>
            {category && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden"
              >
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                  5. Upload Proof (Optional)
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files[0];
                    if (file) {
                      const fakeEvent = { target: { files: [file] } };
                      handleImageUpload(fakeEvent);
                    }
                  }}
                  className="border-2 border-dashed border-slate-200 rounded-2xl p-8 text-center cursor-pointer hover:border-brand/40 hover:bg-brand/5 transition-all group"
                >
                  {proofPreview ? (
                    <div className="relative inline-block">
                      <img src={proofPreview} alt="Proof" className="max-h-48 rounded-xl object-contain mx-auto shadow-sm" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setProofImage(''); setProofPreview(''); }}
                        className="absolute -top-2 -right-2 w-7 h-7 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-slate-300 text-5xl mb-3 group-hover:text-brand/40 transition-colors">cloud_upload</span>
                      <p className="text-sm font-bold text-slate-500">Drag & drop or click to upload</p>
                      <p className="text-xs text-slate-400 mt-1">PNG, JPG, WEBP — Max 5MB</p>
                    </>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit */}
          {category && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <button
                type="submit"
                disabled={submitting}
                className="w-full btn-accent !py-4 !rounded-xl shadow-premium text-lg disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">send</span>
                    Submit Complaint
                  </span>
                )}
              </button>
            </motion.div>
          )}
        </form>
      </div>
    </div>
  );
}
