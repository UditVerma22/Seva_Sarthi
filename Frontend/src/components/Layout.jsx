/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useLocationStore } from '../store/useLocationStore';
import { useProviderStore } from '../store/useProviderStore';
import { motion, AnimatePresence } from 'framer-motion';
import { heroCategories, getCategoryItems, toolCategoriesMap, allCategories } from '../lib/constants';

// Derive dashboard path from role (DB field may be stale for seeded users)
const getDashboardPath = (user) => {
  if (!user) return '/';
  if (user.role === 'provider') return '/provider/dashboard';
  if (user.role === 'admin') return '/admin/dashboard';
  return '/user/dashboard';
};

const placeholders = [
  'AC Repair',
  'Kitchen Cleaning',
  'Professional Plumber',
  'Home Painting',
  'Sofa Cleaning',
  'Electrician',
  'Pest Control',
  'Bathroom Cleaning',
  'Appliance Repair'
];

export default function Layout({ children }) {
  const { currentUser, logout, providerStatus } = useAuthStore();
  const { language, toggleLanguage, setLanguage, t } = useLanguageStore();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotificationStore();
  const { aiSearchIntent } = useProviderStore();
  
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [manualCity, setManualCity] = useState('');
  const [navSearchQuery, setNavSearchQuery] = useState('');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  
  const { city, fullAddress, setCity } = useLocationStore();
  
  const [showServicesMenu, setShowServicesMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const notifRef = useRef(null);
  const profileRef = useRef(null);
  const servicesRef = useRef(null);
  const toolsRef = useRef(null);
  const recognitionRef = useRef(null);

  const isLanding = location.pathname === '/';
  const isAuth = location.pathname === '/auth';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setShowNotifications(false);
    setShowLanguagePicker(false);
    setShowProfileMenu(false);
    setShowLocationPicker(false);
  }, [location.pathname]);

  // Click outside to close notifications, language picker and profile menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
      if (!event.target.closest('.language-picker')) {
        setShowLanguagePicker(false);
      }
      if (!event.target.closest('.location-picker')) {
        setShowLocationPicker(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
      if (servicesRef.current && !servicesRef.current.contains(event.target)) {
        setShowServicesMenu(false);
      }
      if (toolsRef.current && !toolsRef.current.contains(event.target)) {
        setShowToolsMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language === 'hi' ? 'hi-IN' : 'en-IN';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setNavSearchQuery(transcript);
        setIsListening(false);
        setTimeout(() => {
          navigate('/services', { state: { query: transcript } });
        }, 1500);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, [navigate, language]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        setNavSearchQuery("");
        recognitionRef.current.start();
        setIsListening(true);
      }
    }
  };

  const handleNavAiSearch = async () => {
    if (!navSearchQuery.trim()) return;
    setIsAiSearching(true);
    
    const intent = await aiSearchIntent(navSearchQuery);
    setIsAiSearching(false);
    
    if (intent && intent.success) {
      if (intent.category === 'Tool Rental') {
        navigate('/rentals', { state: { query: intent.search }});
      } else {
        navigate('/services', { 
          state: { 
            dbCategory: intent.category !== 'General' ? intent.category : '',
            query: intent.search || '',
            displayName: intent.category !== 'General' ? intent.category : ''
          }
        });
      }
      setNavSearchQuery('');
    } else {
      // Fallback
      navigate('/services', { state: { query: navSearchQuery } });
      setNavSearchQuery('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const linkClass = ({ isActive }) =>
    `text-sm font-semibold transition-colors duration-200 ${
      isActive
        ? 'text-brand'
        : 'text-slate-500 hover:text-brand'
    }`;

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Session Warning Modal is now handled globally in SessionManager */}

      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
          scrolled || !isLanding
            ? 'bg-white shadow-sm py-3'
            : 'bg-white py-4 border-b border-slate-100'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 h-14">
            
            {/* ── Left: Logo & Links ── */}
            <div className="flex items-center gap-3 shrink-0">
              <Link to="/" className="flex items-center transition-transform hover:scale-[1.02] active:scale-[0.98]">
                <img src="/logo.svg" alt="Seva Sarthi Logo" className="h-11 w-auto" />
              </Link>
              
              <div className="hidden xl:block relative location-picker">
                <button 
                  onClick={() => setShowLocationPicker(!showLocationPicker)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] font-semibold text-slate-700 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all max-w-[180px]"
                  title={fullAddress || city || t('nav_set_location')}
                >
                  <span className="material-symbols-outlined text-[18px] text-slate-500">location_on</span>
                  <span className="truncate">{fullAddress || city || t('nav_set_location')}</span>
                  <span className="material-symbols-outlined text-[16px] text-slate-400">expand_more</span>
                </button>
                <AnimatePresence>
                  {showLocationPicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 origin-top-left z-50 p-1.5"
                    >
                      {['Indore', 'Ujjain', 'Dewas', 'Bhopal'].map((loc) => (
                        <button
                          key={loc}
                          onClick={() => {
                            setCity(loc);
                            setShowLocationPicker(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${city === loc ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                        >
                          {loc}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="hidden lg:flex items-center gap-3 ml-1">
                <div className="relative" ref={servicesRef}>
                  <button 
                    onClick={() => setShowServicesMenu(!showServicesMenu)}
                    className="text-[13px] font-bold text-slate-700 hover:text-amber-600 transition-colors flex items-center gap-0.5"
                  >
                    {t('nav_services')} <span className="material-symbols-outlined text-[16px]">expand_more</span>
                  </button>
                  <AnimatePresence>
                    {showServicesMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute top-full -left-20 mt-4 w-[750px] bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 p-6 grid grid-cols-3 gap-6"
                      >
                        {allCategories.map(cat => (
                          <div key={cat.id} className="group flex flex-col">
                            <Link 
                              to="/services"
                              state={{ query: cat.title }}
                              onClick={() => setShowServicesMenu(false)}
                              className="flex items-center gap-3 mb-4 group-hover:opacity-80 transition-opacity"
                            >
                              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-amber-50 group-hover:border-amber-200 transition-colors shrink-0">
                                <span className="material-symbols-outlined text-amber-500 text-[22px]">{cat.icon}</span>
                              </div>
                              <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-amber-600 transition-colors leading-tight">{t(`cat_title_${cat.id.replace(/-/g, '_')}`) || cat.title}</h4>
                            </Link>
                            <div className="space-y-2.5 ml-[52px] flex-grow">
                              {getCategoryItems(cat).slice(0, 3).map((item, idx) => (
                                <Link 
                                  key={idx}
                                  to="/services"
                                  state={{ dbCategory: item.dbCategory, keywords: item.keywords, displayName: item.name }}
                                  onClick={() => setShowServicesMenu(false)}
                                  className="block text-sm text-slate-500 hover:text-amber-600 hover:translate-x-1 transition-all duration-200 font-medium"
                                >
                                  {t(`cat_item_${item.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`) || item.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}
                        <div className="col-span-3 pt-6 mt-2 border-t border-slate-100 text-center">
                          <Link to="/services" onClick={() => setShowServicesMenu(false)} className="inline-flex items-center gap-2 text-slate-700 font-bold hover:text-amber-700 bg-slate-50 px-6 py-3 rounded-xl hover:bg-amber-50 transition-colors text-sm border border-slate-200 hover:border-amber-200">
                            {t('explore_all_services')} <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                          </Link>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="relative" ref={toolsRef}>
                  <button 
                    onClick={() => setShowToolsMenu(!showToolsMenu)}
                    className="text-[13px] font-bold text-slate-700 hover:text-amber-600 transition-colors flex items-center gap-0.5"
                  >
                    {t('nav_rentals')} <span className="material-symbols-outlined text-[16px]">expand_more</span>
                  </button>
                  <AnimatePresence>
                    {showToolsMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute top-full -left-20 mt-4 w-[650px] bg-white rounded-3xl shadow-2xl border border-slate-200 z-50 p-6 grid grid-cols-3 gap-6"
                      >
                        {toolCategoriesMap.map((cat, idx) => (
                          <div key={idx}>
                            <h4 className="font-extrabold text-slate-400 text-[11px] mb-4 pb-2 border-b border-slate-100 uppercase tracking-widest">{t(`tool_cat_${idx}`) || cat.title}</h4>
                            <div className="space-y-3">
                              {cat.items.map((item, iIdx) => (
                                <Link 
                                  key={iIdx}
                                  to="/rentals"
                                  state={{ 
                                    category: "All",
                                    query: item.search || item.name 
                                  }}
                                  onClick={() => setShowToolsMenu(false)}
                                  className="flex items-center gap-3 p-2.5 -ml-2.5 rounded-xl hover:bg-slate-50 transition-colors group/item"
                                >
                                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center group-hover/item:bg-amber-50 transition-colors shrink-0 border border-slate-200/60 group-hover/item:border-amber-200">
                                    <span className="material-symbols-outlined text-[20px] text-slate-500 group-hover/item:text-amber-600 transition-colors">{item.icon}</span>
                                  </div>
                                  <span className="text-sm font-bold text-slate-700 group-hover/item:text-amber-700 transition-colors">{t(`tool_item_${item.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`) || item.name}</span>
                                </Link>
                              ))}
                            </div>
                          </div>
                        ))}

                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* ── Middle: Search Bar ── */}
            <div className="hidden md:flex flex-grow mx-4">
              <div className={`flex items-center w-full bg-slate-50 border rounded-xl overflow-hidden transition-all h-10 relative ${isListening ? 'border-amber-500 bg-white ring-4 ring-amber-500/10' : 'border-slate-200 focus-within:border-amber-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-amber-500/10'}`}>
                <span className="material-symbols-outlined pl-4 text-slate-400 text-[18px] shrink-0">search</span>
                
                <div className="relative flex-grow h-full flex items-center">
                  <input 
                    type="text" 
                    className="w-full h-full px-3 bg-transparent border-none focus:ring-0 text-slate-800 font-semibold text-sm outline-none placeholder:text-transparent z-10 relative"
                    value={navSearchQuery}
                    onChange={(e) => setNavSearchQuery(e.target.value)}
                    disabled={isListening}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && navSearchQuery.trim()) {
                        handleNavAiSearch();
                      }
                    }}
                  />
                  
                  {/* Dynamic Animated Placeholder Overlay */}
                  {!navSearchQuery && !isListening && (
                    <div className="absolute left-3 right-4 pointer-events-none flex items-center gap-1.5 text-sm overflow-hidden">
                      <span className="text-slate-400 font-medium shrink-0">{t('nav_search_for')}</span>
                      <div className="relative h-5 flex-grow overflow-hidden">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={placeholderIndex}
                            initial={{ y: '100%', opacity: 0 }}
                            animate={{ y: '0%', opacity: 1 }}
                            exit={{ y: '-100%', opacity: 0 }}
                            transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
                            className="absolute inset-0 flex items-center text-amber-600 font-bold whitespace-nowrap"
                          >
                            &ldquo;{t(`ph_${placeholderIndex}`) || placeholders[placeholderIndex]}&rdquo;
                          </motion.span>
                        </AnimatePresence>
                      </div>
                    </div>
                  )}

                  {isListening && (
                    <div className="absolute left-3 pointer-events-none text-amber-600 font-bold text-sm animate-pulse">
                      {t('nav_listening')}
                    </div>
                  )}
                </div>

                {/* AI Search Button */}
                {isAiSearching ? (
                  <div className="p-2 mr-1 flex items-center justify-center shrink-0">
                    <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <button 
                    type="button"
                    onClick={handleNavAiSearch}
                    disabled={!navSearchQuery.trim()}
                    className="p-1.5 mr-1 rounded-lg flex items-center justify-center transition-colors shrink-0 text-slate-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-50 disabled:hover:bg-transparent"
                    title="AI Smart Search"
                  >
                    <span className="material-symbols-outlined text-[20px]">auto_awesome</span>
                  </button>
                )}

                {/* Voice Search Button */}
                <button 
                  type="button"
                  onClick={toggleListening}
                  className={`p-1.5 mr-2 rounded-lg flex items-center justify-center transition-colors shrink-0 ${isListening ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-amber-600 hover:bg-slate-100'}`}
                >
                  {isListening ? (
                    <span className="relative flex h-5 w-5 items-center justify-center">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                  ) : (
                    <span className="material-symbols-outlined text-[20px]">mic</span>
                  )}
                </button>
              </div>
            </div>

            {/* ── Right: Profile ── */}
            <div className="hidden md:flex items-center gap-4 shrink-0">

              {/* Language Picker */}
              <div className="relative language-picker">
                <button
                  onClick={() => setShowLanguagePicker(!showLanguagePicker)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-bold text-slate-600 bg-slate-50 border border-slate-200 hover:bg-slate-100 hover:border-slate-300 transition-all"
                  title="Switch Language"
                >
                  <span className="material-symbols-outlined text-[18px] text-slate-500">language</span>
                  <span>{language === 'hi' ? 'हिन्दी' : 'EN'}</span>
                </button>
                <AnimatePresence>
                  {showLanguagePicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-xl border border-slate-100 origin-top-right z-50 p-1.5"
                    >
                      <button
                        onClick={() => { setLanguage('en'); setShowLanguagePicker(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${language === 'en' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <span className="text-base">🇬🇧</span> English
                      </button>
                      <button
                        onClick={() => { setLanguage('hi'); setShowLanguagePicker(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold mt-0.5 transition-colors ${language === 'hi' ? 'bg-amber-500 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <span className="text-base">🇮🇳</span> हिन्दी
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              {/* Notifications */}
              {currentUser && (
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 hover:bg-slate-200 hover:border-slate-300 transition-all relative"
                  >
                    <span className="material-symbols-outlined text-[24px] text-slate-600">notifications</span>
                    {unreadCount > 0 && (
                      <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>
                    )}
                  </button>
                  <AnimatePresence>
                    {showNotifications && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 origin-top-right z-50 overflow-hidden flex flex-col max-h-[400px]"
                      >
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 sticky top-0 z-10">
                          <h3 className="font-bold text-slate-800">{t('notifications')}</h3>
                          {unreadCount > 0 && (
                            <button
                              onClick={() => markAllAsRead()}
                              className="text-xs font-semibold text-brand hover:text-brand-dark"
                            >
                              {t('nav_mark_all_read')}
                            </button>
                          )}
                        </div>
                        <div className="overflow-y-auto flex-1 p-2">
                          {notifications && notifications.length > 0 ? (
                            notifications.map((notif) => (
                              <div
                                key={notif._id || notif.id}
                                className={`p-3 rounded-xl mb-1 cursor-pointer transition-colors ${
                                  !notif.read ? 'bg-amber-50/50 hover:bg-amber-50' : 'hover:bg-slate-50'
                                }`}
                                onClick={() => {
                                  if (!notif.read) markAsRead(notif._id || notif.id);
                                }}
                              >
                                <div className="flex justify-between items-start mb-1">
                                  <h4 className={`text-sm ${!notif.read ? 'font-bold text-slate-800' : 'font-semibold text-slate-600'}`}>
                                    {notif.title}
                                  </h4>
                                </div>
                                <p className={`text-xs ${!notif.read ? 'text-slate-600 font-medium' : 'text-slate-500'}`}>
                                  {notif.message}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="p-8 text-center flex flex-col items-center justify-center">
                              <span className="material-symbols-outlined text-4xl text-slate-200 mb-2">notifications_off</span>
                              <p className="text-sm text-slate-500 font-medium">{t('no_notifications')}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Profile / Auth */}
              <div className="relative" ref={profileRef}>
                {currentUser ? (
                  <>
                    <button 
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 hover:bg-slate-200 hover:border-slate-300 transition-all"
                    >
                      <span className="material-symbols-outlined text-[24px] text-slate-600">person</span>
                    </button>
                    <AnimatePresence>
                      {showProfileMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 origin-top-right z-50 overflow-hidden"
                        >
                          <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <p className="font-bold text-slate-900 truncate">{currentUser.name || 'User'}</p>
                            <p className="text-xs text-slate-500 font-medium truncate">{currentUser.email || currentUser.phone}</p>
                          </div>
                          <div className="p-2 space-y-1">
                            <Link to={getDashboardPath(currentUser)} onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                              <span className="material-symbols-outlined text-[20px] text-slate-400">dashboard</span>
                              {t('nav_dashboard')}
                            </Link>

                            {currentUser.role === 'admin' && (
                              <>
                                <Link to="/admin/dashboard" state={{ activeSection: 'users' }} onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                                  <span className="material-symbols-outlined text-[20px] text-slate-400">group</span>
                                  {t('nav_users') || 'Manage Users'}
                                </Link>
                                <Link to="/admin/dashboard" state={{ activeSection: 'verifications' }} onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                                  <span className="material-symbols-outlined text-[20px] text-slate-400">how_to_reg</span>
                                  {t('nav_verifications') || 'Verifications'}
                                </Link>
                              </>
                            )}

                            {currentUser.role === 'provider' && (
                              <>
                                <Link to="/provider/wallet" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                                  <span className="material-symbols-outlined text-[20px] text-slate-400">account_balance_wallet</span>
                                  {t('nav_wallet') || 'My Wallet'}
                                </Link>
                                {providerStatus !== 'approved' && (
                                  <Link to="/provider/onboarding-status" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                                    <span className="material-symbols-outlined text-[20px] text-slate-400">assignment</span>
                                    {t('nav_onboarding') || 'Onboarding Status'}
                                  </Link>
                                )}
                              </>
                            )}

                            {(!currentUser.role || currentUser.role === 'user') && (
                              <>
                                <Link to="/my-bookings" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                                  <span className="material-symbols-outlined text-[20px] text-slate-400">receipt_long</span>
                                  {t('ud_my_bookings')}
                                </Link>
                                <Link to="/complaints" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors">
                                  <span className="material-symbols-outlined text-[20px] text-slate-400">report_problem</span>
                                  {t('nav_complaints') || 'My Complaints'}
                                </Link>
                              </>
                            )}
                          </div>
                          <div className="p-2 border-t border-slate-100">
                            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors">
                              <span className="material-symbols-outlined text-[20px]">logout</span>
                              {t('nav_logout')}
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <div className="relative">
                    <button
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-700 text-white font-bold px-4 py-2 rounded-xl transition-all text-xs whitespace-nowrap"
                    >
                      <span className="material-symbols-outlined text-[16px]">person</span>
                      {t('nav_login')}
                      <span className="material-symbols-outlined text-[14px]">expand_more</span>
                    </button>
                    <AnimatePresence>
                      {showProfileMenu && (
                        <motion.div
                          initial={{ opacity: 0, y: 8, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 origin-top-right z-50 overflow-hidden"
                        >
                          <div className="p-2 space-y-1">
                            <Link
                              to="/auth"
                              onClick={() => setShowProfileMenu(false)}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[18px] text-amber-600">person</span>
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-800">{t('nav_login_user')}</p>
                                <p className="text-[11px] text-slate-400 font-medium">{t('nav_login_user_desc')}</p>
                              </div>
                            </Link>
                            <Link
                              to="/provider/auth"
                              onClick={() => setShowProfileMenu(false)}
                              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 hover:text-brand transition-colors"
                            >
                              <div className="w-8 h-8 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[18px] text-brand">handyman</span>
                              </div>
                              <div>
                                <p className="font-extrabold text-slate-800">{t('nav_login_provider')}</p>
                                <p className="text-[11px] text-slate-400 font-medium">{t('nav_login_provider_desc')}</p>
                              </div>
                            </Link>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center gap-3 md:hidden">
              <div className="relative language-picker">
                 <button onClick={() => setShowLanguagePicker(!showLanguagePicker)} className="p-2 text-sm font-bold text-slate-600 flex items-center gap-1">
                   <span className="material-symbols-outlined text-lg">language</span>
                 </button>
                 <AnimatePresence>
                  {showLanguagePicker && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-32 glass-panel rounded-xl p-2 origin-top-right z-50 bg-surface shadow-lg border border-slate-200"
                    >
                      <button onClick={() => { setLanguage('en'); setShowLanguagePicker(false); }} className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold ${language === 'en' ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}>English</button>
                      <button onClick={() => { setLanguage('hi'); setShowLanguagePicker(false); }} className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold mt-1 ${language === 'hi' ? 'bg-brand text-white' : 'text-slate-600 hover:bg-slate-100'}`}>हिन्दी</button>
                    </motion.div>
                  )}
                 </AnimatePresence>
              </div>
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="p-3 -mr-2 rounded-xl text-brand hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[26px]">{mobileOpen ? 'close' : 'menu_open'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden glass-panel border-t-0 rounded-b-3xl overflow-hidden absolute top-full left-0 w-full"
            >
              <div className="p-4 space-y-2">
                <NavLink className="block px-4 py-3.5 rounded-2xl text-sm font-semibold text-brand hover:bg-slate-100 transition-colors" to="/services">{t('nav_services')}</NavLink>
                <NavLink className="block px-4 py-3.5 rounded-2xl text-sm font-semibold text-brand hover:bg-slate-100 transition-colors" to="/rentals">{t('nav_rentals')}</NavLink>
                {currentUser ? (
                  <>
                    <Link className="block px-4 py-3.5 rounded-2xl text-sm font-semibold text-accent-dark bg-accent/10" to={getDashboardPath(currentUser)}>{t('nav_dashboard')}</Link>
                    <button onClick={handleLogout} className="block w-full text-left px-4 py-3.5 rounded-2xl text-sm font-semibold text-red-600 hover:bg-red-50">{t('nav_logout')}</button>
                  </>
                ) : (
                  <>
                    <Link className="flex items-center justify-center gap-2 px-4 py-3.5 mt-4 rounded-2xl text-sm font-semibold text-amber-600 border-2 border-amber-500 text-center" to="/provider/auth">
                      <span className="material-symbols-outlined text-[18px]">handyman</span>
                      {t('nav_login_provider')}
                    </Link>
                    <Link className="block px-4 py-3.5 mt-2 rounded-2xl text-sm font-semibold text-brand bg-accent text-center" to="/auth">{t('nav_login')}</Link>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Main Content */}
      <div className="pt-20 flex-1 flex flex-col">{children}</div>

      {/* Footer */}
      {!isAuth && (
        <footer className="bg-surface border-t border-slate-200 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              {/* Brand */}
              <div className="md:col-span-1">
                <Link to="/" className="inline-block mb-6 transition-transform hover:scale-[1.02]">
                  <img src="/logo.svg" alt="Seva Sarthi Logo" className="h-16 w-auto drop-shadow-sm" />
                </Link>
                <p className="text-slate-500 text-sm leading-relaxed mb-6 font-medium">
                  {t('footer_desc')}
                </p>
                <div className="flex gap-3">
                  <button className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-accent/10 hover:text-accent-dark transition-all border border-slate-100">
                    <span className="material-symbols-outlined text-[20px]">share</span>
                  </button>
                  <button className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-accent/10 hover:text-accent-dark transition-all border border-slate-100">
                    <span className="material-symbols-outlined text-[20px]">mail</span>
                  </button>
                </div>
              </div>

              {/* Links */}
              <div>
                <h4 className="font-bold text-brand font-headline mb-5 text-sm uppercase tracking-widest">{t('footer_company')}</h4>
                <ul className="space-y-4">
                  <li><a className="text-slate-500 hover:text-brand font-medium text-sm transition-colors flex items-center gap-2" href="#">{t('footer_about')}</a></li>
                  <li><a className="text-slate-500 hover:text-brand font-medium text-sm transition-colors flex items-center gap-2" href="#">{t('footer_careers')} <span className="badge badge-accent">{t('footer_hiring')}</span></a></li>
                  <li><Link className="text-slate-500 hover:text-brand font-medium text-sm transition-colors flex items-center gap-2" to="/provider/auth">{t('footer_partner')}</Link></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-brand font-headline mb-5 text-sm uppercase tracking-widest">{t('footer_services')}</h4>
                <ul className="space-y-4">
                  <li><a className="text-slate-500 hover:text-brand font-medium text-sm transition-colors" href="#">{t('footer_plumbing')}</a></li>
                  <li><a className="text-slate-500 hover:text-brand font-medium text-sm transition-colors" href="#">{t('footer_electrician')}</a></li>
                  <li><a className="text-slate-500 hover:text-brand font-medium text-sm transition-colors" href="#">{t('footer_deep_cleaning')}</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-brand font-headline mb-5 text-sm uppercase tracking-widest">{t('footer_support')}</h4>
                <ul className="space-y-4">
                  <li><a className="text-slate-500 hover:text-brand font-medium text-sm transition-colors" href="#">{t('footer_help')}</a></li>
                  <li><a className="text-slate-500 hover:text-brand font-medium text-sm transition-colors" href="#">{t('footer_terms')}</a></li>
                  <li><a className="text-slate-500 hover:text-brand font-medium text-sm transition-colors" href="#">{t('footer_privacy')}</a></li>
                </ul>
              </div>
            </div>

            {/* App Store and Payment Badges */}
            <div className="mt-12 flex flex-col md:flex-row justify-between items-center gap-8 border-t border-slate-200/60 pt-10">
              <div className="flex gap-4">
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="h-10 cursor-pointer hover:opacity-80 transition-opacity" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Google Play" className="h-10 cursor-pointer hover:opacity-80 transition-opacity" />
              </div>
              <div className="flex items-center gap-4 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" alt="UPI" className="h-5" />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200/60 flex flex-col md:flex-row items-center justify-between gap-4">
              <p className="text-sm font-medium text-slate-400">{t('footer_copyright')}</p>
              <p className="text-sm font-medium text-slate-400 flex items-center gap-1">{t('footer_made_in')} <span className="text-base">🇮🇳</span></p>
            </div>
          </div>
        </footer>
      )}


    </div>
  );
}
