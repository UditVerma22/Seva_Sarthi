/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguageStore } from '../store/useLanguageStore';

const langMap = {
  en: 'en-IN',
  hi: 'hi-IN'
};

const VoiceSearch = ({ onSearch, placeholder = "What do you need help with?" }) => {
  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState(null);
  
  const recognitionRef = useRef(null);

  const { language } = useLanguageStore();

  useEffect(() => {
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = langMap[language] || 'en-IN';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setQuery(transcript);
        setIsListening(false);
        // Delay the search so the user can see what was typed and verify it
        setTimeout(() => {
          if (onSearch) onSearch(transcript);
        }, 1500);
      };

      recognitionRef.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setError("Couldn't hear clearly. Try again.");
        setIsListening(false);
        setTimeout(() => setError(null), 3000);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    } else {
      setError("Voice search is not supported in this browser.");
    }
  }, [onSearch, language]);

  const playBeep = () => {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      // Ignore audio context errors
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (!recognitionRef.current) {
        setError("Voice search not supported.");
        setTimeout(() => setError(null), 3000);
        return;
      }
      setQuery("");
      playBeep();
      recognitionRef.current.start();
      setIsListening(true);
      setError(null);
    }
  };

  const handleInputChange = (e) => {
    setQuery(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim() && onSearch) {
      onSearch(query);
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit} className={`relative flex items-center bg-surface border-2 rounded-2xl shadow-card transition-all duration-300 ${isListening ? 'border-accent shadow-premium scale-[1.02]' : 'border-slate-200/60 hover:border-brand/30'}`}>
        
        {/* Search Icon */}
        <div className="pl-5 pr-3 text-slate-400">
          <span className="material-symbols-outlined text-[28px]">search</span>
        </div>

        <input
          type="text"
          className="flex-1 py-4.5 px-2 bg-transparent border-none focus:outline-none text-brand text-lg font-medium placeholder-slate-400"
          placeholder={isListening ? "Listening..." : placeholder}
          value={query}
          onChange={handleInputChange}
          disabled={isListening}
        />

        {/* Voice Button */}
        <button
          type="button"
          onClick={toggleListening}
          className={`p-3 mr-3 rounded-xl transition-all duration-300 flex items-center justify-center
            ${isListening ? 'bg-accent/10 text-accent-dark' : 'text-slate-400 hover:text-brand hover:bg-slate-100'}
          `}
        >
          {isListening ? (
             <span className="relative flex h-6 w-6 items-center justify-center">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
               <span className="relative inline-flex rounded-full h-4 w-4 bg-accent"></span>
             </span>
          ) : (
            <span className="material-symbols-outlined text-[26px]">mic</span>
          )}
        </button>

        {/* Search Submit Button (Optional on Desktop) */}
        <button type="submit" className="hidden md:flex btn-primary mr-2 !py-2.5 !rounded-xl">
          Search
        </button>
      </form>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-3 bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">error</span>
            {error}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VoiceSearch;
