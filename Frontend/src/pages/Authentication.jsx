/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleLogin } from '@react-oauth/google';
import { useLanguageStore } from '../store/useLanguageStore';
import { validateEmail, validatePassword, validatePhone, validateName, validatePincode, validateCity, validateAddress, validateOtp, cleanPhone, isPhoneInput, digitsOnly } from '../lib/validators';

export default function Authentication() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordChecks, setPasswordChecks] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  // Signup method: 'email' or 'phone'
  const [signupMethod, setSignupMethod] = useState('email');
  const [confirmationResult, setConfirmationResult] = useState(null);
  // OTP verification for signup
  const [signupOtp, setSignupOtp] = useState('');
  const [signupOtpSent, setSignupOtpSent] = useState(false);
  const [signupOtpVerified, setSignupOtpVerified] = useState(false);
  const [signupOtpToken, setSignupOtpToken] = useState('');
  const [signupOtpLoading, setSignupOtpLoading] = useState(false);
  const [signupDevOtp, setSignupDevOtp] = useState('');
  const [emailSuggestion, setEmailSuggestion] = useState('');

  // Wizard state for sign up
  const [signUpStep, setSignUpStep] = useState(1);

  // Login/User signup fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  // Address fields
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');

  // Forgot password
  const [forgotMode, setForgotMode] = useState(null);
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const { login, register, googleLogin, forgotPassword, verifyOtp, resetPassword, sendUserOtp, verifyUserOtp } = useAuthStore();
  const { t } = useLanguageStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('sessionExpired')) setErrors({ global: 'Your session has expired. Please log in again.' });
  }, [location]);

  useEffect(() => {
    if (password) {
      const result = validatePassword(password);
      setPasswordStrength(result.strength);
      setPasswordChecks(result.checks || {});
    } else {
      setPasswordStrength(0);
      setPasswordChecks({});
    }
  }, [password]);

  // Real-time email validation with suggestion
  useEffect(() => {
    if (email && isSignUp) {
      const result = validateEmail(email);
      if (result.suggestion) setEmailSuggestion(result.suggestion);
      else setEmailSuggestion('');
    } else setEmailSuggestion('');
  }, [email, isSignUp]);

  const getStrengthColor = () => passwordStrength < 40 ? 'bg-red-400' : passwordStrength < 70 ? 'bg-amber-400' : 'bg-emerald-500';

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
        setDevOtp(res.data.devOtp);
        setOtp(res.data.devOtp);
        setErrors({ globalSuccess: 'Dev mode: SMTP not configured. Your OTP is shown below.' });
      } else {
        setDevOtp('');
        setErrors({ globalSuccess: 'OTP sent to your email address. Check your inbox.' });
      }
    }
    else setErrors({ global: useAuthStore.getState().error || 'Failed to send OTP. Please try again.' });
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) { setErrors({ global: 'Enter a valid 6-digit OTP' }); return; }
    setIsLoading(true); setErrors({});
    const data = await verifyOtp(forgotEmail, otp);
    setIsLoading(false);
    if (data?.resetToken) { setResetToken(data.resetToken); setForgotMode('reset'); setErrors({ globalSuccess: 'OTP verified! Set your new password.' }); }
    else setErrors({ global: useAuthStore.getState().error || 'Invalid OTP.' });
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { setErrors({ global: 'Password must be at least 6 characters' }); return; }
    if (newPassword !== confirmPassword) { setErrors({ global: 'Passwords do not match' }); return; }
    setIsLoading(true); setErrors({});
    const res = await resetPassword(forgotEmail, resetToken, newPassword);
    setIsLoading(false);
    if (res) {
      setForgotMode(null); setDevOtp('');
      setErrors({ globalSuccess: 'Password reset successfully! You can now log in.' });
      setNewPassword(''); setConfirmPassword(''); setOtp('');
    }
    else setErrors({ global: useAuthStore.getState().error || 'Reset failed. Please try again.' });
  };

  // --- SIGNUP OTP HANDLERS ---
  const handleSendSignupOtp = async () => {
    let payloadEmailOrPhone = '';
    if (signupMethod === 'email') {
      const ev = validateEmail(email);
      if (!ev.valid) { setErrors({ email: ev.error }); return; }
      payloadEmailOrPhone = email;
    } else {
      const pv = validatePhone(phone);
      if (!pv.valid) { setErrors({ phone: pv.error }); return; }
      payloadEmailOrPhone = cleanPhone(phone);
    }
    
    setSignupOtpLoading(true); setErrors({});
    const res = await sendUserOtp(signupMethod, payloadEmailOrPhone);
    setSignupOtpLoading(false);
    
    if (res) {
      setSignupOtpSent(true);
      if (res.data?.devOtp) { 
        setSignupDevOtp(res.data.devOtp); 
        setSignupOtp(res.data.devOtp); 
      } else {
        setSignupDevOtp('');
      }
      setErrors({ globalSuccess: `OTP sent to your ${signupMethod === 'email' ? 'email' : 'mobile'}!` });
    } else {
      setErrors({ global: useAuthStore.getState().error || 'Failed to send OTP' });
    }
  };

  const handleVerifySignupOtp = async () => {
    const ov = validateOtp(signupOtp);
    if (!ov.valid) { setErrors({ signupOtp: ov.error }); return; }
    setSignupOtpLoading(true); setErrors({});
    
    const payloadEmailOrPhone = signupMethod === 'email' ? email : cleanPhone(phone);
    const data = await verifyUserOtp(signupMethod, payloadEmailOrPhone, signupOtp);
    setSignupOtpLoading(false);
    
    if (data?.verified) {
      setSignupOtpVerified(true);
      setSignupOtpToken(data.otpToken);
      setErrors({ globalSuccess: 'Verified! Continue with your details.' });
    } else {
      setErrors({ global: useAuthStore.getState().error || 'Invalid OTP' });
    }
  };

  // --- WIZARD VALIDATION ---
  const validateStep1 = () => {
    const errs = {};
    const nv = validateName(name);
    if (!nv.valid) errs.name = nv.error;
    
    if (signupMethod === 'email') {
      const ev = validateEmail(email);
      if (!ev.valid) errs.email = ev.error;
      if (phone) { const pv = validatePhone(phone); if (!pv.valid) errs.phone = pv.error; }
    } else {
      const pv = validatePhone(phone);
      if (!pv.valid) errs.phone = pv.error;
      if (email) { const ev = validateEmail(email); if (!ev.valid) errs.email = ev.error; }
    }
    
    const pwv = validatePassword(password);
    if (!pwv.valid) errs.password = pwv.error;

    if (!signupOtpVerified) errs.global = 'Please verify your ' + (signupMethod === 'email' ? 'email' : 'mobile number') + ' first';
    
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const validateStep2 = () => {
    const errs = {};
    const av = validateAddress(line1, true, 5);
    if (!av.valid) errs.line1 = av.error;
    const cv = validateCity(city);
    if (!cv.valid) errs.city = cv.error;
    const pv = validatePincode(pincode);
    if (!pv.valid) errs.pincode = pv.error;
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) { setSignUpStep(2); setErrors({}); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSignUp) {
      if (!validateStep2()) return;
      setIsLoading(true); setErrors({});
      const payload = {
        role: 'user', name, password, phone: cleanPhone(phone),
        email: signupMethod === 'email' ? email : (email || undefined),
        signupMethod, otpToken: signupOtpToken,
        address: { line1, line2, city, pincode, landmark },
      };
      const user = await register(payload);
      setIsLoading(false);
      if (user) {
        setIsSignUp(false); setSignUpStep(1); setPassword('');
        setSignupOtpVerified(false); setSignupOtpSent(false); setSignupOtp(''); setSignupOtpToken('');
        setErrors({ globalSuccess: `Account created for ${name}! Please log in.` });
      } else setErrors({ global: useAuthStore.getState().error || 'Registration failed.' });
      return;
    }
    // Login flow
    const id = loginIdentifier.trim();
    if (!id) { setErrors({ loginId: 'Email or mobile number is required' }); return; }
    if (!password) { setErrors({ password: 'Password is required' }); return; }
    setIsLoading(true); setErrors({});
    const user = await login(id, password);
    setIsLoading(false);
    if (user) {
      if (user.role === 'provider') { setErrors({ global: 'This is a provider account. Please use the Provider Login page.' }); return; }
      navigate(user.role === 'admin' ? '/admin/dashboard' : `/${user.role}/dashboard`);
    } else setErrors({ global: useAuthStore.getState().error || 'Invalid credentials.' });
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true); setErrors({});
    const user = await googleLogin(credentialResponse.credential, 'user');
    setIsLoading(false);
    if (user) navigate(`/${user.role}/dashboard`);
    else setErrors({ global: useAuthStore.getState().error || 'Google authentication failed.' });
  };

  const labelCls = "block text-[11px] font-bold text-slate-400 mb-2 uppercase tracking-widest";
  const inputCls = "input-field";

  // --- FORGOT PASSWORD UI ---
  if (forgotMode) {
    return (
      <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center bg-brand py-12 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
          <div className="bg-surface rounded-3xl p-8 sm:p-10 shadow-premium border border-slate-200/50">
            <div className="mb-8 text-center">
              <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                <span className="material-symbols-outlined text-surface text-3xl">lock_reset</span>
              </div>
              <h2 className="text-2xl font-extrabold font-headline text-brand tracking-tight mb-2">
                {forgotMode === 'email' ? t('auth_forgot_password') : forgotMode === 'otp' ? t('auth_enter_otp') : t('auth_new_password')}
              </h2>
              <p className="text-slate-500 font-medium text-sm">
                {forgotMode === 'email' ? t('auth_email_otp_msg') : forgotMode === 'otp' ? t('auth_check_email') : t('auth_set_new_password')}
              </p>
            </div>

            <AnimatePresence>
              {errors.global && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold border border-red-100 flex items-center gap-2"><span className="material-symbols-outlined">error</span>{errors.global}</motion.div>}
              {errors.globalSuccess && <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="mb-4 bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl text-sm font-semibold border border-emerald-100 flex items-center gap-2"><span className="material-symbols-outlined">check_circle</span>{errors.globalSuccess}</motion.div>}
            </AnimatePresence>

            {forgotMode === 'email' && (
              <form onSubmit={handleForgotSendOtp} className="space-y-5">
                <div><label className={labelCls}>{t('auth_email')}</label><input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} className={inputCls} placeholder={t('auth_email')} type="email" /></div>
                <button disabled={isLoading} className={`w-full btn-accent !py-4 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-wait' : ''}`} type="submit">
                  {isLoading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <>{t('auth_send_otp')}<span className="material-symbols-outlined text-xl">send</span></>}
                </button>
              </form>
            )}
            {forgotMode === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-5">
                {devOtp && (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-center">
                    <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">⚠ Dev Mode — SMTP Not Configured</p>
                    <p className="text-amber-700 text-xs mb-2">Configure SMTP in backend <code className="bg-amber-100 px-1 rounded">.env</code> for real email delivery.</p>
                    <p className="text-amber-800 font-bold text-sm">Your OTP:</p>
                    <span className="text-3xl font-black tracking-[0.5em] text-amber-900 font-mono">{devOtp}</span>
                  </div>
                )}
                <div><label className={labelCls}>6-Digit OTP</label><input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} className={`${inputCls} text-center text-2xl tracking-[0.5em] font-extrabold`} placeholder="• • • • • •" maxLength={6} /></div>
                <button disabled={isLoading} className={`w-full btn-accent !py-4 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-wait' : ''}`} type="submit">
                  {isLoading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <>{t('auth_verify_otp')}<span className="material-symbols-outlined text-xl">verified</span></>}
                </button>
                <button type="button" onClick={() => { setForgotMode('email'); setOtp(''); setDevOtp(''); setErrors({}); }} className="w-full text-sm font-bold text-slate-500 hover:text-brand">{t('auth_resend_otp')}</button>
              </form>
            )}
            {forgotMode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div><label className={labelCls}>{t('auth_new_password')}</label><input value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputCls} placeholder="Min 6 characters" type="password" /></div>
                <div><label className={labelCls}>{t('auth_confirm_password')}</label><input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputCls} placeholder={t('auth_confirm_password')} type="password" /></div>
                <button disabled={isLoading} className={`w-full btn-accent !py-4 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-wait' : ''}`} type="submit">
                  {isLoading ? <span className="material-symbols-outlined animate-spin">progress_activity</span> : <>{t('auth_reset_password')}<span className="material-symbols-outlined text-xl">lock_open</span></>}
                </button>
              </form>
            )}
            <div className="mt-6 text-center">
              <button type="button" onClick={() => { setForgotMode(null); setErrors({}); }} className="text-sm font-bold text-brand hover:text-accent-dark">{t('auth_back_to_login')}</button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // --- MAIN AUTH UI ---
  return (
    <div className="min-h-[calc(100vh-5rem)] flex items-center justify-center bg-brand py-12 px-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white/5 rounded-full blur-[80px] translate-y-1/3 -translate-x-1/4" />

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className={`w-full relative z-10 ${isSignUp ? 'max-w-xl' : 'max-w-md'}`}>
        <div className="bg-surface rounded-3xl p-8 sm:p-10 shadow-premium border border-slate-200/50">
          <div className="mb-8 text-center">
            <div className="w-14 h-14 bg-brand rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
              <span className="material-symbols-outlined text-surface text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>handyman</span>
            </div>
            <h2 className="text-3xl font-extrabold font-headline text-brand tracking-tight mb-2">
              {isSignUp ? t('auth_create_account') : t('auth_welcome_back')}
            </h2>
            <p className="text-slate-500 font-medium">
              {isSignUp ? t('auth_join_network') : t('auth_enter_credentials')}
            </p>
          </div>

          {isSignUp && (
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${signUpStep === 1 ? 'bg-brand text-white' : 'bg-green-500 text-white'}`}>
                  {signUpStep > 1 ? <span className="material-symbols-outlined text-lg">check</span> : '1'}
                </div>
                <div className={`h-1 w-12 rounded-full transition-colors ${signUpStep > 1 ? 'bg-green-500' : 'bg-slate-200'}`} />
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors ${signUpStep === 2 ? 'bg-brand text-white' : 'bg-slate-100 text-slate-400'}`}>
                  2
                </div>
              </div>
            </div>
          )}

          <AnimatePresence>
            {errors.global && <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="mb-4 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-semibold border border-red-100 flex items-center gap-2"><span className="material-symbols-outlined">error</span>{errors.global}</motion.div>}
            {errors.globalSuccess && <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} className="mb-4 bg-emerald-50 text-emerald-600 px-4 py-3 rounded-xl text-sm font-semibold border border-emerald-100 flex items-center gap-2"><span className="material-symbols-outlined">check_circle</span>{errors.globalSuccess}</motion.div>}
          </AnimatePresence>

          <form className="space-y-5" onSubmit={isSignUp && signUpStep === 1 ? (e) => { e.preventDefault(); handleNextStep(); } : handleSubmit}>

            {!isSignUp && (
              <>
                <div><label className={labelCls} htmlFor="login-input">Email or Mobile Number</label>
                  <input value={loginIdentifier} onChange={e => setLoginIdentifier(e.target.value)} id="login-input" className={inputCls} placeholder="e.g. user@gmail.com or 9876543210" type="text" autoComplete="username" />
                  {errors.loginId && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.loginId}</p>}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className={`${labelCls} !mb-0`} htmlFor="password-input">{t('auth_password')}</label>
                    <button type="button" onClick={() => { setForgotMode('email'); setForgotEmail(loginIdentifier); setErrors({}); }} className="text-xs font-bold text-accent-dark hover:text-accent transition-colors">{t('auth_forgot')}</button>
                  </div>
                  <div className="relative">
                    <input value={password} onChange={e => setPassword(e.target.value.slice(0, 14))} id="password-input" className={`${inputCls} !pr-12`} placeholder="••••••••" type={showPassword ? 'text' : 'password'} maxLength={14} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {errors.password && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.password}</p>}
                </div>
                <button disabled={isLoading} className={`w-full btn-accent !py-4 mt-4 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-wait' : ''}`} type="submit">
                  {isLoading ? <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span> : <>{t('auth_sign_in')}<span className="material-symbols-outlined text-xl">arrow_forward</span></>}
                </button>
              </>
            )}

            {isSignUp && signUpStep === 1 && (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-5">
                {/* Sign Up Method Toggle */}
                <div className="flex bg-slate-100 rounded-xl p-1 gap-1">
                  <button type="button" onClick={() => { setSignupMethod('email'); setSignupOtpSent(false); setSignupOtpVerified(false); setSignupOtp(''); setErrors({}); }} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${signupMethod === 'email' ? 'bg-white text-brand shadow-sm' : 'text-slate-500'}`}>
                    <span className="material-symbols-outlined text-lg">email</span> Email
                  </button>
                  <button type="button" onClick={() => { setSignupMethod('phone'); setSignupOtpSent(false); setSignupOtpVerified(false); setSignupOtp(''); setErrors({}); }} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${signupMethod === 'phone' ? 'bg-white text-brand shadow-sm' : 'text-slate-500'}`}>
                    <span className="material-symbols-outlined text-lg">phone_android</span> Mobile
                  </button>
                </div>

                <div>
                  <label className={labelCls}>{t('auth_full_name')}</label>
                  <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="e.g. Rahul Sharma" type="text" />
                  {errors.name && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.name}</p>}
                </div>

                {signupMethod === 'email' ? (
                  <div>
                    <label className={labelCls}>Email Address *</label>
                    <div className="flex gap-2">
                      <input value={email} onChange={e => setEmail(e.target.value)} className={`${inputCls} flex-1`} placeholder="e.g. user@gmail.com" type="email" disabled={signupOtpVerified} />
                      {!signupOtpVerified && <button type="button" onClick={handleSendSignupOtp} disabled={signupOtpLoading || !email} className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold whitespace-nowrap hover:bg-brand/90 transition disabled:opacity-50">{signupOtpLoading ? '...' : signupOtpSent ? 'Resend' : 'Send OTP'}</button>}
                      {signupOtpVerified && <span className="flex items-center text-emerald-500"><span className="material-symbols-outlined" style={{fontVariationSettings:"'FILL' 1"}}>verified</span></span>}
                    </div>
                    {emailSuggestion && <button type="button" onClick={() => { setEmail(emailSuggestion); setEmailSuggestion(''); }} className="mt-1.5 text-xs font-bold text-blue-600 hover:text-blue-800">Did you mean {emailSuggestion}?</button>}
                    {errors.email && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.email}</p>}
                  </div>
                ) : (
                  <div>
                    <label className={labelCls}>Mobile Number *</label>
                    <div className="flex gap-2">
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 text-sm font-bold text-slate-500">+91</div>
                      <input value={phone} onChange={e => setPhone(cleanPhone(e.target.value))} className={`${inputCls} flex-1`} placeholder="9876543210" type="tel" maxLength={10} inputMode="numeric" disabled={signupOtpVerified} />
                      {!signupOtpVerified && <button type="button" onClick={handleSendSignupOtp} disabled={signupOtpLoading || !phone} className="px-4 py-2 bg-brand text-white rounded-xl text-xs font-bold whitespace-nowrap hover:bg-brand/90 transition disabled:opacity-50">{signupOtpLoading ? '...' : signupOtpSent ? 'Resend' : 'Send OTP'}</button>}
                      {signupOtpVerified && <span className="flex items-center text-emerald-500"><span className="material-symbols-outlined" style={{fontVariationSettings:"'FILL' 1"}}>verified</span></span>}
                    </div>
                    {errors.phone && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.phone}</p>}
                  </div>
                )}

                {signupOtpSent && !signupOtpVerified && (
                  <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} className="space-y-3">
                    {signupDevOtp && (<div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center"><p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Dev Mode OTP</p><span className="text-2xl font-black tracking-[0.4em] text-amber-900 font-mono">{signupDevOtp}</span></div>)}
                    <div>
                      <label className={labelCls}>Enter 6-digit OTP</label>
                      <div className="flex gap-2">
                        <input value={signupOtp} onChange={e => setSignupOtp(digitsOnly(e.target.value).slice(0,6))} className={`${inputCls} flex-1 text-center text-xl tracking-[0.4em] font-extrabold`} placeholder="• • • • • •" maxLength={6} inputMode="numeric" />
                        <button type="button" onClick={handleVerifySignupOtp} disabled={signupOtpLoading || signupOtp.length !== 6} className="px-5 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 transition disabled:opacity-50">{signupOtpLoading ? '...' : 'Verify'}</button>
                      </div>
                      {errors.signupOtp && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.signupOtp}</p>}
                    </div>
                  </motion.div>
                )}

                {signupMethod === 'email' ? (
                  <div><label className={labelCls}>Mobile Number (Optional)</label><input value={phone} onChange={e => setPhone(cleanPhone(e.target.value))} className={inputCls} placeholder="10-digit number" type="tel" maxLength={10} inputMode="numeric" />{errors.phone && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.phone}</p>}</div>
                ) : (
                  <div><label className={labelCls}>Email (Optional)</label><input value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="e.g. user@gmail.com" type="email" />{emailSuggestion && <button type="button" onClick={() => { setEmail(emailSuggestion); setEmailSuggestion(''); }} className="mt-1.5 text-xs font-bold text-blue-600">Did you mean {emailSuggestion}?</button>}{errors.email && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.email}</p>}</div>
                )}

                <div>
                  <label className={labelCls}>{t('auth_password')} (6-14 chars)</label>
                  <div className="relative">
                    <input value={password} onChange={e => setPassword(e.target.value.slice(0, 14))} className={`${inputCls} !pr-12`} placeholder="6-14 characters" type={showPassword ? 'text' : 'password'} maxLength={14} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><span className="material-symbols-outlined text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span></button>
                  </div>
                  {password.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="flex gap-1 h-1.5 rounded-full overflow-hidden bg-slate-100"><div className={`h-full transition-all duration-300 ${getStrengthColor()}`} style={{ width: `${passwordStrength}%` }} /></div>
                      <div className="grid grid-cols-2 gap-1">
                        {[['minLength','6+ characters'],['maxLength','≤ 14 characters'],['hasUppercase','Uppercase (A-Z)'],['hasLowercase','Lowercase (a-z)'],['hasNumber','Number (0-9)'],['hasSpecial','Special (!@#$)']].map(([key, label]) => (
                          <div key={key} className={`flex items-center gap-1 text-[10px] font-bold ${passwordChecks[key] ? 'text-emerald-500' : 'text-slate-400'}`}>
                            <span className="material-symbols-outlined text-[14px]" style={{fontVariationSettings:"'FILL' 1"}}>{passwordChecks[key] ? 'check_circle' : 'radio_button_unchecked'}</span>{label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {errors.password && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.password}</p>}
                </div>

                <button type="submit" className="w-full btn-accent !py-4 mt-4 flex items-center justify-center gap-2">
                  Continue <span className="material-symbols-outlined text-xl">arrow_forward</span>
                </button>
              </motion.div>
            )}

            {isSignUp && signUpStep === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-5">
                <div>
                  <label className={labelCls}>Address Line 1</label>
                  <input value={line1} onChange={e => setLine1(e.target.value)} className={inputCls} placeholder="House/Flat No., Building Name" type="text" />
                  {errors.line1 && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.line1}</p>}
                </div>
                <div>
                  <label className={labelCls}>Address Line 2 (Optional)</label>
                  <input value={line2} onChange={e => setLine2(e.target.value)} className={inputCls} placeholder="Street, Area, Sector" type="text" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className={labelCls}>City</label>
                    <input value={city} onChange={e => setCity(e.target.value)} className={inputCls} placeholder="e.g. Mumbai" type="text" />
                    {errors.city && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.city}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Pincode</label>
                    <input value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))} className={inputCls} placeholder="6-digit pincode" type="text" maxLength={6} />
                    {errors.pincode && <p className="mt-1.5 text-xs font-semibold text-red-500">{errors.pincode}</p>}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Landmark (Optional)</label>
                  <input value={landmark} onChange={e => setLandmark(e.target.value)} className={inputCls} placeholder="Near prominent location" type="text" />
                </div>

                <div className="flex gap-4 mt-8">
                  <button type="button" onClick={() => setSignUpStep(1)} className="px-6 py-4 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">
                    Back
                  </button>
                  <button disabled={isLoading} type="submit" className={`flex-1 btn-accent !py-4 flex items-center justify-center gap-2 ${isLoading ? 'opacity-70 cursor-wait' : ''}`}>
                    {isLoading ? <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span> : <>{t('auth_create_account')} <span className="material-symbols-outlined text-xl">check_circle</span></>}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Google auth */}
            <div className="relative mt-8">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-surface text-slate-500 font-medium">{t('auth_or_continue')}</span></div>
            </div>
            <div className="mt-6 flex justify-center">
              <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => setErrors({ global: 'Google auth failed.' })} useOneTap theme="outline" shape="pill" text={isSignUp ? "signup_with" : "signin_with"} />
            </div>
          </form>

          {/* Toggle signup/login */}
          <div className="mt-8 text-center pt-6 border-t border-slate-100">
            <p className="text-sm font-medium text-slate-500">
              {isSignUp ? t('auth_already_account') + ' ' : t('auth_no_account') + ' '}
              <button type="button" onClick={() => { setIsSignUp(!isSignUp); setSignUpStep(1); setErrors({}); setPassword(''); setSignupOtpSent(false); setSignupOtpVerified(false); setSignupOtp(''); setSignupOtpToken(''); setEmailSuggestion(''); }} className="text-brand font-bold hover:text-accent-dark transition-colors ml-1">
                {isSignUp ? t('auth_sign_in_link') : t('auth_sign_up')}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
