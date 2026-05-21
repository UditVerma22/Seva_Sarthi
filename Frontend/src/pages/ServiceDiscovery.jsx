/* eslint-disable no-unused-vars */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { useProviderStore } from '../store/useProviderStore';
import { useLocationStore } from '../store/useLocationStore';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useLanguageStore } from '../store/useLanguageStore';
import { allCategories, getCategoryItems } from '../lib/constants';
import { searchAndFilter } from '../lib/searchEngine';

function ProCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-5 animate-pulse">
      <div className="w-full sm:w-48 h-48 rounded-xl bg-slate-100" />
      <div className="flex-grow py-2 space-y-4 flex flex-col justify-between">
        <div><div className="h-6 w-48 bg-slate-100 rounded mb-2" /><div className="h-4 w-32 bg-slate-100 rounded" /></div>
        <div className="h-4 w-full bg-slate-100 rounded" />
        <div className="flex justify-between items-end mt-4">
          <div className="h-8 w-24 bg-slate-100 rounded-lg" />
          <div className="flex gap-2"><div className="h-10 w-24 bg-slate-100 rounded-xl" /><div className="h-10 w-24 bg-slate-100 rounded-xl" /></div>
        </div>
      </div>
    </div>
  );
}

export default function ServiceDiscovery() {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser } = useAuthStore();
  const { services, loading: isLoading, fetchServices, aiSearchIntent } = useProviderStore();
  const { city } = useLocationStore();
  const { t } = useLanguageStore();

  // State from navigation
  const navState = location.state || {};

  const [searchTerm, setSearchTerm] = useState(navState.query || '');
  const [dbCategoryFilter, setDbCategoryFilter] = useState(navState.dbCategory || '');
  const [keywordsFilter, setKeywordsFilter] = useState(navState.keywords || []);
  const [displayName, setDisplayName] = useState(navState.displayName || '');
  const [maxPrice, setMaxPrice] = useState(5000);
  const [sortBy, setSortBy] = useState('relevance');
  const [minRating, setMinRating] = useState(0);
  const [isAiSearching, setIsAiSearching] = useState(false);

  useEffect(() => {
    fetchServices();
  }, [fetchServices, city]);

  // Sync state when navigation changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (navState.dbCategory) {
        setDbCategoryFilter(navState.dbCategory);
        setKeywordsFilter(navState.keywords || []);
        setDisplayName(navState.displayName || '');
        setSearchTerm('');
      }
      if (navState.query) {
        setSearchTerm(navState.query);
        setDbCategoryFilter('');
        setKeywordsFilter([]);
        setDisplayName('');
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [navState.dbCategory, navState.query, navState.displayName, navState.keywords]);

  const handleBookNow = (svc) => {
    const proId = svc.providerId?._id || svc.providerId;
    navigate(currentUser ? '/booking' : '/auth', {
      state: { providerId: proId, serviceId: svc._id, basePrice: svc.basePrice, serviceName: svc.name }
    });
  };
  const handleViewProfile = (proId) => navigate(currentUser ? `/provider/${proId}` : '/auth');

  const clearFilters = () => {
    setSearchTerm(''); setDbCategoryFilter(''); setKeywordsFilter([]); setDisplayName('');
    setMaxPrice(5000); setMinRating(0); setSortBy('relevance');
    // Clear navigation state
    window.history.replaceState({}, document.title);
  };

  const handleAiSearch = async () => {
    if (!searchTerm.trim()) return;
    setIsAiSearching(true);
    
    const intent = await aiSearchIntent(searchTerm);
    setIsAiSearching(false);
    
    if (intent && intent.success) {
      if (intent.category && intent.category !== 'General' && intent.category !== 'Tool Rental') {
        setDbCategoryFilter(intent.category);
        setKeywordsFilter([]);
        setDisplayName(intent.category);
      }
      if (intent.search) {
        setSearchTerm(intent.search);
      }
      if (intent.category === 'Tool Rental') {
        navigate('/rentals', { state: { query: intent.search }});
      }
    }
  };

  /* ── INDUSTRY-LEVEL SMART FILTERING (powered by searchEngine) ── */
  const filteredServices = useMemo(() => {
    return searchAndFilter(services, searchTerm, {
      dbCategory: dbCategoryFilter,
      keywords: keywordsFilter,
      maxPrice,
      minRating,
      sortBy,
      priceField: 'basePrice',
    });
  }, [services, searchTerm, dbCategoryFilter, keywordsFilter, maxPrice, minRating, sortBy]);

  const isFiltered = searchTerm || dbCategoryFilter;
  const pageTitle = displayName
    ? `${displayName} Services`
    : dbCategoryFilter
      ? `${dbCategoryFilter} Services`
      : searchTerm
        ? `Results for "${searchTerm}"`
        : 'Explore Services';

  return (
    <div className="min-h-screen bg-slate-50 pt-8 pb-20">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header & Search */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold font-headline text-slate-900 tracking-tight">
                {pageTitle}
              </h1>
              {isFiltered && (
                <button onClick={clearFilters} className="mt-2 text-sm font-semibold text-amber-600 hover:underline flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">arrow_back</span> {t('sd_back_to_all')}
                </button>
              )}
            </div>
            <div className="relative w-full md:w-[450px]">
              <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 transition-all">
                <span className="material-symbols-outlined pl-4 text-slate-400">search</span>
                <input
                  type="text"
                  placeholder={t('search_placeholder')}
                  className="flex-grow px-3 py-3 bg-transparent border-none focus:ring-0 text-slate-800 font-medium text-sm"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); if (e.target.value) { setDbCategoryFilter(''); setKeywordsFilter([]); setDisplayName(''); } }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAiSearch();
                  }}
                />
                {searchTerm && !isAiSearching && (
                  <button onClick={() => setSearchTerm('')} className="p-1 mr-1 text-slate-400 hover:text-slate-600">
                    <span className="material-symbols-outlined text-xl">close</span>
                  </button>
                )}
                {isAiSearching && (
                  <div className="p-1 mr-2 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                <button 
                  onClick={handleAiSearch}
                  disabled={isAiSearching || !searchTerm.trim()}
                  className="bg-slate-900 text-white px-4 py-3 font-bold text-sm hover:bg-slate-800 transition-colors flex items-center gap-1.5 disabled:opacity-70"
                >
                  <span className="material-symbols-outlined text-amber-400 text-[18px]">auto_awesome</span>
                  {t('sd_ai_search')}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2 font-medium flex items-center gap-1.5 pl-2">
                <span className="material-symbols-outlined text-[14px] text-amber-500">lightbulb</span>
                {t('sd_try_search')}
              </p>
            </div>
          </div>
        </div>

        {/* Category Landing View (no filters active) */}
        {!isFiltered ? (
          <div className="space-y-12">
            {allCategories.map((cat) => {
              const items = getCategoryItems(cat);
              return (
                <div key={cat.id} className="bg-white p-7 rounded-2xl border border-slate-200">
                  <h2 className="text-xl font-bold text-slate-900 mb-6">{cat.title}</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                    {items.map((item, i) => (
                      <div
                        key={i}
                        onClick={() => { setDbCategoryFilter(item.dbCategory); setKeywordsFilter(item.keywords); setDisplayName(item.name); }}
                        className="flex flex-col items-center gap-2.5 cursor-pointer group"
                      >
                        <div className="w-[80px] h-[80px] bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 group-hover:border-amber-300 group-hover:bg-amber-50 transition-all">
                          <span className="material-symbols-outlined text-[32px] text-slate-500 group-hover:text-amber-600 transition-colors">{item.icon}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 text-center leading-tight max-w-[100px] group-hover:text-amber-700">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Filtered Results View */
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Sidebar Filters */}
            <aside className="w-full lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 sticky top-24">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><span className="material-symbols-outlined text-amber-600 text-lg">tune</span> {t('sd_filters')}</h3>
                  <button onClick={clearFilters} className="text-xs font-bold text-amber-600 hover:underline">{t('sd_clear_all')}</button>
                </div>

                <div className="mb-6">
                  <h4 className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wider">{t('sd_sort_by')}</h4>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-bold text-slate-700 focus:border-amber-500 outline-none cursor-pointer">
                    <option value="relevance">{t('sd_relevance')}</option>
                    <option value="highestRated">{t('sd_highest_rated')}</option>
                    <option value="lowestPrice">{t('sd_lowest_price')}</option>
                    <option value="highestPrice">{t('sd_highest_price')}</option>
                  </select>
                </div>

                <div className="mb-6">
                  <h4 className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wider flex justify-between">
                    <span>{t('sd_max_price')}</span><span className="text-amber-600">₹{maxPrice}</span>
                  </h4>
                  <input type="range" min="200" max="5000" step="100" value={maxPrice} onChange={(e) => setMaxPrice(parseInt(e.target.value))} className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-amber-600" />
                  <div className="flex justify-between mt-1.5 text-[10px] font-bold text-slate-400"><span>₹200</span><span>₹5000+</span></div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wider">{t('sd_rating')}</h4>
                  <div className="space-y-1.5">
                    {[4, 3].map(rating => (
                      <button key={rating} onClick={() => setMinRating(minRating === rating ? 0 : rating)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold transition-all border ${minRating === rating ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-200'}`}>
                        <span className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-amber-400 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                          {rating}.0 {t('sd_rating_above')}
                        </span>
                        {minRating === rating && <span className="material-symbols-outlined text-sm">check_circle</span>}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            {/* Results Grid */}
            <div className="flex-grow">
              <div className="mb-5">
                <p className="text-slate-500 font-medium text-sm">{filteredServices.length} {t('sd_professionals_found')}</p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                <AnimatePresence>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <ProCardSkeleton key={`sk-${i}`} />)
                  ) : (
                    filteredServices.map((svc) => {
                      const proName = svc.providerId?.name || 'Expert';
                      const avatar = svc.providerId?.avatar || `https://ui-avatars.com/api/?name=${proName}&background=F59E0B&color=fff`;
                      const providerIdStr = svc.providerId?._id || svc.providerId;

                      return (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} key={svc._id}
                          onClick={() => handleViewProfile(providerIdStr)}
                          className="bg-white rounded-2xl border border-slate-200 p-4 group hover:shadow-lg hover:border-amber-200 transition-all duration-300 cursor-pointer">
                          <div className="flex flex-col sm:flex-row gap-5 h-full">
                            <div className="relative w-full sm:w-44 h-44 sm:h-auto flex-shrink-0 overflow-hidden rounded-xl">
                              <img src={svc.image || avatar} alt={svc.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                              <div className="absolute top-2.5 left-2.5 bg-white/95 backdrop-blur px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                                <span className="material-symbols-outlined text-amber-400 text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                <span className="text-[11px] font-bold text-slate-800">{svc.rating || '4.8'}</span>
                              </div>
                            </div>
                            <div className="flex flex-col flex-grow">
                              <div className="mb-1.5">
                                <h3 onClick={() => handleViewProfile(providerIdStr)} className="text-lg font-extrabold text-slate-900 cursor-pointer hover:text-amber-600 transition-colors leading-tight mb-0.5">{svc.name}</h3>
                                <p className="text-slate-500 text-xs font-medium">By {proName}</p>
                              </div>
                              <p className="text-slate-600 text-sm leading-relaxed line-clamp-2 mb-3 flex-grow">{svc.description}</p>
                              <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-100">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('sd_starts_at')}</span>
                                  <span className="text-xl font-black text-slate-900">₹{svc.basePrice || 299}</span>
                                </div>
                                  <button onClick={(e) => { e.stopPropagation(); handleBookNow(svc); }} className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-slate-900 hover:bg-amber-600 transition-all shadow-sm">{t('sd_book_now')}</button>
                                </div>
                              </div>
                            </div>
                        </motion.div>
                      );
                    })
                  )}
                </AnimatePresence>

                {!isLoading && filteredServices.length === 0 && (
                  <div className="col-span-full py-20 bg-white rounded-2xl border border-slate-200 flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-5">
                      <span className="material-symbols-outlined text-3xl text-slate-400">search_off</span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">{t('sd_no_services')}</h3>
                    <p className="text-slate-500 max-w-md mb-5 text-sm">{t('sd_no_services_hint')}</p>
                    <button onClick={clearFilters} className="px-6 py-2.5 bg-amber-50 text-amber-700 font-bold rounded-lg hover:bg-amber-100 transition-colors text-sm">{t('sd_clear_filters')}</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
