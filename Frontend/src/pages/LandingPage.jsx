/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useLanguageStore } from '../store/useLanguageStore';
import { useLocationStore } from '../store/useLocationStore';
import { motion, AnimatePresence } from 'framer-motion';
import VoiceSearch from '../components/VoiceSearch';
import toast from 'react-hot-toast';
import { heroCategories, allCategories, getCategoryItems, mostBookedServices, categoryShowcases, newAndNoteworthy } from '../lib/constants';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }
  })
};

const stepsData = [
  { icon: 'search_hands_free', titleKey: 'hiw_step1_title', descKey: 'hiw_step1_desc' },
  { icon: 'calendar_month', titleKey: 'hiw_step2_title', descKey: 'hiw_step2_desc' },
  { icon: 'verified_user', titleKey: 'hiw_step3_title', descKey: 'hiw_step3_desc' },
];

const providers = [
  { name: 'Rajesh K.', roleKey: 'role_electrical_specialist', rating: 4.9, price: '₹499/hr',
    image: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=2069&auto=format&fit=crop',
    badgeKeys: ['badge_fast_response', 'badge_verified'],
    quote: "Fixed my wiring issue in 20 minutes! Very professional." },
  { name: 'Anita S.', roleKey: 'role_deep_cleaning', rating: 5.0, price: '₹349/hr',
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070&auto=format&fit=crop',
    badgeKeys: ['badge_eco_friendly', 'badge_premium'],
    quote: "My house looks brand new. Highly recommend Anita!" },
  { name: 'Vikram S.', roleKey: 'role_master_plumber', rating: 4.8, price: '₹599/hr',
    image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=2070&auto=format&fit=crop',
    badgeKeys: ['badge_priority', 'badge_15yr_exp'],
    quote: "Arrived on time and fixed the leak perfectly." },
  { name: 'Priya M.', roleKey: 'role_painting_expert', rating: 4.9, price: '₹599/hr',
    image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=2070&auto=format&fit=crop',
    badgeKeys: ['badge_premium', 'badge_verified'],
    quote: "Beautiful wall textures and very clean work!" },
];

