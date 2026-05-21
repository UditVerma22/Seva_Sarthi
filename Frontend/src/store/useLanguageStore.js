import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import en from '../i18n/en';
import hi from '../i18n/hi';

const translations = { en, hi };

export const useLanguageStore = create(
  persist(
    (set, get) => ({
      language: 'en',

      setLanguage: (lang) => {
        document.documentElement.lang = lang;
        set({ language: lang });
      },

      toggleLanguage: () => {
        // Obsolete, keeping for backwards compatibility. Layout uses setLanguage now.
        const nextLang = get().language === 'en' ? 'hi' : 'en';
        document.documentElement.lang = nextLang;
        set({ language: nextLang });
      },

      t: (key) => {
        const lang = get().language;
        return translations[lang]?.[key] || translations['en']?.[key] || key;
      }
    }),
    {
      name: 'language-storage',
    }
  )
);
