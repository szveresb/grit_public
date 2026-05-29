import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { FLock, FArrowRight } from '@/components/icons/FreudIcons';
import { Button } from '@/components/ui/button';
import PublicHeader from '@/components/PublicHeader';
import SystemPreview from '@/components/SystemPreview';
import NewsFeed from '@/components/landing/NewsFeed';

const Index = () => {
  const { user } = useAuth();
  const { t, localePath } = useLanguage();
  const [bgLoaded, setBgLoaded] = useState(false);

  useEffect(() => {
    // Lazy-load background image after initial paint to avoid blocking LCP
    import('@/assets/bamboo-bg.jpg').then((mod) => { setBgLoaded(true); (window as any).__bambooBg = mod.default; });
  }, []);

  const bambooBgUrl = bgLoaded ? (window as any).__bambooBg : undefined;

  return (
    <div className="min-h-screen relative w-full overflow-x-hidden">
      {bambooBgUrl && <div className="fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${bambooBgUrl})`, opacity: 0.12 }} />}
      <div className="fixed inset-0 z-0 bg-background/80" />

      <PublicHeader />

      {/* Hero */}
      <section className="relative z-10 px-4 md:px-8 pt-24 pb-16 max-w-7xl mx-auto text-center">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight text-balance">
            {t.landing.heroTitle}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto text-balance">
            {t.landing.heroSubtitle}
          </p>

          {!user ? (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Button size="lg" className="rounded-full px-8 h-12 text-md font-semibold" asChild>
                <Link to={localePath('/auth')}>{t.landing.heroLabelSignIn}</Link>
              </Button>
            </div>
          ) : (
            <div className="mt-8 flex justify-center pt-4">
              <Button size="lg" className="rounded-full px-8 h-12 text-md font-semibold" asChild>
                <Link to={localePath('/journal')}>{t.landing.goToJournal}</Link>
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Features + News side-by-side */}
      <section className="relative z-10 px-4 md:px-8 py-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <div>
            <div className="text-center mb-12">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground uppercase tracking-[0.2em] opacity-80">
                {t.landing.featuresTitle}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-8">
              {[t.landing.feature1, t.landing.feature2, t.landing.feature3, t.landing.feature4, t.landing.feature5].map((feature, idx) => (
                <div key={idx} className="flex gap-4 group">
                  <div className="flex-shrink-0 w-10 h-10 rounded-2xl bg-accent/50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    {idx === 0 && <FLock className="w-5 h-5" />}
                    {idx === 1 && <FLock className="w-5 h-5 scale-x-[-1]" />}
                    {idx === 2 && <FArrowRight className="w-5 h-5" />}
                    {idx === 3 && <FLock className="w-5 h-5" />}
                    {idx === 4 && <FArrowRight className="w-5 h-5" />}
                  </div>
                  <p className="text-sm md:text-base text-muted-foreground leading-relaxed pt-1.5 translate-y-[-2px]">
                    {feature}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <NewsFeed />
        </div>
      </section>

      {/* Embedded System Previews (Inert) */}
      <SystemPreview />

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">{t.landing.footerRights.replace('{year}', String(new Date().getFullYear()))}</span>
          <div className="flex items-center flex-wrap justify-center gap-x-6 gap-y-2">
            <Link to={localePath('/about-legal')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.nav.about} Grit.hu</Link>
            <Link to={localePath('/terms')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.landing.terms}</Link>
            <Link to={localePath('/cookies')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.landing.cookies}</Link>
            <Link to={localePath('/gdpr')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.landing.gdpr}</Link>
            <Link to={localePath('/impressum')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.legal.impressum.title}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
