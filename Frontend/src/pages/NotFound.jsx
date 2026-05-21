import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguageStore } from '../store/useLanguageStore';

export default function NotFound() {
  const location = useLocation();
  const { t } = useLanguageStore();

  return (
    <div className="min-h-screen bg-slate-50 pt-28 pb-20 px-6">
      <main className="max-w-3xl mx-auto text-center">
        <p className="text-xs font-black tracking-widest uppercase text-slate-400">404</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-black tracking-tight text-slate-900">
          {t('not_found_title')}
        </h1>
        <p className="mt-4 text-slate-600 font-medium">
          {t('not_found_hint')} <span className="font-bold text-slate-900">{location.pathname}</span>.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/"
            className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-teal-600 transition-colors"
          >
            {t('not_found_home')}
          </Link>
          <Link
            to="/services"
            className="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-800 font-bold hover:border-slate-300 hover:bg-slate-50 transition-colors"
          >
            {t('not_found_browse')}
          </Link>
        </div>
      </main>
    </div>
  );
}
