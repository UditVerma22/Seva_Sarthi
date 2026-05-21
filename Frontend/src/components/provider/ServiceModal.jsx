/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { compressImageFile } from '../../lib/imageUpload';

const SERVICE_CATEGORIES = [
  'Home Maintenance','Professional Cleaning','Electrical Works',
  'Gardening & Landscaping','Plumbing','Pest Control',
  'Painting','Carpentry','Appliance Repair','Personal Care',
];
const ICONS = [
  'home_repair_service','cleaning_services','electrical_services',
  'yard','plumbing','pest_control','format_paint',
  'handyman','build','spa',
];

const slideVariants = {
  enter: (direction) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction) => ({ x: direction < 0 ? 50 : -50, opacity: 0 })
};

export default function ServiceModal({ onClose, onSuccess, editData }) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState(SERVICE_CATEGORIES[0]);
  const [basePrice, setBasePrice] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState(ICONS[0]);
  const [image, setImage] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  useEffect(() => {
    if (editData) {
      setName(editData.name || '');
      setCategory(editData.category || SERVICE_CATEGORIES[0]);
      setBasePrice(String(editData.basePrice || ''));
      setDescription(editData.description || '');
      setIcon(editData.icon || ICONS[0]);
      setImage(editData.image || '');
      if (editData.workingHours) {
        setStartTime(editData.workingHours.start || '09:00');
        setEndTime(editData.workingHours.end || '18:00');
      }
    }
  }, [editData]);

  const handleNext = () => {
    if (step === 1 && !name.trim()) return toast.error("Service Name is required");
    if (step === 2 && (!basePrice || isNaN(basePrice))) return toast.error("Valid Base Price is required");
    
    setDirection(1);
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setDirection(-1);
    setStep(s => s - 1);
  };

  const handleImageChange = async (file) => {
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, { maxWidth: 1200, maxHeight: 1200, quality: 0.8 });
      setImage(compressed);
    } catch (err) {
      toast.error(err.message || 'Failed to process image.');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !basePrice) return toast.error("Please fill all required fields");
    
    setSaving(true);
    const toastId = 'SVC_SAVE';
    toast.loading(editData ? 'Updating...' : 'Publishing...', { id: toastId });
    
    try {
      const payload = { 
        name, category, basePrice: Number(basePrice), description, icon, image,
        workingHours: { start: startTime, end: endTime }
      };
      
      if (editData) {
        await api.put(`/services/${editData._id}`, payload);
        toast.success('Service updated successfully!', { id: toastId });
      } else {
        await api.post('/services', payload);
        toast.success('Service published live!', { id: toastId });
      }
      
      if (onSuccess) onSuccess();
      setTimeout(() => onClose(), 800);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save', { id: toastId });
    }
    setSaving(false);
  };

  const steps = [
    { num: 1, title: 'Basics' },
    { num: 2, title: 'Details' },
    { num: 3, title: 'Media' },
    { num: 4, title: 'Review' }
  ];

  return (
    <AnimatePresence>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}
        className="fixed inset-0 bg-brand-dark/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
        <motion.div onClick={e=>e.stopPropagation()} initial={{opacity:0,scale:0.95,y:20}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.95,y:20}}
          className="bg-surface rounded-3xl w-full max-w-3xl shadow-2xl border border-slate-200/50 overflow-hidden relative my-8 flex flex-col h-[650px]">
          
          {/* Header & Progress */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-100 bg-white z-10 flex-shrink-0">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-extrabold font-headline text-brand tracking-tight">{editData ? 'Edit Service' : 'Add New Service'}</h2>
                <p className="text-slate-500 font-medium mt-1">Offer your expertise to thousands of customers.</p>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-rose-500 transition-colors">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            
            <div className="flex justify-between items-center relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-slate-100 rounded-full" />
              <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-teal-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${((step - 1) / 3) * 100}%` }} />
              
              {steps.map(s => (
                <div key={s.num} className={`relative z-10 flex flex-col items-center gap-2 bg-white px-2`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-2 ${step >= s.num ? 'border-teal-500 bg-teal-500 text-white shadow-md' : 'border-slate-200 bg-white text-slate-400'}`}>
                    {step > s.num ? <span className="material-symbols-outlined text-[16px]">check</span> : s.num}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider absolute -bottom-5 whitespace-nowrap ${step >= s.num ? 'text-teal-700' : 'text-slate-400'}`}>{s.title}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Form Content Area */}
          <div className="p-8 overflow-y-auto flex-grow bg-slate-50/50">
            <AnimatePresence custom={direction} mode="wait">
              <motion.div key={step} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{duration:0.3, ease:"easeInOut"}} className="h-full">
                
                {/* STEP 1: BASICS */}
                {step === 1 && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><span className="material-symbols-outlined text-teal-600">info</span> Basic Information</h3>
                    
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Service Name <span className="text-rose-500">*</span></label>
                      <input type="text" className="input-field !text-lg !py-4 shadow-sm" placeholder="e.g. Premium Home Deep Cleaning" value={name} onChange={e=>setName(e.target.value)} autoFocus />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Category <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <select className="input-field appearance-none !py-4 shadow-sm cursor-pointer pr-10" value={category} onChange={e=>setCategory(e.target.value)}>
                            {SERVICE_CATEGORIES.map(c=><option key={c}>{c}</option>)}
                          </select>
                          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Service Icon</label>
                        <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                          <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="material-symbols-outlined text-teal-600 text-2xl">{icon}</span>
                          </div>
                          <select className="input-field !border-none !shadow-none !px-0 bg-transparent cursor-pointer" value={icon} onChange={e=>setIcon(e.target.value)}>
                            {ICONS.map(ic=><option key={ic} value={ic}>{ic.replace(/_/g, ' ')}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: DETAILS */}
                {step === 2 && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><span className="material-symbols-outlined text-teal-600">payments</span> Pricing & Availability</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Base Price (₹) <span className="text-rose-500">*</span></label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-slate-400 text-lg">₹</span>
                          <input type="number" min="50" className="input-field !pl-10 !text-xl !font-bold !text-teal-700" placeholder="500" value={basePrice} onChange={e=>setBasePrice(e.target.value)} autoFocus />
                        </div>
                        <p className="text-xs font-medium text-slate-400 mt-2">Starting price visible to customers.</p>
                      </div>

                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Working Hours</label>
                        <div className="flex items-center gap-2">
                          <input type="time" className="input-field !py-2.5 cursor-pointer text-center" value={startTime} onChange={e=>setStartTime(e.target.value)} />
                          <span className="font-bold text-slate-400">to</span>
                          <input type="time" className="input-field !py-2.5 cursor-pointer text-center" value={endTime} onChange={e=>setEndTime(e.target.value)} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-end mb-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Description</label>
                        <span className={`text-xs font-bold ${description.length > 500 ? 'text-rose-500' : 'text-slate-400'}`}>{description.length}/500</span>
                      </div>
                      <textarea rows="4" maxLength="500" className="input-field resize-none shadow-sm leading-relaxed" placeholder="Highlight what's included, materials used, and your expertise..." value={description} onChange={e=>setDescription(e.target.value)} />
                    </div>
                  </div>
                )}

                {/* STEP 3: MEDIA */}
                {step === 3 && (
                  <div className="space-y-6 h-full flex flex-col">
                    <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-teal-600">perm_media</span> Service Image</h3>
                    <p className="text-slate-500 text-sm mb-4">High-quality images attract 3x more bookings. Upload a photo of your past work or your team.</p>
                    
                    {!image ? (
                      <div 
                        className={`flex-grow border-2 border-dashed rounded-3xl flex flex-col items-center justify-center p-8 transition-all ${dragActive ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-white hover:bg-slate-50'}`}
                        onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                      >
                        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 transition-colors ${dragActive ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-400'}`}>
                          <span className="material-symbols-outlined text-4xl">cloud_upload</span>
                        </div>
                        <h4 className="text-lg font-bold text-slate-700 mb-2">Drag & drop image here</h4>
                        <p className="text-slate-400 text-sm font-medium mb-6">JPEG, PNG up to 5MB</p>
                        
                        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e.target.files[0])} />
                        <button type="button" onClick={() => inputRef.current?.click()} className="btn-secondary !px-6 !rounded-full">
                          Browse Files
                        </button>
                      </div>
                    ) : (
                      <div className="flex-grow flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-200 p-6 relative group overflow-hidden">
                        <img src={image} alt="Preview" className="w-full h-full max-h-64 object-contain rounded-xl" />
                        <div className="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm">
                          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e.target.files[0])} />
                          <button type="button" onClick={() => inputRef.current?.click()} className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-700 hover:bg-teal-50 hover:text-teal-600 transition-colors shadow-lg">
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button type="button" onClick={() => setImage('')} className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-lg">
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* STEP 4: REVIEW */}
                {step === 4 && (
                  <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><span className="material-symbols-outlined text-teal-600">visibility</span> Live Preview</h3>
                    
                    <div className="flex justify-center items-center py-4">
                      {/* Premium Card Preview */}
                      <div className="w-[320px] bg-white rounded-2xl overflow-hidden shadow-xl border border-slate-200 hover:scale-[1.02] transition-transform duration-300">
                        <div className="relative h-44 bg-slate-100">
                          {image ? (
                            <img src={image} className="w-full h-full object-cover" alt="Service" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-300"><span className="material-symbols-outlined text-5xl">image</span></div>
                          )}
                          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 bg-white/95 backdrop-blur px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                            <span className="material-symbols-outlined text-teal-600 text-sm">{icon}</span>
                            <span className="text-[10px] font-extrabold text-slate-700 uppercase tracking-wider">{category}</span>
                          </div>
                        </div>
                        
                        <div className="p-5 flex flex-col h-full">
                          <h3 className="text-lg font-extrabold text-slate-900 leading-tight mb-2 line-clamp-2">{name || 'Service Name'}</h3>
                          <p className="text-sm text-slate-500 font-medium line-clamp-2 mb-4 flex-grow">{description || 'No description provided.'}</p>
                          
                          <div className="flex items-end justify-between pt-4 border-t border-slate-100">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Starting at</span>
                              <span className="text-xl font-black text-teal-600 leading-none">₹{basePrice || '0'}</span>
                            </div>
                            <div className="bg-teal-50 text-teal-700 px-4 py-2 rounded-xl text-xs font-bold border border-teal-100">
                              Book Now
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-blue-700">
                      <span className="material-symbols-outlined shrink-0 text-blue-500">info</span>
                      <p className="text-sm font-medium">This is how your service will appear to customers. Make sure the image is clear and the description highlights your expertise.</p>
                    </div>
                  </div>
                )}
                
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Controls */}
          <div className="p-6 border-t border-slate-100 bg-white z-10 flex justify-between items-center flex-shrink-0">
            {step > 1 ? (
              <button type="button" onClick={handleBack} disabled={saving} className="btn-secondary !px-6 !py-3 flex items-center gap-2 text-sm disabled:opacity-50">
                <span className="material-symbols-outlined text-[18px]">arrow_back</span> Back
              </button>
            ) : <div />}
            
            {step < 4 ? (
              <button type="button" onClick={handleNext} className="bg-slate-900 text-white hover:bg-slate-800 font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 active:scale-95">
                Next <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={saving} className="btn-accent !px-8 !py-3 flex items-center gap-2 text-base shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-70 disabled:cursor-wait">
                {saving ? <><span className="material-symbols-outlined animate-spin">refresh</span> Publishing...</> : <><span className="material-symbols-outlined">rocket_launch</span> Publish Live</>}
              </button>
            )}
          </div>
          
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
