/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Don't show immediately if they just dismissed it recently (could use localStorage here)
      const dismissed = localStorage.getItem('pwa_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_dismissed', 'true');
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-brand text-white p-4 rounded-2xl shadow-premium z-[9999] border border-white/10"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-brand">install_mobile</span>
            </div>
            <div className="flex-1">
              <h4 className="font-bold text-sm">Install Seva Sarthi</h4>
              <p className="text-xs text-slate-300 mt-1">Get faster access and offline support by installing our app.</p>
              <div className="flex gap-2 mt-3">
                <button onClick={handleInstallClick} className="bg-accent text-brand font-bold text-xs px-4 py-2 rounded-lg flex-1">
                  Install
                </button>
                <button onClick={handleDismiss} className="bg-white/10 text-white font-bold text-xs px-4 py-2 rounded-lg">
                  Not Now
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
