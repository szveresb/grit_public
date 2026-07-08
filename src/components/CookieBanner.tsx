import React, { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { FShield } from '@/components/icons/FreudIcons';
import { motion, AnimatePresence } from 'framer-motion';

const CACHE_KEY = 'grit_cookie_consent_v1';

const CookieBanner: React.FC = () => {
  const { t, localePath } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check local storage consent
    const hasConsent = localStorage.getItem(CACHE_KEY);
    if (hasConsent) return;

    // Check if we are on grit.hu (production) or localhost (for development/testing)
    const hostname = window.location.hostname;
    const isProd = hostname === 'grit.hu' || hostname === 'www.grit.hu';
    const isDev = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';

    if (isProd || isDev) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(CACHE_KEY, 'true');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="fixed bottom-6 left-4 right-4 md:left-auto md:right-6 z-50 max-w-lg"
        >
          <div className="bg-card/85 backdrop-blur-xl border border-border/60 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-5 justify-between">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                <FShield className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  {t.legal.cookieBanner.text}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 w-full md:w-auto justify-end flex-shrink-0">
              <a
                href={localePath('/cookies')}
                className="text-xs text-muted-foreground hover:text-foreground font-semibold uppercase tracking-wider underline underline-offset-4 decoration-border/80 hover:decoration-foreground/60 transition-all"
              >
                {t.legal.cookieBanner.policy}
              </a>
              <button
                onClick={handleAccept}
                className="bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-sm font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                {t.legal.cookieBanner.accept}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieBanner;
