/* eslint-disable no-unused-vars */
import React, { useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { DayPicker } from 'react-day-picker';
import { addDays, format, isSameDay, isWeekend, startOfToday } from 'date-fns';
import 'react-day-picker/dist/style.css';
import { useProviderStore } from '../store/useProviderStore';
import { useBookingStore } from '../store/useBookingStore';
import { useAuthStore } from '../store/useAuthStore';
import { useLanguageStore } from '../store/useLanguageStore';
import api from '../lib/axios';
import { openRazorpayCheckout } from '../lib/razorpay';

export default function BookingFlow() {
  const { t } = useLanguageStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState(undefined);
  const [selectedTime, setSelectedTime] = useState(null);
  const [address, setAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [photos, setPhotos] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [eligibleCoupons, setEligibleCoupons] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const { getProviderById } = useProviderStore();
  const { createBooking } = useBookingStore();
  const { currentUser } = useAuthStore();

  const providerId = location.state?.providerId || null;
  const serviceId = location.state?.serviceId;
  const serviceName = location.state?.serviceName;
  const stateBasePrice = location.state?.basePrice;

  const [provider, setProvider] = useState(null);
  const [isLoadingProvider, setIsLoadingProvider] = useState(true);

  React.useEffect(() => {
    const fetchPro = async () => {
      try {
        if (providerId) {
          const pro = await getProviderById(providerId);
          setProvider(pro);
        }
      } catch (err) {
        console.error('Failed to load provider', err);
      } finally {
        setIsLoadingProvider(false);
      }
    };
    fetchPro();
  }, [providerId, getProviderById]);

  React.useEffect(() => {
    if (step === 3) {
      const fetchCoupons = async () => {
        try {
          const res = await api.get('/coupons/eligible');
          if (res.success) {
            setEligibleCoupons(res.data);
          }
        } catch (err) {
          console.error('Failed to fetch eligible coupons');
        }
      };
      fetchCoupons();
    }
  }, [step]);

  const today = startOfToday();

  const disabledDays = useMemo(() => [{ before: today }], [today]);

  const [timeSlots, setTimeSlots] = useState(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  React.useEffect(() => {
    const fetchSlots = async () => {
      if (!selectedDate || !providerId) return;
      setIsLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const res = await api.get(`/providers/${providerId}/available-slots?date=${dateStr}`);
        if (res.success) {
          setTimeSlots(res.data);
        }
      } catch (error) {
        toast.error('Failed to load available slots');
        setTimeSlots(null);
      } finally {
        setIsLoadingSlots(false);
      }
    };
    fetchSlots();
  }, [selectedDate, providerId]);

  const handleNext = () => { if (step < 3) { setStep(step + 1); } };
  const handleBack = () => { if (step > 1) setStep(step - 1); };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (photos.length + files.length > 3) {
      toast.error('You can only upload up to 3 photos.');
      return;
    }
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleBooking = async () => {
    if (!selectedDate || !selectedTime || !address.trim() || !providerId || providerId === 1) {
      toast.error('Missing details or invalid provider.');
      return;
    }
    if (address.trim().length < 5) {
      toast.error('Address must be at least 5 characters.');
      return;
    }

    const bookingPayload = {
      providerId,
      serviceId,
      serviceName,
      scheduledDate: selectedDate?.toISOString(),
      scheduledTime: selectedTime,
      address,
      instructions,
      photos,
      paymentMethod,
      couponCode,
      baseRate,
      platformFee,
      discount: discountAmount,
      tax: taxes,
      totalAmount: total,
    };

    // ── Cash / Pay After Service flow ─────────────────────────
    if (paymentMethod === 'cash_after_service') {
      toast.loading('Processing your booking...', { id: 'BOOKING' });
      try {
        await createBooking(bookingPayload);
        setStep(4);
        toast.success('Booking confirmed successfully!', { id: 'BOOKING' });
        setTimeout(() => navigate('/user/dashboard'), 2500);
      } catch (error) {
        toast.error(error?.response?.data?.message || 'Failed to create booking', { id: 'BOOKING' });
      }
      return;
    }

    // ── Online Payment (Razorpay) flow ────────────────────────
    setIsProcessingPayment(true);
    toast.loading('Initiating payment...', { id: 'BOOKING' });

    openRazorpayCheckout({
      amount: total,
      type: 'booking',
      payload: bookingPayload,
      user: {
        name: currentUser?.name || '',
        email: currentUser?.email || '',
        phone: currentUser?.phone || '',
      },
      metadata: { serviceName, providerId },
      onSuccess: (booking) => {
        setIsProcessingPayment(false);
        setStep(4);
        toast.success('Payment successful! Booking confirmed.', { id: 'BOOKING' });
        setTimeout(() => navigate('/user/dashboard'), 2500);
      },
      onError: (errorMsg) => {
        setIsProcessingPayment(false);
        toast.error(errorMsg || 'Payment failed. Please try again.', { id: 'BOOKING' });
      },
    });
  };

  const handleApplyCoupon = async (codeToApply = couponCode) => {
    if (!codeToApply.trim()) return;
    setIsApplyingCoupon(true);
    
    try {
      const res = await api.post('/coupons/validate', {
        code: codeToApply,
        orderAmount: baseRate + platformFee
      });
      if (res.success) {
        setAppliedCoupon({
          code: res.data.code,
          discount: res.data.discount,
          type: 'amount' // the backend already calculates the flat discount value
        });
        setCouponCode(res.data.code);
        toast.success(`Coupon applied! ₹${res.data.discount} off.`);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid or expired coupon code.');
      setAppliedCoupon(null);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    toast('Coupon removed', { icon: '🗑️' });
  };

  // Cost Breakdown Logic
  const baseRate = stateBasePrice || provider?.pricePerHour || 0;
  const platformFee = 50.00;
  const taxRate = 0.05; // 5% GST
  
  let discountAmount = 0;
  if (appliedCoupon) {
    discountAmount = appliedCoupon.discount;
  }

  const subtotal = baseRate + platformFee - discountAmount;
  const taxes = subtotal * taxRate;
  const total = subtotal + taxes;

  const selectedDateLabel = selectedDate ? format(selectedDate, 'EEE, dd MMM yyyy') : '';

  const stepAnim = { 
    initial: { opacity: 0, y: 15 }, 
    animate: { opacity: 1, y: 0 }, 
    exit: { opacity: 0, y: -15 }, 
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } 
  };

  const proName = provider?.user?.name || "Professional";
  const proAvatar = provider?.user?.avatar || `https://ui-avatars.com/api/?name=${proName}&background=0D8B8B&color=fff`;

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-surface-muted pt-8 pb-20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[80px] -z-10 translate-x-1/2 -translate-y-1/2" />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Progress Tracker */}
        <div className="flex items-center justify-center mb-12 max-w-lg mx-auto">
          {[1, 2, 3].map((num) => (
            <React.Fragment key={num}>
              <div className={`flex flex-col items-center flex-1 transition-opacity duration-300 ${step >= num ? 'opacity-100' : 'opacity-50'}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm mb-2.5 transition-all duration-300 shadow-sm ${step === num ? 'bg-brand text-surface scale-110 shadow-premium' : step > num ? 'bg-accent text-brand' : 'bg-surface border border-slate-200 text-slate-400'}`}>
                  {step > num ? <span className="material-symbols-outlined text-base font-bold">check</span> : num}
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${step >= num ? 'text-brand' : 'text-slate-400'}`}>{num === 1 ? t('book_step_schedule') : num === 2 ? t('book_step_details') : t('book_step_payment')}</span>
              </div>
              {num < 3 && (
                <div className="h-1 flex-1 mx-2 -mt-7 bg-surface border border-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full bg-accent transition-all duration-500 ${step > num ? 'w-full' : 'w-0'}`} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className={`${step === 3 ? 'lg:col-span-8' : 'lg:col-span-12 max-w-4xl mx-auto w-full'} min-h-[500px]`}>
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="s1" {...stepAnim} className="space-y-6">
                  <div>
                    <h1 className="section-heading !text-3xl">{t('book_step_schedule')}</h1>
                    <p className="section-subheading !mt-1 !text-base">{t('book_choose_date')}</p>
                  </div>
                  <div className="card p-6 md:p-8">
                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="md:flex-1">
                        <h3 className="font-bold text-lg text-brand mb-5">{t('book_choose_date')}</h3>
                        <div className="rounded-2xl border border-slate-200/60 bg-surface shadow-sm p-4 flex justify-center">
                          <DayPicker mode="single" selected={selectedDate} onSelect={(d) => { setSelectedDate(d); setSelectedTime(null); }} fromMonth={today} disabled={disabledDays} showOutsideDays className="font-medium custom-daypicker" />
                        </div>
                        {selectedDate && (
                          <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} className="mt-5 flex items-center gap-2 text-sm font-bold text-accent-dark bg-accent/10 border border-accent/20 px-4 py-3 rounded-xl">
                            <span className="material-symbols-outlined text-base">event</span>{selectedDateLabel}
                          </motion.div>
                        )}
                      </div>
                      <div className="md:flex-1">
                        <h3 className="font-bold text-lg text-brand mb-5">{t('book_select_time')}</h3>
                        {!selectedDate ? (
                          <div className="h-[300px] flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed border-slate-200 bg-surface/50 text-center">
                            <span className="material-symbols-outlined text-slate-300 text-5xl mb-3">schedule</span>
                            <p className="text-slate-500 font-semibold text-sm">{t('book_choose_date')}</p>
                          </div>
                        ) : isLoadingSlots ? (
                          <div className="h-[200px] flex flex-col items-center justify-center p-8 text-slate-400">
                            <span className="material-symbols-outlined animate-spin text-3xl mb-2">progress_activity</span>
                            <p className="font-bold text-sm">Finding available slots...</p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {(!timeSlots?.morning?.length && !timeSlots?.afternoon?.length && !timeSlots?.evening?.length) ? (
                              <div className="h-[200px] flex flex-col items-center justify-center p-6 rounded-2xl border border-rose-100 bg-rose-50 text-center">
                                <span className="material-symbols-outlined text-rose-300 text-4xl mb-2">event_busy</span>
                                <p className="text-rose-600 font-bold text-sm">{t('book_no_slots')}</p>
                                <p className="text-rose-500 font-medium text-xs mt-1">{t('book_try_tomorrow')}</p>
                              </div>
                            ) : (
                              Object.entries(timeSlots || {}).map(([period, slots]) => {
                                if (slots.length === 0) return null;
                                return (
                                  <div key={period}>
                                    <div className="flex items-center gap-2 mb-3">
                                      <span className="material-symbols-outlined text-brand text-xl">{period === 'morning' ? 'light_mode' : period === 'afternoon' ? 'sunny' : 'dark_mode'}</span>
                                      <h4 className="font-bold text-[11px] tracking-widest uppercase text-slate-400">{period === 'morning' ? t('book_morning') : period === 'afternoon' ? t('book_afternoon') : t('book_evening')}</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                      {slots.map(time => (
                                        <button key={time} onClick={() => setSelectedTime(time)}
                                          className={`py-3 px-3 rounded-xl font-bold text-sm transition-all border-2 ${selectedTime === time ? 'bg-brand border-brand text-surface shadow-sm' : 'bg-surface border-slate-200 text-slate-500 hover:border-brand/40 hover:text-brand'}`}>
                                          {time}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end pt-4">
                    <button onClick={handleNext} disabled={!selectedDate || !selectedTime} className="btn-primary !px-8 disabled:opacity-50 disabled:cursor-not-allowed">
                      {t('book_next')} <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="s2" {...stepAnim} className="space-y-6">
                  <div>
                    <h1 className="section-heading !text-3xl">{t('book_step_details')}</h1>
                    <p className="section-subheading !mt-1 !text-base">{t('book_address')}</p>
                  </div>
                  <div className="card p-6 md:p-8 space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t('book_address')}</label>
                        {currentUser?.address?.line1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const a = currentUser.address;
                              const parts = [a.line1, a.line2, a.landmark, a.city, a.pincode].filter(Boolean);
                              setAddress(parts.join(', '));
                              toast.success('Saved address applied!');
                            }}
                            className="text-xs font-bold text-brand hover:text-accent transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[14px]">home</span>
                            {t('book_address')}
                          </button>
                        )}
                      </div>
                      <textarea value={address} onChange={(e) => setAddress(e.target.value)} className="input-field min-h-[120px] resize-none" placeholder={t('book_address_placeholder')} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">{t('book_instructions')}</label>
                      <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} className="input-field min-h-[100px] resize-none" placeholder={t('book_instructions_placeholder')} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest">{t('book_photos')} ({t('book_photos_hint')})</label>
                      <div className="flex flex-wrap gap-4">
                        {photos.map((photo, idx) => (
                          <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                            <img src={photo} alt={`Upload ${idx+1}`} className="w-full h-full object-cover" />
                            <button onClick={() => removePhoto(idx)} className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm shadow-sm hover:bg-red-600 transition-colors">✕</button>
                          </div>
                        ))}
                        {photos.length < 3 && (
                          <label className="w-24 h-24 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-brand hover:bg-slate-50 transition-colors text-slate-400 hover:text-brand">
                            <span className="material-symbols-outlined text-2xl mb-1">add_photo_alternate</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest mt-1">{t('book_upload')}</span>
                            <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4">
                    <button onClick={handleBack} className="text-slate-500 font-bold px-4 py-3 hover:text-brand transition-colors flex items-center gap-1"><span className="material-symbols-outlined text-lg">arrow_back</span> {t('book_back')}</button>
                    <button onClick={handleNext} disabled={!address.trim()} className="btn-primary !px-8 disabled:opacity-50 disabled:cursor-not-allowed">
                      {t('book_next')} <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="s3" {...stepAnim} className="space-y-6">
                  <div>
                    <h1 className="section-heading !text-3xl">{t('book_step_payment')}</h1>
                    <p className="section-subheading !mt-1 !text-base">{t('book_summary')}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Summary Cards */}
                    <div className="flex items-start gap-4 p-5 bg-surface border border-slate-200/80 rounded-2xl shadow-sm">
                      <div className="w-12 h-12 bg-accent/10 text-accent-dark rounded-xl flex items-center justify-center flex-shrink-0"><span className="material-symbols-outlined text-[24px]">event_available</span></div>
                      <div>
                        <h4 className="font-bold text-brand mb-1">{t('book_step_schedule')}</h4>
                        <p className="text-slate-500 text-sm font-medium">{selectedDateLabel}<br/>at {selectedTime}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-5 bg-surface border border-slate-200/80 rounded-2xl shadow-sm">
                      <div className="w-12 h-12 bg-brand/5 text-brand rounded-xl flex items-center justify-center flex-shrink-0"><span className="material-symbols-outlined text-[24px]">location_on</span></div>
                      <div>
                        <h4 className="font-bold text-brand mb-1">{t('nav_location')}</h4>
                        <p className="text-slate-500 text-sm font-medium line-clamp-2">{address}</p>
                      </div>
                    </div>
                  </div>

                  {/* Coupons Section (Moved to Main Column) */}
                  <div className="card p-6 md:p-8">
                    <h4 className="font-bold text-brand mb-4 text-lg">{t('book_offers_coupons')}</h4>
                    {!appliedCoupon ? (
                      <div className="flex gap-2 max-w-md">
                        <input 
                          type="text" 
                          placeholder={t('book_coupon_placeholder')} 
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                          className="flex-1 px-4 py-3 bg-surface border-2 border-slate-200 rounded-xl text-brand font-bold focus:border-accent focus:outline-none placeholder-slate-400"
                        />
                        <button 
                          onClick={handleApplyCoupon}
                          disabled={!couponCode || isApplyingCoupon}
                          className="bg-brand text-surface px-6 py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-brand-light transition-colors"
                        >
                          {isApplyingCoupon ? '...' : t('book_apply')}
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-100 rounded-xl max-w-md">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-emerald-600 text-2xl">local_offer</span>
                          <div>
                            <p className="font-bold text-emerald-800">{appliedCoupon.code}</p>
                            <p className="text-xs font-semibold text-emerald-600">{t('book_coupon_applied')}</p>
                          </div>
                        </div>
                        <button onClick={removeCoupon} className="text-emerald-700 hover:text-red-500 transition-colors p-2 bg-emerald-100/50 rounded-full">
                          <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                      </div>
                    )}
                    
                    {/* Eligible Coupons List */}
                    {!appliedCoupon && eligibleCoupons.length > 0 && (
                      <div className="mt-6 space-y-3">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('book_available_offers')}</p>
                        <div className="grid gap-3">
                          {eligibleCoupons.map((coupon) => (
                            <div key={coupon._id} onClick={() => handleApplyCoupon(coupon.code)} 
                              className="group flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-slate-50 border border-slate-200/80 rounded-xl cursor-pointer hover:border-brand hover:shadow-sm transition-all">
                              <div className="flex items-start gap-3">
                                <div className="w-10 h-10 bg-brand/5 text-brand rounded-xl flex items-center justify-center border border-brand/10 shrink-0 group-hover:bg-brand group-hover:text-white transition-colors">
                                  <span className="material-symbols-outlined text-[20px]">sell</span>
                                </div>
                                <div>
                                  <p className="font-bold text-brand">{coupon.title || 'Special Discount'}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">{coupon.subtitle || coupon.description || `Get ${coupon.discountType === 'flat' ? '₹' : ''}${coupon.discountValue}${coupon.discountType === 'percent' ? '%' : ''} off on this booking`}</p>
                                  {coupon.minOrderAmount > 0 && (
                                    <p className="text-[10px] font-semibold text-slate-400 mt-1">Min. order ₹{coupon.minOrderAmount}</p>
                                  )}
                                </div>
                              </div>
                              <div className="mt-3 md:mt-0 ml-12 md:ml-0 flex flex-row items-center gap-2">
                                <span className="bg-slate-200/50 text-slate-600 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border border-slate-300/50 border-dashed">
                                  {coupon.code}
                                </span>
                                <button className="text-xs font-bold text-brand bg-white border border-slate-200 px-3 py-1.5 rounded-lg group-hover:bg-brand group-hover:text-white group-hover:border-brand transition-colors">
                                  {t('book_apply')}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Payment Method */}
                  <div className="card p-6 md:p-8">
                    <h4 className="font-bold text-brand mb-4 text-lg">{t('book_step_payment')}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <label onClick={() => setPaymentMethod('online')} className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer relative overflow-hidden transition-all shadow-sm ${paymentMethod === 'online' ? 'border-accent bg-accent/5' : 'border-slate-200 hover:border-slate-300 bg-surface'}`}>
                        <input type="radio" name="payment" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} className="accent-accent-dark w-4 h-4 z-10" />
                        <span className={`font-bold text-sm flex items-center gap-2 z-10 ${paymentMethod === 'online' ? 'text-brand' : 'text-slate-500'}`}><span className={`material-symbols-outlined text-xl ${paymentMethod === 'online' ? 'text-accent-dark' : 'text-slate-400'}`}>credit_card</span>{t('book_online_payment')}</span>
                        {paymentMethod === 'online' && <img src="https://cdn.razorpay.com/static/assets/logo/payment.svg" alt="Razorpay" className="absolute bottom-2 right-3 h-4 opacity-50" onError={(e) => e.target.style.display = 'none'} />}
                      </label>
                      <label onClick={() => setPaymentMethod('cash_after_service')} className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-all ${paymentMethod === 'cash_after_service' ? 'border-accent bg-accent/5' : 'border-slate-200 hover:border-slate-300 bg-surface'}`}>
                        <input type="radio" name="payment" checked={paymentMethod === 'cash_after_service'} onChange={() => setPaymentMethod('cash_after_service')} className="accent-brand w-4 h-4" />
                        <span className={`font-bold text-sm flex items-center gap-2 ${paymentMethod === 'cash_after_service' ? 'text-brand' : 'text-slate-500'}`}><span className={`material-symbols-outlined text-xl ${paymentMethod === 'cash_after_service' ? 'text-accent-dark' : 'text-slate-400'}`}>payments</span>{t('book_pay_after_service')}</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-4">
                    <button onClick={handleBack} className="text-slate-500 font-bold px-4 py-3 hover:text-brand transition-colors flex items-center gap-1"><span className="material-symbols-outlined text-lg">arrow_back</span> {t('book_back')}</button>
                    <button onClick={handleBooking} disabled={isProcessingPayment} className="btn-accent !px-8 !py-4 shadow-premium disabled:opacity-60 disabled:cursor-wait">
                      {isProcessingPayment ? (
                        <><span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span> {t('book_processing')}</>
                      ) : paymentMethod === 'online' ? (
                        <><span className="material-symbols-outlined text-[20px]">lock</span> {t('book_pay_now')} ₹{total.toFixed(2)}</>
                      ) : (
                        <>{t('book_confirm')} <span className="material-symbols-outlined text-[22px]">verified</span></>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {step === 4 && (
                <motion.div key="s4" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', bounce: 0.5, duration: 0.6 }}
                  className="card flex flex-col items-center justify-center text-center p-16 min-h-[500px]">
                  <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                    <span className="material-symbols-outlined text-6xl text-emerald-500">task_alt</span>
                  </div>
                  <h1 className="text-4xl font-extrabold font-headline text-brand mb-4">{t('book_success')}</h1>
                  <p className="text-slate-500 font-medium text-lg">{t('book_processing')}</p>
                  <p className="text-slate-400 mt-6 text-sm flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                    {t('loading')}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Business Model & Cost Sidebar */}
          {step === 3 && (
            <aside className="lg:col-span-4 lg:sticky lg:top-28">
              <div className="card p-6 border-slate-200/60 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-brand"></div>
              
              {/* Provider Info */}
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6 mt-2">
                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-slate-200 flex-shrink-0 shadow-sm">
                  <img alt="Provider" className="w-full h-full object-cover" src={proAvatar} />
                </div>
                <div>
                  <h3 className="font-extrabold text-brand text-lg">{proName}</h3>
                  <p className="text-sm text-slate-500 font-semibold">{serviceName || provider?.title || "Service Professional"}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-slate-600 bg-slate-50 inline-flex px-2 py-1 rounded-md border border-slate-100">
                    <span className="material-symbols-outlined text-accent text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> {provider?.rating || 0} ({provider?.jobsCompleted || 0} jobs)
                  </div>
                </div>
              </div>
              {/* Coupons removed from sidebar to prevent users from missing them */}              {/* Cost Breakdown */}
              <div className="space-y-3 text-sm font-medium">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">info</span> {t('book_base_price')}</span>
                  <span className="font-bold text-brand">₹{baseRate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">{t('book_platform_fee')}</span>
                  <span className="font-bold text-brand">₹{platformFee.toFixed(2)}</span>
                </div>
                
                {appliedCoupon && (
                  <motion.div initial={{opacity:0, x:-10}} animate={{opacity:1, x:0}} className="flex justify-between items-center text-emerald-600">
                    <span>{t('book_discount')} ({appliedCoupon.code})</span>
                    <span className="font-bold">-₹{discountAmount.toFixed(2)}</span>
                  </motion.div>
                )}

                <div className="flex justify-between items-center text-slate-400 border-t border-slate-100 pt-3">
                  <span>{t('book_taxes')}</span>
                  <span className="font-bold text-brand">₹{taxes.toFixed(2)}</span>
                </div>
                
                <div className="pt-4 border-t-2 border-slate-100 mt-2">
                  <div className="flex justify-between items-end">
                    <span className="font-bold text-brand uppercase tracking-wider text-sm">{t('book_total')}</span>
                    <span className="text-3xl font-extrabold text-brand tracking-tight">₹{total.toFixed(2)}</span>
                  </div>
                  <p className="text-right text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1.5">{t('book_final_amount')}</p>
                </div>
              </div>

              {/* Trust Badge */}
              <div className="mt-6 bg-surface-muted border border-slate-200/60 p-4 rounded-xl flex gap-3 items-center">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-slate-100">
                  <span className="material-symbols-outlined text-brand text-xl" style={{fontVariationSettings:"'FILL' 1"}}>shield</span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                  {t('book_seva_guarantee')}
                </p>
              </div>
              </div>
            </aside>
          )}
        </div>
      </main>
      
      {/* Custom styles for DayPicker to match premium theme */}
      <style>{`
        .custom-daypicker {
          --rdp-cell-size: 40px;
          --rdp-accent-color: #0F172A; /* brand */
          --rdp-background-color: #F8FAFC;
          --rdp-accent-color-dark: #1E293B;
          --rdp-background-color-dark: #020617;
          --rdp-outline: 2px solid var(--rdp-accent-color);
          --rdp-outline-selected: 2px solid var(--rdp-accent-color);
        }
        .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover {
          color: white;
          background-color: var(--rdp-accent-color);
          font-weight: bold;
          border-radius: 8px;
        }
        .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
          background-color: #F1F5F9;
          border-radius: 8px;
        }
        .rdp-day_today {
          font-weight: bold;
          color: #F5A623;
        }
      `}</style>
    </div>
  );
}