const toolsData = [
  { icon: 'construction', titleKey: 'tool_power', descKey: 'tool_power_desc', image: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?q=80&w=400&auto=format&fit=crop' },
  { icon: 'home_repair_service', titleKey: 'tool_hand', descKey: 'tool_hand_desc', image: 'https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?q=80&w=400&auto=format&fit=crop' },
  { icon: 'deck', titleKey: 'tool_outdoor', descKey: 'tool_outdoor_desc', image: 'https://images.unsplash.com/photo-1416879598555-fa7dc51375d8?q=80&w=400&auto=format&fit=crop' },
  { icon: 'cleaning_bucket', titleKey: 'tool_cleaning', descKey: 'tool_cleaning_desc', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400&auto=format&fit=crop' },
];

/* ── Category Modal (Urban Company style popup) ── */
function CategoryModal({ category, onClose, navigate }) {
  const isAllServices = category === 'all';
  const cats = isAllServices ? allCategories : [category];

  const handleItemClick = (item) => {
    navigate('/services', {
      state: {
        dbCategory: item.dbCategory,
        keywords: item.keywords,
        displayName: item.name,
      }
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-[620px] max-h-[80vh] flex flex-col overflow-hidden z-10"
          onClick={e => e.stopPropagation()}
        >
          {/* Close Button */}
          <div className="absolute top-5 right-5 z-20">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center hover:bg-slate-50 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-slate-600 text-xl">close</span>
            </button>
          </div>

          <div className="overflow-y-auto no-scrollbar p-8 pt-7 h-full">
            {cats.map((cat, catIdx) => (
              <div key={cat.id} className={catIdx > 0 ? 'mt-8 pt-8 border-t border-slate-100' : ''}>
                {/* Category Title */}
                <h2 className="text-2xl font-extrabold text-slate-900 mb-6 pr-10">{cat.title}</h2>

                {/* Sections */}
                {cat.modal.map((section, sIdx) => (
                  <div key={sIdx} className={sIdx > 0 ? 'mt-6' : ''}>
                    {section.subtitle && (
                      <h3 className="text-base font-bold text-slate-700 mb-4">{section.subtitle}</h3>
                    )}
                    <div className="grid grid-cols-3 gap-5">
                      {section.items.map((item, iIdx) => (
                        <div
                          key={iIdx}
                          onClick={() => handleItemClick(item)}
                          className="flex flex-col items-center gap-2.5 cursor-pointer group"
                        >
                          <div className="w-[88px] h-[88px] bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:border-amber-300 group-hover:bg-amber-50 transition-all duration-200">
                            <span className="material-symbols-outlined text-[36px] text-slate-600 group-hover:text-amber-600 transition-colors">{item.icon}</span>
                          </div>
                          <span className="text-xs font-semibold text-slate-700 text-center leading-tight max-w-[100px] group-hover:text-amber-700">{item.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default function LandingPage() {
  const { currentUser } = useAuthStore();
  const { t } = useLanguageStore();
  const navigate = useNavigate();
  const { city, detectLocation } = useLocationStore();
  const [activeModal, setActiveModal] = useState(null); // null | category obj | 'all'
  const [homeOffers, setHomeOffers] = useState([]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (!city && !sessionStorage.getItem('locationPrompted')) {
      sessionStorage.setItem('locationPrompted', 'true');
      setTimeout(() => detectLocation(), 2000);
    }
    const fetchOffers = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/coupons/home');
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setHomeOffers(data.data);
        } else {
          setHomeOffers([
            { _id: 'fallback1', title: 'Welcome Discount', subtitle: 'Flat 50% off on your first booking up to ₹200', code: 'WELCOME50', userType: 'new', imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070' },
            { _id: 'fallback2', title: 'Flat ₹100 Off', subtitle: 'Save ₹100 on any service worth ₹500 or more', code: 'SEVAFLAT100', userType: 'all', imageUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070' },
            { _id: 'fallback3', title: 'Premium Savings', subtitle: 'Flat ₹500 off on large bookings above ₹2000', code: 'PREMIUM500', userType: 'all', imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070' }
          ]);
        }
      } catch {
        setHomeOffers([
          { _id: 'fallback1', title: 'Welcome Discount', subtitle: 'Flat 50% off on your first booking up to ₹200', code: 'WELCOME50', userType: 'new', imageUrl: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070' },
          { _id: 'fallback2', title: 'Flat ₹100 Off', subtitle: 'Save ₹100 on any service worth ₹500 or more', code: 'SEVAFLAT100', userType: 'all', imageUrl: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2070' },
          { _id: 'fallback3', title: 'Premium Savings', subtitle: 'Flat ₹500 off on large bookings above ₹2000', code: 'PREMIUM500', userType: 'all', imageUrl: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070' }
        ]);
      }
    };
    fetchOffers();
  }, [city, detectLocation]);

  const handleSearch = (query) => navigate('/services', { state: { query } });
  const handleBookClick = () => navigate(currentUser ? '/booking' : '/auth');
  const handleRentClick = () => navigate(currentUser ? '/rentals' : '/auth');

  const catColors = [
    { bg: 'bg-rose-50', border: 'border-rose-100', text: 'text-rose-500', hoverBg: 'group-hover:bg-rose-100', hoverBorder: 'group-hover:border-rose-300', hoverText: 'group-hover:text-rose-600' },
    { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-500', hoverBg: 'group-hover:bg-indigo-100', hoverBorder: 'group-hover:border-indigo-300', hoverText: 'group-hover:text-indigo-600' },
    { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-500', hoverBg: 'group-hover:bg-emerald-100', hoverBorder: 'group-hover:border-emerald-300', hoverText: 'group-hover:text-emerald-600' },
    { bg: 'bg-sky-50', border: 'border-sky-100', text: 'text-sky-500', hoverBg: 'group-hover:bg-sky-100', hoverBorder: 'group-hover:border-sky-300', hoverText: 'group-hover:text-sky-600' },
    { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-500', hoverBg: 'group-hover:bg-amber-100', hoverBorder: 'group-hover:border-amber-300', hoverText: 'group-hover:text-amber-600' },
  ];
  const allServicesColor = { bg: 'bg-purple-50', border: 'border-purple-100', text: 'text-purple-500', hoverBg: 'group-hover:bg-purple-100', hoverBorder: 'group-hover:border-purple-300', hoverText: 'group-hover:text-purple-600' };

  return (
    <div className="bg-white min-h-screen">

      {/* ═══════════ HERO SECTION (Urban Company Layout) ═══════════ */}
      <section className="pt-8 pb-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 items-start">

          {/* ── Left Side ── */}
          <div className="w-full lg:w-[42%] pt-4">
            <motion.h1
              initial="hidden" animate="visible" variants={fadeUp} custom={0}
              className="text-4xl md:text-5xl lg:text-[52px] font-extrabold font-headline text-slate-900 leading-[1.15] mb-10"
              dangerouslySetInnerHTML={{ __html: t('lp_hero_title') }}
            />

            {/* Category Grid Card (Premium Layout) */}
            <motion.div
              initial="hidden" animate="visible" variants={fadeUp} custom={1}
              className="bg-white rounded-[2rem] p-7 mb-6 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border border-slate-100"
            >
              <div className="grid grid-cols-3 gap-x-6 gap-y-8">
                {heroCategories.map((cat, idx) => {
                  const c = catColors[idx % catColors.length];
                  return (
                    <div
                      key={cat.id}
                      onClick={() => setActiveModal(cat)}
                      className="flex flex-col items-center gap-3 cursor-pointer group"
                    >
                      <div className={`w-[100px] h-[100px] ${c.bg} rounded-2xl flex items-center justify-center border ${c.border} ${c.hoverBorder} ${c.hoverBg} transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:-translate-y-1`}>
                        <span className={`material-symbols-outlined text-[42px] ${c.text} ${c.hoverText} transition-colors`}>{cat.icon}</span>
                      </div>
                      <span className="text-[12px] font-bold text-slate-800 text-center leading-tight max-w-[110px] group-hover:text-slate-900">{cat.title}</span>
                    </div>
                  );
                })}

                {/* All Services Tile */}
                <div
                  onClick={() => setActiveModal('all')}
                  className="flex flex-col items-center gap-3 cursor-pointer group"
                >
                  <div className={`w-[100px] h-[100px] ${allServicesColor.bg} rounded-2xl flex items-center justify-center border ${allServicesColor.border} ${allServicesColor.hoverBorder} ${allServicesColor.hoverBg} transition-all duration-300 shadow-sm group-hover:shadow-md group-hover:-translate-y-1`}>
                    <span className={`material-symbols-outlined text-[42px] ${allServicesColor.text} ${allServicesColor.hoverText} transition-colors`}>apps</span>
                  </div>
                  <span className="text-[12px] font-bold text-slate-800 text-center leading-tight max-w-[110px] group-hover:text-slate-900">{t('lp_all_services')}</span>
                </div>
              </div>
            </motion.div>


          </div>

          {/* ── Right Side: Photo Collage (UC style) ── */}
          <div className="w-full lg:w-[58%] hidden lg:block">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="grid grid-cols-2 gap-4 h-[520px]">
              <div className="flex flex-col gap-4 h-full">
                <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?q=80&w=800&auto=format&fit=crop" alt="AC & Appliance Repair" className="w-full h-[55%] object-cover rounded-[2rem] shadow-sm hover:shadow-xl transition-shadow duration-300" />
                <img src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=800&auto=format&fit=crop" alt="Home Cleaning" className="w-full h-[43%] object-cover rounded-[2rem] shadow-sm hover:shadow-xl transition-shadow duration-300" />
              </div>
              <div className="flex flex-col gap-4 h-full">
                <img src="https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=800&auto=format&fit=crop" alt="Handyman Repair" className="w-full h-[43%] object-cover rounded-[2rem] shadow-sm hover:shadow-xl transition-shadow duration-300" />
                <img src="https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=800&auto=format&fit=crop" alt="Home Painting" className="w-full h-[55%] object-cover rounded-[2rem] shadow-sm hover:shadow-xl transition-shadow duration-300" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══════════ CATEGORY MODAL ═══════════ */}
      {activeModal && (
        <CategoryModal
          category={activeModal}
          onClose={() => setActiveModal(null)}
          navigate={navigate}
        />
      )}

      {/* ═══════════ OFFERS CAROUSEL ═══════════ */}
      {homeOffers.length > 0 && (
        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="section-container">
            <h2 className="text-3xl font-extrabold font-headline text-slate-900 tracking-tight mb-8">{t('lp_offers_title')}</h2>
            <div className="flex overflow-x-auto gap-6 pb-6 pt-1 no-scrollbar snap-x snap-mandatory">
              {homeOffers.map((offer, idx) => (
                <motion.div
                  initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={idx}
                  key={offer._id || idx}
                  className="min-w-[340px] md:min-w-[420px] max-w-[420px] h-[220px] rounded-[2rem] overflow-hidden relative shrink-0 snap-center cursor-pointer group shadow-sm hover:shadow-xl transition-all duration-300"
                  onClick={() => offer.targetUrl ? navigate(offer.targetUrl) : null}
                >
                  <img src={offer.imageUrl || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=2070'} alt={offer.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
                  <div className="absolute inset-0 p-8 flex flex-col justify-between items-start">
                    <div className="w-full">
                      <div className="flex justify-between items-start mb-2 w-full">
                        <h3 className="text-2xl font-extrabold font-headline text-white leading-tight max-w-[240px]">{offer.title}</h3>
                        {offer.userType === 'new' && (
                          <span className="bg-emerald-500/90 text-white px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider shrink-0 shadow-sm border border-emerald-400/50 backdrop-blur-md">New User</span>
                        )}
                      </div>
                      {offer.subtitle && <p className="text-white/90 font-medium text-sm mt-2 max-w-[220px] line-clamp-2">{offer.subtitle}</p>}
                      {!offer.isBannerOnly && offer.code && (
                        <div className="flex items-center gap-2 mt-3 z-20">
                          <span className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-extrabold text-white uppercase tracking-widest border border-white/30">{offer.code}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(offer.code);
                              toast.success(`Coupon code ${offer.code} copied!`);
                            }}
                            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 backdrop-blur-md flex items-center justify-center transition-colors border border-white/20"
                            title="Copy code"
                          >
                            <span className="material-symbols-outlined text-white text-[16px]">content_copy</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ═══════════ MOST BOOKED SERVICES ═══════════ */}
      <section className="py-16 bg-white border-t border-slate-100 overflow-hidden">
        <div className="section-container">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl md:text-4xl font-extrabold font-headline text-slate-900 tracking-tight mb-2">{t('lp_most_booked')}</h2>
              <p className="text-slate-500 font-medium text-lg">{t('lp_most_booked_desc')}</p>
            </div>
            <button className="hidden md:flex items-center gap-1 font-bold text-slate-900 hover:text-amber-600 transition-colors">
              {t('lp_see_all')} <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
            </button>
          </div>
          <div className="flex overflow-x-auto gap-6 pb-6 no-scrollbar snap-x snap-mandatory">
            {mostBookedServices.map((service, idx) => (
              <motion.div
                initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={idx}
                key={service.id}
                className="min-w-[280px] max-w-[280px] group cursor-pointer shrink-0 snap-start"
              >
                <div className="relative h-[280px] rounded-[2rem] overflow-hidden mb-5 shadow-sm group-hover:shadow-xl transition-all duration-300">
                  <img src={service.image} alt={service.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-sm">
                    <span className="material-symbols-outlined text-amber-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                    <span className="text-sm font-bold text-slate-800">{service.rating} <span className="text-slate-400 font-medium">({service.reviews})</span></span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight mb-2 group-hover:text-amber-600 transition-colors">{service.title}</h3>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-slate-900">{service.price}</span>
                  <span className="text-slate-400 text-sm line-through font-medium">{service.originalPrice}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CATEGORY SHOWCASES ═══════════ */}
      {categoryShowcases.map((catSection, sectionIdx) => (
        <section key={catSection.id} className={`py-16 ${sectionIdx % 2 !== 0 ? 'bg-slate-50' : 'bg-white'} border-t border-slate-100 overflow-hidden`}>
          <div className="section-container">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-3xl md:text-4xl font-extrabold font-headline text-slate-900 tracking-tight mb-2">{catSection.title}</h2>
                <p className="text-slate-500 font-medium text-lg">{catSection.subtitle}</p>
              </div>
            </div>
            <div className="flex overflow-x-auto gap-6 pb-6 no-scrollbar snap-x snap-mandatory">
              {catSection.items.map((item, idx) => (
                <motion.div
                  initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={idx}
                  key={item.id}
                  className="min-w-[220px] max-w-[220px] group cursor-pointer shrink-0 snap-start"
                >
                  <div className="relative h-[220px] rounded-[2rem] overflow-hidden mb-4 shadow-sm group-hover:shadow-lg transition-all duration-300">
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight mb-1 group-hover:text-amber-600 transition-colors">{item.title}</h3>
                  <span className="text-slate-500 font-medium text-sm">Starts at {item.price}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* ═══════════ TOOL RENTAL HIGHLIGHT ═══════════ */}
      <section className="py-20 bg-slate-900 border-t border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="section-container relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12">
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500/15 text-amber-400 font-bold text-sm tracking-widest uppercase mb-4 border border-amber-500/20">
                <span className="material-symbols-outlined text-base">construction</span> {t('lp_tool_badge')}
              </span>
              <h2 className="text-3xl md:text-5xl font-extrabold font-headline text-white tracking-tight mb-2">{t('lp_tool_title')}</h2>
              <p className="text-slate-400 font-medium text-lg max-w-xl">{t('lp_tool_desc')}</p>
            </div>
            <button onClick={handleRentClick} className="mt-6 md:mt-0 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-8 py-3.5 rounded-xl transition-colors shrink-0">{t('lp_browse_inventory')}</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {toolsData.map((c, i) => (
              <motion.div key={c.titleKey} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i} onClick={() => navigate('/rentals', { state: { category: t(c.titleKey) } })}
                className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden hover:bg-white/10 transition-all duration-300 cursor-pointer group">
                <div className="h-48 overflow-hidden relative">
                  <img src={c.image} alt={t(c.titleKey)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                  <span className="absolute bottom-4 left-4 material-symbols-outlined text-3xl text-amber-400 bg-slate-900/80 p-2 rounded-xl backdrop-blur-sm">{c.icon}</span>
                </div>
                <div className="p-6 pt-4">
                  <h4 className="text-white font-bold text-xl mb-1.5 font-headline group-hover:text-amber-400 transition-colors">{t(c.titleKey)}</h4>
                  <p className="text-slate-400 text-sm font-medium line-clamp-2">{t(c.descKey)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ NEW & NOTEWORTHY ═══════════ */}
      <section className="py-20 bg-white border-t border-slate-100 overflow-hidden">
        <div className="section-container">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold font-headline text-slate-900 tracking-tight">{t('lp_new_noteworthy')}</h2>
            <p className="text-slate-500 font-medium mt-3 text-lg max-w-2xl mx-auto">{t('lp_new_noteworthy_desc')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {newAndNoteworthy.map((item, i) => (
              <motion.div key={item.id} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className={`rounded-[2rem] overflow-hidden ${item.color} relative group cursor-pointer h-[320px] shadow-sm hover:shadow-xl transition-all duration-300`}>
                <img src={item.image} alt={item.title} className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-40 transition-transform duration-700 group-hover:scale-105 group-hover:opacity-60" />
                <div className="absolute inset-0 p-8 flex flex-col justify-between z-10">
                  <span className="inline-block bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-extrabold text-white uppercase tracking-widest border border-white/20 self-start">{item.badge}</span>
                  <h3 className={`text-3xl font-extrabold font-headline ${item.textColor} leading-tight max-w-[200px]`}>{item.title}</h3>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ TOP RATED PROFESSIONALS ═══════════ */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="section-container">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold font-headline text-slate-900 tracking-tight">{t('lp_top_rated')}</h2>
            <p className="text-slate-500 font-medium mt-3 text-lg max-w-2xl mx-auto">{t('lp_top_rated_desc')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {providers.map((p, i) => (
              <motion.div key={p.name} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} custom={i}
                className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden group hover:shadow-xl transition-all duration-300 flex flex-col">
                <div className="relative h-64 overflow-hidden">
                  <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" src={p.image} alt={p.name} loading="lazy" />
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                    <h3 className="text-2xl font-bold font-headline text-white">{p.name}</h3>
                    <div className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                      <span className="material-symbols-outlined text-amber-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                      <span className="text-sm font-bold text-slate-900">{p.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-4">
                    <p className="text-slate-500 font-bold text-sm bg-slate-100 px-3 py-1 rounded-full">{t(p.roleKey)}</p>
                    <span className="text-slate-900 font-extrabold text-lg">{p.price}</span>
                  </div>
                  {p.quote && (
                    <div className="mb-6 italic text-slate-600 text-sm border-l-2 border-amber-400 pl-3">
                      "{p.quote}"
                    </div>
                  )}
                  <button onClick={handleBookClick} className="mt-auto w-full py-3 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-colors">{t('sd_book_now')}</button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ WHY SEVA SARTHI ═══════════ */}
      <section className="py-24 bg-white border-t border-slate-100">
        <div className="section-container">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="bg-amber-50 p-8 rounded-[2rem] text-center border border-amber-100">
                    <h4 className="text-4xl font-extrabold text-amber-600 mb-2">4.8</h4>
                    <p className="text-slate-700 font-bold text-sm">{t('lp_avg_rating')}</p>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[2rem] text-center border border-slate-100">
                    <h4 className="text-4xl font-extrabold text-slate-900 mb-2">5M+</h4>
                    <p className="text-slate-700 font-bold text-sm">{t('lp_happy_customers')}</p>
                  </div>
                </div>
                <div className="space-y-6 mt-12">
                  <div className="bg-emerald-50 p-8 rounded-[2rem] text-center border border-emerald-100">
                    <h4 className="text-4xl font-extrabold text-emerald-600 mb-2">100%</h4>
                    <p className="text-slate-700 font-bold text-sm">{t('lp_verified_experts')}</p>
                  </div>
                </div>
              </div>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="order-1 lg:order-2">
              <h2 className="text-4xl md:text-5xl font-extrabold font-headline text-slate-900 tracking-tight mb-6">{t('lp_why_title')}</h2>
              <p className="text-slate-500 text-lg leading-relaxed mb-10">{t('lp_why_desc')}</p>
              <ul className="space-y-6">
                {[
                  { title: t('lp_feature1_title'), desc: t('lp_feature1_desc') },
                  { title: t('lp_feature2_title'), desc: t('lp_feature2_desc') },
                  { title: t('lp_feature3_title'), desc: t('lp_feature3_desc') }
                ].map((item, idx) => (
                  <li key={idx} className="flex gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-amber-600">check</span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-lg">{item.title}</h4>
                      <p className="text-slate-500 font-medium">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>
    </div>
  );
}
