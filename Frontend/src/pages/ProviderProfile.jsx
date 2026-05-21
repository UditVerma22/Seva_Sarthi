/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/axios';

import { useProviderStore } from '../store/useProviderStore';
import { useEffect } from 'react';

const portfolioImages = [
  { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCt2GmXSyCw-7hYkoayCp3Ye1YtmE68PhvZVLorR8ZRxoGysKSITxkwqD-kdIDHJpFyAc-Nwb9zReM7ENOPVR46RsZpRZ6ksuRyV7fGOHDeREJzWCyDsjfuunZ-dlGWeBtxsoWj0dTLm9PzK8I3B-i3F4PnA0Jk8-rLLJmruLQbYiTb-PDFu_kjrv4cNQE_vmJoOPWAw1KEJEhVy6DaXD9SOKWo_jYzbyfcbi18-9SxqBErnJt3okv4DMbD1z0NEwqWmXN0ayhOhAs', label: 'Circuit Upgrade' },
  { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDnn4100MrBxYDecTDKmiP2GD_7lr9PXUwuYcJd_yFINYFV5Jl4TVWY5YlBWP9Nm8l6qfnejV62Al3DiYEWIjx8ricvNkg8cg5EqccfbF03ZVQzqNgpD8Km1GDAjKSTuTEepSL3DeY8nM0RGBhZ7yqQcTCxbqleNKy2-TMWiruqFQjrSDLhoWBQt8mfsMq_pVUq8pDOupfoP98VowIyJOeyHXMi5tDTlg70D7XmOlz65wkvxg8uoXnQop7WB4ecxdW2HPxhp22TBos', label: 'Plumbing Repair' },
  { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAUyEj8ZyaDAqwm01GnIgLjIDqBRcwckvYPZ5nJUi7qCSDGqwCK0s1HcDvRc6Vg1Y-kVT1ls7zfAFpzQixVERsdMH4TtGAiQ4xoOAmIngvKI-3FGIhufSBqE-cMxIWu4rGTM6bw6z4WpQJsi4Y02chkHX8C-BK9MDVGzTHduFdXweqeXgcZAl0qeLE8szMTQJmr9qsF76b82mPGY-liYOcH0p6bW5bFpb_mtdbqWmGCFlgj1s2Czn27HgM1TC2n7E90B5jHjd7151E', label: 'Smart Home Setup' },
  { src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAHOuq3upHmRAJgdCzUJCF-ChIJdHRA7G0GqhtVNyR3n3VsXKQ4TUserDr5FGDV7AuaOsiEy6m4qV-U3vdhLLM5-qF6ikSwJ5-V9yVFZ3tPVG3lZIdr0_Kw3fDip-_kvPOwE99EniwSlEJWiR5LwpK-Lu1amuZ7oB6gSJOKVMlHOxS6kMBZ8BJNBjb31nHCm8BzbvABc1siGCLFG33DNqqT3lrk-HEilVePFAZqiLnl6ju7luy422XJZDBFFdcxOboZFFteXSEH-Nk', label: 'Solar Install' },
];

export default function ProviderProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getProviderById } = useProviderStore();
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await getProviderById(id);
      setProvider(data);
      if (data && data._id) {
        try {
          const res = await api.get(`/reviews/provider/${data._id}`);
          if (res.success) setReviews(res.data.reviews || []);
        } catch (e) {
          console.error('Failed to load reviews');
        }
      }
      setLoading(false);
    };
    load();
  }, [id, getProviderById]);

  const [activeTab, setActiveTab] = useState('about');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-slate-500">Loading professional profile...</div>;
  }

  if (!provider) {
    return <div className="min-h-screen flex items-center justify-center font-bold text-rose-500">Provider not found</div>;
  }

  const proName = provider.userId?.name || provider.user?.name || 'Professional';
  const avatar = provider.userId?.avatar || provider.user?.avatar || `https://ui-avatars.com/api/?name=${proName}&background=0D8B8B&color=fff`;
  const role = provider.title || 'Service Expert';
  const minPrice = provider.pricePerHour || 0;
  const years = provider.experience || 'New';
  const rating = provider.rating || 0;
  const reviewsCount = provider.reviewCount || 0;
  const jobsCompleted = provider.jobsCompleted || 0;
  const ratingBreakdown = provider.ratingBreakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const bio = provider.bio || 'I specialize in providing high-quality services.';
  const skills = provider.skills?.length > 0 ? provider.skills : ['Skilled Professional'];
  const portfolio = provider.portfolio?.length > 0 ? provider.portfolio : portfolioImages;

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-surface-muted pb-20 relative">
      
      <main className="max-w-7xl mx-auto px-4 md:px-8 pt-6 relative z-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-slate-500 font-bold hover:text-brand transition-colors mb-4">
          <span className="material-symbols-outlined text-lg">arrow_back</span> Back
        </button>
        
        {/* Header Profile Card */}
        <header className="mb-8 bg-surface rounded-3xl p-8 md:p-10 shadow-card border border-slate-200/60 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start relative z-10">
            <div className="relative flex-shrink-0">
              <div className="w-36 h-36 rounded-3xl overflow-hidden shadow-premium border-4 border-surface bg-slate-100">
                <img alt="Provider" className="w-full h-full object-cover" loading="lazy" src={avatar} />
              </div>
              <div className="absolute -bottom-3 -right-3 bg-emerald-500 text-white px-3 py-1.5 rounded-xl flex items-center gap-1 text-[11px] font-bold shadow-sm uppercase tracking-widest border-2 border-surface">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span> Verified
              </div>
            </div>
            
            <div className="text-center md:text-left flex-1 mt-2">
              <h1 className="text-3xl md:text-4xl font-extrabold font-headline tracking-tight text-brand mb-2">{proName}</h1>
              <p className="text-slate-500 font-medium flex items-center justify-center md:justify-start gap-2 mb-5">
                <span className="material-symbols-outlined text-accent-dark text-xl">construction</span>
                {role}
              </p>
              
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <div className="flex items-center gap-1.5 bg-accent/10 px-4 py-2 rounded-xl border border-accent/20">
                  <span className="material-symbols-outlined text-accent-dark" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  <span className="font-extrabold text-brand text-lg leading-none">{rating}</span>
                  <span className="text-slate-500 text-sm font-semibold ml-1">({reviewsCount} reviews)</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/60">
                  <span className="material-symbols-outlined text-slate-400">history</span>
                  <span className="text-slate-600 font-bold text-sm">{years}</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200/60 hidden md:flex">
                  <span className="material-symbols-outlined text-emerald-500">task_alt</span>
                  <span className="text-slate-600 font-bold text-sm">{jobsCompleted}+ Jobs Completed</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          <div className="lg:col-span-8 space-y-8">
            
            {/* Navigation Tabs */}
            <div className="flex items-center gap-6 border-b border-slate-200 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
              {['about', 'portfolio', 'reviews'].map(tab => (
                <button 
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`pb-4 px-2 text-sm font-bold uppercase tracking-widest transition-colors relative flex-shrink-0 whitespace-nowrap ${activeTab === tab ? 'text-brand' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {tab}
                  {activeTab === tab && (
                    <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-1 bg-accent rounded-t-full" />
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'about' && (
                <motion.div key="about" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-8">
                  <section className="bg-surface rounded-3xl p-8 shadow-sm border border-slate-200/60">
                    <h2 className="text-xl font-extrabold font-headline mb-4 text-brand">About Me</h2>
                    <p className="text-slate-500 font-medium leading-relaxed whitespace-pre-line">
                      {bio}
                    </p>
                  </section>

                  <section>
                    <div className="bg-surface rounded-3xl p-8 shadow-sm border border-slate-200/60">
                      <h3 className="text-lg font-bold font-headline mb-5 flex items-center gap-2 text-brand">
                        <span className="material-symbols-outlined text-accent-dark">psychology</span>Skills
                      </h3>
                      <div className="flex flex-wrap gap-2.5">
                        {skills.map(s => (
                          <span key={s} className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-sm font-bold text-slate-600">{s}</span>
                        ))}
                      </div>
                    </div>
                  </section>
                </motion.div>
              )}

              {activeTab === 'portfolio' && (
                <motion.div key="portfolio" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-8">
                  <section className="bg-surface rounded-3xl p-8 shadow-sm border border-slate-200/60">
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-extrabold font-headline text-brand">Past Work & Portfolio</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {portfolio.map((img, i) => (
                        <div key={i} className={`rounded-2xl overflow-hidden relative group cursor-pointer ${i === 0 ? 'md:col-span-2 md:row-span-2 aspect-auto' : 'aspect-square'}`}>
                          <img className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" src={img.image || img.src} alt={img.label} loading="lazy" />
                          <div className="absolute inset-0 bg-brand/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                            <span className="text-surface text-[11px] font-bold uppercase tracking-widest px-4 py-2 bg-brand/80 backdrop-blur-sm rounded-xl border border-white/20">
                              {img.label}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </motion.div>
              )}

              {activeTab === 'reviews' && (
                <motion.div key="reviews" initial={{opacity:0, y:10}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-10}} className="space-y-8">
                  
                  {/* Detailed Rating Breakdown */}
                  <section className="bg-surface rounded-3xl p-8 shadow-sm border border-slate-200/60">
                    <h2 className="text-xl font-extrabold font-headline text-brand mb-6">Rating & Reviews</h2>
                    
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                      <div className="flex flex-col items-center justify-center min-w-[150px]">
                        <h3 className="text-6xl font-extrabold font-headline text-brand">{rating}</h3>
                        <div className="flex text-accent mt-2 mb-1">
                          {[1,2,3,4,5].map(s => <span key={s} className="material-symbols-outlined text-[20px]" style={{fontVariationSettings:"'FILL' 1"}}>star</span>)}
                        </div>
                        <p className="text-sm font-bold text-slate-400">{reviewsCount} verified reviews</p>
                      </div>
                      
                      <div className="flex-1 w-full border-l border-slate-100 md:pl-8">
                        {[5,4,3,2,1].map(star => {
                          const count = ratingBreakdown[star] || 0;
                          const percent = reviewsCount > 0 ? (count / reviewsCount) * 100 : 0;
                          return (
                            <div key={star} className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-bold text-slate-500 w-3">{star}</span>
                              <span className="material-symbols-outlined text-[16px] text-accent" style={{fontVariationSettings:"'FILL' 1"}}>star</span>
                              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-accent rounded-full" style={{width: `${percent}%`}}></div>
                              </div>
                              <span className="text-xs font-bold text-slate-400 w-8 text-right">{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </section>

                  {/* Individual Reviews */}
                  <section className="space-y-4">
                    {reviews.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 font-medium">No reviews yet.</div>
                    ) : (
                      reviews.map((r, idx) => {
                        const rName = r.userId?.name || 'User';
                        const rImg = r.userId?.avatar;
                        const dateStr = new Date(r.createdAt).toLocaleDateString();
                        return (
                          <div key={r._id || idx} className="bg-surface rounded-3xl p-6 shadow-sm border border-slate-200/60 flex flex-col sm:flex-row gap-5">
                            <div className="flex-shrink-0">
                              {rImg ? 
                                <img className="w-12 h-12 rounded-2xl object-cover shadow-sm" src={rImg} alt={rName} /> : 
                                <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent-dark flex items-center justify-center font-bold text-lg border border-accent/20">
                                  {rName.charAt(0).toUpperCase()}
                                </div>
                              }
                            </div>
                            <div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                                <p className="font-bold text-base text-brand">{rName}</p>
                                <div className="flex text-accent">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i} className={`material-symbols-outlined text-[14px] ${i < r.rating ? 'text-accent' : 'text-slate-200'}`} style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                  ))}
                                </div>
                                <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{dateStr}</span>
                              </div>
                              <p className="text-slate-600 font-medium leading-relaxed">{r.comment}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </section>
                </motion.div>
              )}
            </AnimatePresence>

          </div>

          {/* Sticky Booking Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-28 space-y-6">
              <div className="bg-surface rounded-3xl shadow-card border border-slate-200/60 p-8 text-center">
                <div className="w-16 h-16 bg-accent/10 text-accent-dark rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl">construction</span>
                </div>
                <h3 className="text-xl font-extrabold text-brand mb-2">Ready to book?</h3>
                <p className="text-sm text-slate-500 font-medium mb-6">Choose a service and select a convenient time for {proName} to visit.</p>
                <Link to="/booking" state={{ providerId: provider._id || id, basePrice: minPrice > 0 ? minPrice : 299, serviceName: provider.title || 'Professional Service' }} className="block text-center w-full btn-accent !py-4 text-base shadow-premium">
                  Book This Professional
                </Link>
                <p className="text-xs text-slate-400 font-semibold mt-4">You won't be charged yet</p>
              </div>

              <div className="bg-surface-muted rounded-3xl border border-slate-200/60 p-6 flex items-start gap-4 shadow-sm">
                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-brand text-2xl" style={{fontVariationSettings:"'FILL' 1"}}>verified_user</span>
                </div>
                <div>
                  <h4 className="font-bold text-brand text-sm mb-1.5">Seva Protection</h4>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">This provider is fully insured and covered under the <strong className="text-brand">Quality Guarantee</strong> up to ₹10,000.</p>
                </div>
              </div>
            </div>
          </aside>
          
        </div>
      </main>
    </div>
  );
}
