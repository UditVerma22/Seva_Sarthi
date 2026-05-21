/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { validateEmail, validatePassword, validatePhone, validateName, validatePincode, validateCity, validateAddress, cleanPhone, digitsOnly } from '../lib/validators';

const SERVICE_CATEGORIES = [
  { id: 'Home Maintenance', icon: 'home_repair_service' },
  { id: 'Professional Cleaning', icon: 'cleaning_services' },
  { id: 'Electrical Works', icon: 'electrical_services' },
  { id: 'Plumbing', icon: 'plumbing' },
  { id: 'Painting', icon: 'format_paint' },
  { id: 'Carpentry', icon: 'carpenter' },
  { id: 'Appliance Repair', icon: 'kitchen' },
];

export default function ProviderAuthentication() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);

  // --- LOGIN FIELDS ---
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // --- FORGOT PASSWORD STATE ---
  const [forgotMode, setForgotMode] = useState(null); // null | 'email' | 'otp' | 'reset'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotDevOtp, setForgotDevOtp] = useState('');
  const [forgotResetToken, setForgotResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // --- SIGN UP WIZARD STATE ---
  const [step, setStep] = useState(1);
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const [devOtp, setDevOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);

  // Step 1: Basic
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');

  // Step 2: Business
  const [businessType, setBusinessType] = useState('individual'); // individual | shop | agency
  const [businessName, setBusinessName] = useState('');
  const [experience, setExperience] = useState('1 yr');
  const [city, setCity] = useState('');
  const [fullAddress, setFullAddress] = useState('');
  const [pincode, setPincode] = useState('');

  // Step 3: Documents (Base64)
  const [idProofType, setIdProofType] = useState('aadhar');
  const [idProof, setIdProof] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');

  // Step 4: Primary Service
  const [primaryCategory, setPrimaryCategory] = useState('');

  const { login, register, sendProviderOtp, verifyProviderOtp, forgotPassword, verifyOtp, resetPassword } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (password) {
      const result = validatePassword(password);
      setPasswordStrength(result.strength);
    } else setPasswordStrength(0);
  }, [password]);

  const getStrengthColor = () => passwordStrength < 40 ? 'bg-red-400' : passwordStrength < 70 ? 'bg-amber-400' : 'bg-emerald-500';

  // --- LOGIN HANDLER ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrors({}); setIsLoading(true);
    const user = await login(loginEmail, loginPassword);
    setIsLoading(false);
    
    if (user && user.role === 'provider') {
      if (user.providerStatus === 'approved') {
        navigate('/provider/dashboard');
      } else {
        navigate('/provider/onboarding-status');
      }
    } else if (user) {
      setErrors({ global: 'This portal is for Service Providers only.' });
      useAuthStore.getState().logout();
    } else {
      setErrors({ global: useAuthStore.getState().error || 'Login failed' });
    }
  };

  // --- FORGOT PASSWORD HANDLERS ---
  const handleForgotSendOtp = async (e) => {
    e.preventDefault();
    if (!forgotEmail) { setErrors({ global: 'Email is required' }); return; }
    setIsLoading(true); setErrors({});
    const res = await forgotPassword(forgotEmail);
    setIsLoading(false);
    if (res) {
      setForgotMode('otp');
      if (res.data?.devOtp) {
        setForgotDevOtp(res.data.devOtp);
        setForgotOtp(res.data.devOtp);
        setErrors({ globalSuccess: 'Dev mode: SMTP not configured. Your OTP is shown below.' });
      } else {
        setForgotDevOtp('');
        setErrors({ globalSuccess: 'OTP sent to your email address.' });
      }
    } else {
      setErrors({ global: useAuthStore.getState().error || 'Failed to send OTP.' });
    }
  };

  const handleForgotVerifyOtp = async (e) => {
    e.preventDefault();
    if (!forgotOtp || forgotOtp.length !== 6) { setErrors({ global: 'Enter a valid 6-digit OTP' }); return; }
    setIsLoading(true); setErrors({});
    const data = await verifyOtp(forgotEmail, forgotOtp);
    setIsLoading(false);
    if (data?.resetToken) {
      setForgotResetToken(data.resetToken);
      setForgotMode('reset');
      setErrors({ globalSuccess: 'OTP verified! Set your new password.' });
    } else {
      setErrors({ global: useAuthStore.getState().error || 'Invalid OTP.' });
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { setErrors({ global: 'Password must be at least 6 characters' }); return; }
    if (newPassword !== confirmPassword) { setErrors({ global: 'Passwords do not match' }); return; }
    setIsLoading(true); setErrors({});
    const res = await resetPassword(forgotEmail, forgotResetToken, newPassword);
    setIsLoading(false);
    if (res) {
      setForgotMode(null); setForgotDevOtp('');
      setErrors({ globalSuccess: 'Password reset successfully! You can now log in.' });
      setNewPassword(''); setConfirmPassword(''); setForgotOtp('');
    } else {
      setErrors({ global: useAuthStore.getState().error || 'Reset failed.' });
    }
  };

  // --- WIZARD HANDLERS ---
  const handleSendOtp = async () => {
    if (!email) { toast.error("Email required"); return; }
    const ev = validateEmail(email);
    if (!ev.valid) { toast.error(ev.error); return; }
    setIsLoading(true);
    const res = await sendProviderOtp(email);
    setIsLoading(false);
    if (res?.success) {
      setOtpSent(true);
      setDevOtp(res.data.devOtp); // Dev mode
      toast.success("OTP Sent! (Check dev console or use autofilled OTP)");
    } else {
      toast.error(useAuthStore.getState().error || "Failed to send OTP");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp) return;
    setIsLoading(true);
    const res = await verifyProviderOtp(email, otp);
    setIsLoading(false);
    if (res?.verified) {
      setOtpVerified(true);
      toast.success("Email verified successfully");
    } else {
      toast.error("Invalid OTP");
    }
  };

  const handleFileUpload = (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setter(reader.result);
    reader.readAsDataURL(file);
  };

  const validateStep = (currentStep) => {
    let errs = {};
    if (currentStep === 1) {
      const nv = validateName(name);
      if (!nv.valid) errs.name = nv.error;
      const pv = validatePhone(phone);
      if (!pv.valid) errs.phone = pv.error;
      const pwv = validatePassword(password);
      if (!pwv.valid) errs.password = pwv.error;
      if (!otpVerified) errs.otp = 'Please verify email first';
    }
    if (currentStep === 2) {
      if (businessType !== 'individual' && !businessName) errs.businessName = 'Business name is required';
      const cv = validateCity(city);
      if (!cv.valid) errs.city = cv.error;
      const av = validateAddress(fullAddress, true, 10);
      if (!av.valid) errs.fullAddress = av.error;
      const pcv = validatePincode(pincode);
      if (!pcv.valid) errs.pincode = pcv.error;
    }
    if (currentStep === 3) {
      if (!idProof) errs.idProof = 'ID proof is required';
      if (!profilePhoto) errs.profilePhoto = 'Profile/Shop photo is required';
    }
    if (currentStep === 4) {
      if (!primaryCategory) errs.primaryCategory = 'Select a primary category';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => { if (validateStep(step)) setStep(step + 1); };
  const prevStep = () => setStep(step - 1);

  const handleFinalSubmit = async () => {
    if (!validateStep(4)) return;
    setIsLoading(true); setErrors({});

    const payload = {
      role: 'provider',
      name, email, phone, password,
      businessType, businessName, experience, city, fullAddress, pincode,
      primaryCategory,
      documents: { idProofType, idProof, profilePhoto }
    };

    const user = await register(payload);
    setIsLoading(false);

    if (user) {
      setRegistrationComplete(true);
    } else {
      toast.error(useAuthStore.getState().error || 'Registration failed');
    }
  };

  if (registrationComplete) {
    return (
      <div className="min-h-screen bg-surface-muted flex flex-col items-center justify-center p-4">
        <div className="bg-surface p-10 rounded-3xl shadow-premium max-w-md w-full text-center border border-slate-200">
          <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-100">
            <span className="material-symbols-outlined text-emerald-500 text-4xl">check_circle</span>
          </div>
          <h2 className="text-3xl font-extrabold text-brand mb-4 font-headline">Application Submitted!</h2>
          <p className="text-slate-500 font-medium mb-8 leading-relaxed">
            Thank you for joining Seva Sarthi. Our admin team will review your professional profile and documents.
            You will be notified once approved (usually within 24 hours).
          </p>
          <button onClick={() => navigate('/provider/onboarding-status')} className="btn-accent w-full py-4 text-lg">
            Check Status
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-muted flex flex-col lg:flex-row relative overflow-hidden">
      {/* Left side brand banner */}
      <div className="hidden lg:flex lg:w-5/12 bg-brand p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] bg-accent/20 rounded-full blur-[100px]" />
        
        <div className="relative z-10">
          <div className="mb-8">
            <Link to="/">
              <img src="/favicon.svg" alt="Seva Sarthi Icon" className="w-16 h-16 drop-shadow-xl hover:scale-105 transition-transform" />
            </Link>
          </div>
          <h1 className="text-5xl font-extrabold text-white font-headline leading-tight tracking-tight mb-6">
            Grow your<br/><span className="text-accent">Service Business</span>
          </h1>
          <p className="text-white/80 text-lg font-medium max-w-md leading-relaxed">
            Join thousands of trusted professionals on Seva Sarthi. Get more customers, manage bookings, and increase your earnings.
          </p>
        </div>

        <div className="relative z-10">
          <div className="flex gap-4">
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
              <span className="text-accent text-3xl font-black block mb-1">2x</span>
              <span className="text-white/70 text-sm font-semibold uppercase tracking-wider">Earnings</span>
            </div>
            <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
              <span className="text-accent text-3xl font-black block mb-1">0%</span>
              <span className="text-white/70 text-sm font-semibold uppercase tracking-wider">Commission</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side forms */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative z-10 min-h-screen overflow-y-auto">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {!isSignUp ? (
              <motion.div key="login" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-surface rounded-3xl p-8 sm:p-10 shadow-premium border border-slate-200/60">

                {/* ── Forgot Password Flow ── */}
                {forgotMode ? (
                  <div>
                    <div className="text-center mb-8">
                      <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                        <span className="material-symbols-outlined text-surface text-3xl">lock_reset</span>
                      </div>
                      <h2 className="text-2xl font-extrabold text-brand font-headline tracking-tight mb-2">
                        {forgotMode === 'email' ? 'Forgot Password?' : forgotMode === 'otp' ? 'Enter OTP' : 'Set New Password'}
                      </h2>
                      <p className="text-slate-500 font-medium text-sm">
                        {forgotMode === 'email' ? "Enter your provider email to receive an OTP." : forgotMode === 'otp' ? "Check your email for the verification code." : "Create a strong new password."}
                      </p>
                    </div>

                    <AnimatePresence>
                      {errors.global && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold border border-red-100 flex items-center gap-2"><span className="material-symbols-outlined">error</span>{errors.global}</motion.div>}
                      {errors.globalSuccess && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="mb-4 bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl text-sm font-semibold border border-emerald-100 flex items-center gap-2"><span className="material-symbols-outlined">check_circle</span>{errors.globalSuccess}</motion.div>}
                    </AnimatePresence>

                    {forgotMode === 'email' && (
                      <form onSubmit={handleForgotSendOtp} className="space-y-5">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Email</label>
                          <input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className="input-field" placeholder="name@example.com" type="email" />
                        </div>
                        <button disabled={isLoading} className={`w-full btn-accent !py-4 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-wait' : ''}`} type="submit">
                          {isLoading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <>Send OTP <span className="material-symbols-outlined text-xl">send</span></>}
                        </button>
                      </form>
                    )}

                    {forgotMode === 'otp' && (
                      <form onSubmit={handleForgotVerifyOtp} className="space-y-5">
                        {forgotDevOtp && (
                          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-center">
                            <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">⚠ Dev Mode — SMTP Not Configured</p>
                            <p className="text-amber-800 font-bold text-sm">Your OTP:</p>
                            <span className="text-3xl font-black tracking-[0.5em] text-amber-900 font-mono">{forgotDevOtp}</span>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">6-Digit OTP</label>
                          <input value={forgotOtp} onChange={e => setForgotOtp(e.target.value.replace(/\D/g,'').slice(0,6))} className="input-field text-center text-2xl tracking-[0.5em] font-extrabold" placeholder="• • • • • •" maxLength={6} />
                        </div>
                        <button disabled={isLoading} className={`w-full btn-accent !py-4 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-wait' : ''}`} type="submit">
                          {isLoading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <>Verify OTP <span className="material-symbols-outlined text-xl">verified</span></>}
                        </button>
                        <button type="button" onClick={() => { setForgotMode('email'); setForgotOtp(''); setForgotDevOtp(''); setErrors({}); }} className="w-full text-sm font-bold text-slate-500 hover:text-brand">Resend OTP</button>
                      </form>
                    )}

                    {forgotMode === 'reset' && (
                      <form onSubmit={handleResetPassword} className="space-y-5">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">New Password</label>
                          <input value={newPassword} onChange={e => setNewPassword(e.target.value)} className="input-field" placeholder="Min 6 characters" type="password" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Confirm Password</label>
                          <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="input-field" placeholder="Re-enter password" type="password" />
                        </div>
                        <button disabled={isLoading} className={`w-full btn-accent !py-4 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-wait' : ''}`} type="submit">
                          {isLoading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <>Reset Password <span className="material-symbols-outlined text-xl">lock_open</span></>}
                        </button>
                      </form>
                    )}

                    <div className="mt-6 text-center">
                      <button type="button" onClick={() => { setForgotMode(null); setErrors({}); }} className="text-sm font-bold text-brand hover:text-accent-dark">← Back to Login</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* ── Normal Login Form ── */}
                    <div className="text-center mb-10">
                      <h2 className="text-3xl font-extrabold text-brand font-headline tracking-tight mb-2">Provider Portal</h2>
                      <p className="text-slate-500 font-medium">Log in to manage your bookings and services.</p>
                    </div>

                    {errors.global && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-2 mb-6"><span className="material-symbols-outlined">error</span>{errors.global}</div>}
                    {errors.globalSuccess && <div className="bg-emerald-50 text-emerald-600 p-4 rounded-xl text-sm font-bold border border-emerald-100 flex items-center gap-2 mb-6"><span className="material-symbols-outlined">check_circle</span>{errors.globalSuccess}</div>}

                    <form onSubmit={handleLogin} className="space-y-5">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Email</label>
                        <input type="email" required className="input-field" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="name@example.com" />
                      </div>
                      <div>
                        <div className="flex justify-between items-end mb-1.5 ml-1">
                          <label className="block text-sm font-bold text-slate-700">Password</label>
                          <button type="button" onClick={() => { setForgotMode('email'); setForgotEmail(loginEmail); setErrors({}); }} className="text-xs font-bold text-brand hover:text-accent transition-colors">Forgot Password?</button>
                        </div>
                        <input type="password" required className="input-field" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} placeholder="••••••••" />
                      </div>

                      <button type="submit" disabled={isLoading} className="w-full btn-accent !py-4 text-lg mt-4 disabled:opacity-70 disabled:cursor-not-allowed">
                        {isLoading ? <span className="material-symbols-outlined animate-spin">refresh</span> : 'Log In to Dashboard'}
                      </button>
                    </form>

                    <div className="mt-8 text-center pt-6 border-t border-slate-100">
                      <p className="text-slate-500 font-medium">
                        New to Seva Sarthi? <button onClick={() => { setIsSignUp(true); setErrors({}); }} className="text-brand font-extrabold hover:text-accent-dark hover:underline transition-all">Apply as Provider</button>
                      </p>
                    </div>
                  </>
                )}
              </motion.div>

            ) : (

              <motion.div key="signup" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="bg-surface rounded-3xl p-8 sm:p-10 shadow-premium border border-slate-200/60">
                <div className="mb-8">
                  <button onClick={() => { setIsSignUp(false); setStep(1); }} className="flex items-center gap-1.5 text-sm font-bold text-slate-400 hover:text-brand mb-6 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">arrow_back</span>Back to Login
                  </button>
                  <h2 className="text-3xl font-extrabold text-brand font-headline tracking-tight">Partner Application</h2>
                  <p className="text-slate-500 font-medium mt-2">Join our network of professionals in 4 easy steps.</p>
                </div>

                {/* Progress Bar */}
                <div className="flex justify-between items-center mb-10 relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1.5 bg-slate-100 rounded-full" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1.5 bg-brand rounded-full transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }} />
                  
                  {[1, 2, 3, 4].map(num => (
                    <div key={num} className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 border-4 bg-surface ${step >= num ? 'border-brand text-brand' : 'border-slate-100 text-slate-400'}`}>
                      {step > num ? <span className="material-symbols-outlined text-[18px]">check</span> : num}
                    </div>
                  ))}
                </div>

                {/* --- WIZARD STEPS --- */}
                <div className="min-h-[400px]">
                  {/* Step 1: Account */}
                  {step === 1 && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-5">
                      <h3 className="text-xl font-extrabold text-brand mb-4">Account Details</h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Full Name</label>
                          <input type="text" className={`input-field ${errors.name ? 'input-error' : ''}`} value={name} onChange={e=>setName(e.target.value)} placeholder="Ramesh Kumar" />
                          {errors.name && <p className="text-xs text-red-500 font-bold mt-1 ml-1">{errors.name}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Phone Number</label>
                          <input type="tel" className={`input-field ${errors.phone ? 'input-error' : ''}`} value={phone} onChange={e=>setPhone(e.target.value)} placeholder="9876543210" maxLength={10} />
                          {errors.phone && <p className="text-xs text-red-500 font-bold mt-1 ml-1">{errors.phone}</p>}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Email Address</label>
                        <div className="flex gap-2">
                          <input type="email" disabled={otpVerified} className={`input-field flex-1 ${otpVerified ? 'bg-slate-50 text-slate-500 border-slate-200' : ''}`} value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" />
                          {!otpVerified ? (
                            <button onClick={handleSendOtp} disabled={isLoading || !email} className="btn-secondary !px-4 whitespace-nowrap">
                              {otpSent ? 'Resend' : 'Send OTP'}
                            </button>
                          ) : (
                            <button onClick={() => { setOtpVerified(false); setOtpSent(false); setOtp(''); }} type="button" className="btn-secondary !px-4 whitespace-nowrap text-xs">
                              Change
                            </button>
                          )}
                        </div>
                        {otpSent && !otpVerified && (
                          <div className="mt-3 flex gap-2">
                            <input type="text" className="input-field flex-1" placeholder="Enter OTP" value={otp} onChange={e=>setOtp(e.target.value)} maxLength={6} />
                            <button onClick={handleVerifyOtp} disabled={isLoading} className="btn-accent !px-6">Verify</button>
                          </div>
                        )}
                        {devOtp && !otpVerified && <p className="text-xs text-blue-600 font-bold mt-2 ml-1">Dev mode: OTP is {devOtp}</p>}
                        {errors.otp && <p className="text-xs text-red-500 font-bold mt-1 ml-1">{errors.otp}</p>}
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Password</label>
                        <input type="password" className={`input-field ${errors.password ? 'input-error' : ''}`} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" />
                        <div className="mt-2 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-300 ${getStrengthColor()}`} style={{width:`${passwordStrength}%`}}/>
                        </div>
                        {errors.password && <p className="text-xs text-red-500 font-bold mt-1 ml-1">{errors.password}</p>}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 2: Business Profile */}
                  {step === 2 && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-5">
                      <h3 className="text-xl font-extrabold text-brand mb-4">Business Details</h3>
                      
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-3 ml-1">I am registering as an:</label>
                        <div className="grid grid-cols-3 gap-3">
                          {['individual', 'shop', 'agency'].map(type => (
                            <div key={type} onClick={()=>setBusinessType(type)} className={`cursor-pointer border-2 rounded-xl p-3 text-center transition-all ${businessType===type ? 'border-brand bg-brand/5 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                              <span className="material-symbols-outlined mb-1 text-slate-600">{type==='individual'?'person':type==='shop'?'storefront':'corporate_fare'}</span>
                              <p className="text-xs font-bold text-brand capitalize">{type}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className={businessType==='individual' ? 'opacity-50 pointer-events-none' : ''}>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Business Name {businessType==='individual'&&'(Auto)'}</label>
                          <input type="text" className={`input-field ${errors.businessName ? 'input-error' : ''}`} value={businessType==='individual' ? `${name} Services` : businessName} onChange={e=>setBusinessName(e.target.value)} placeholder="e.g. Ramesh Electricals" />
                          {errors.businessName && <p className="text-xs text-red-500 font-bold mt-1 ml-1">{errors.businessName}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Experience</label>
                          <select className="input-field" value={experience} onChange={e=>setExperience(e.target.value)}>
                            <option value="1 yr">0-1 Year</option><option value="3 yrs">1-3 Years</option><option value="5 yrs">3-5 Years</option><option value="10+ yrs">10+ Years</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Full Work Address</label>
                        <textarea rows="2" className={`input-field resize-none ${errors.fullAddress ? 'input-error' : ''}`} value={fullAddress} onChange={e=>setFullAddress(e.target.value)} placeholder="Shop No, Street, Landmark..." />
                        {errors.fullAddress && <p className="text-xs text-red-500 font-bold mt-1 ml-1">{errors.fullAddress}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-5">
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">City</label>
                          <input type="text" className={`input-field ${errors.city ? 'input-error' : ''}`} value={city} onChange={e=>setCity(e.target.value)} />
                          {errors.city && <p className="text-xs text-red-500 font-bold mt-1 ml-1">{errors.city}</p>}
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1.5 ml-1">Pincode</label>
                          <input type="text" className={`input-field ${errors.pincode ? 'input-error' : ''}`} value={pincode} onChange={e=>setPincode(e.target.value)} maxLength={6} />
                          {errors.pincode && <p className="text-xs text-red-500 font-bold mt-1 ml-1">{errors.pincode}</p>}
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Step 3: Documents */}
                  {step === 3 && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-5">
                      <h3 className="text-xl font-extrabold text-brand mb-4">Verification Documents</h3>
                      <p className="text-sm text-slate-500 font-medium mb-4 -mt-2">Upload clear images for faster approval.</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* Profile/Shop Photo */}
                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center relative overflow-hidden group hover:bg-slate-50 transition-colors">
                          {profilePhoto ? (
                            <img src={profilePhoto} className="absolute inset-0 w-full h-full object-cover" alt="Profile" />
                          ) : (
                            <div className="py-6">
                              <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">add_a_photo</span>
                              <p className="text-sm font-bold text-brand">Upload Photo</p>
                              <p className="text-xs text-slate-400 font-medium mt-1">Profile or Shop front</p>
                            </div>
                          )}
                          <input type="file" accept="image/*" onChange={(e)=>handleFileUpload(e, setProfilePhoto)} className="absolute inset-0 opacity-0 cursor-pointer" />
                        </div>

                        {/* ID Proof */}
                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-4 flex flex-col items-center text-center relative overflow-hidden group hover:bg-slate-50 transition-colors">
                          <select value={idProofType} onChange={e=>setIdProofType(e.target.value)} className="absolute top-2 left-2 z-20 text-xs font-bold bg-white/80 backdrop-blur-sm border border-slate-200 rounded-lg px-2 py-1 outline-none text-brand">
                            <option value="aadhar">Aadhar Card</option>
                            <option value="pan">PAN Card</option>
                          </select>
                          
                          {idProof ? (
                            <img src={idProof} className="absolute inset-0 w-full h-full object-cover" alt="ID" />
                          ) : (
                            <div className="py-6 mt-4">
                              <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">badge</span>
                              <p className="text-sm font-bold text-brand">Upload ID</p>
                              <p className="text-xs text-slate-400 font-medium mt-1">Clear photo of original</p>
                            </div>
                          )}
                          <input type="file" accept="image/*" onChange={(e)=>handleFileUpload(e, setIdProof)} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                        </div>
                      </div>
                      <div className="flex gap-4 px-2">
                        {errors.profilePhoto && <p className="text-xs text-red-500 font-bold">{errors.profilePhoto}</p>}
                        {errors.idProof && <p className="text-xs text-red-500 font-bold">{errors.idProof}</p>}
                      </div>
                    </motion.div>
                  )}

                  {/* Step 4: Primary Service */}
                  {step === 4 && (
                    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-5">
                      <h3 className="text-xl font-extrabold text-brand mb-4">Select Primary Category</h3>
                      <p className="text-sm text-slate-500 font-medium mb-6 -mt-2">What is the main service you provide? You can add more later.</p>

                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {SERVICE_CATEGORIES.map(cat => (
                          <div 
                            key={cat.id} 
                            onClick={() => setPrimaryCategory(cat.id)}
                            className={`cursor-pointer border-2 rounded-2xl p-4 text-center transition-all ${primaryCategory === cat.id ? 'border-brand bg-brand text-white shadow-md -translate-y-1' : 'border-slate-200 bg-surface hover:border-slate-300 hover:bg-slate-50'}`}
                          >
                            <span className={`material-symbols-outlined text-3xl mb-2 ${primaryCategory === cat.id ? 'text-accent' : 'text-slate-400'}`}>{cat.icon}</span>
                            <p className={`text-xs font-bold leading-tight ${primaryCategory === cat.id ? 'text-white' : 'text-brand'}`}>{cat.id}</p>
                          </div>
                        ))}
                      </div>
                      {errors.primaryCategory && <p className="text-xs text-red-500 font-bold text-center mt-4">{errors.primaryCategory}</p>}
                    </motion.div>
                  )}
                </div>

                {/* Wizard Controls */}
                <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-100">
                  {step > 1 ? (
                    <button onClick={prevStep} className="btn-secondary !px-6 text-sm">Back</button>
                  ) : <div></div>}
                  
                  {step < 4 ? (
                    <button onClick={nextStep} className="btn-accent !px-8 shadow-sm">Continue <span className="material-symbols-outlined text-sm ml-1">arrow_forward</span></button>
                  ) : (
                    <button onClick={handleFinalSubmit} disabled={isLoading} className="btn-brand bg-brand text-white font-bold px-8 py-3.5 rounded-xl hover:bg-brand-light shadow-md disabled:opacity-70 flex items-center gap-2">
                      {isLoading ? <span className="material-symbols-outlined animate-spin">refresh</span> : 'Submit Application'}
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
