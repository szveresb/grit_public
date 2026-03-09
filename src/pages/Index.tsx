import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { FLock, FArrowRight, FMenu, FClose } from '@/components/icons/FreudIcons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import LanguageToggle from '@/components/LanguageToggle';
import ArticleCard from '@/components/ArticleCard';
import LandingPreview from '@/components/LandingPreview';
import bambooBg from '@/assets/bamboo-bg.jpg';

interface LibraryArticle {
  id: string;
  title: string;
  excerpt: string | null;
  source: string | null;
  url: string | null;
  category: string;
}

const Index = () => {
  const { user } = useAuth();
  const { t, localePath } = useLanguage();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<LibraryArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    supabase.from('library_articles').select('id, title, excerpt, source, category, url').eq('published', true).order('created_at', { ascending: false }).limit(6)
      .then(({ data }) => { setArticles((data as LibraryArticle[]) ?? []); setArticlesLoading(false); });
  }, []);

  const handleGatedClick = (path: string) => {
    navigate(user ? localePath(path) : localePath('/auth'));
  };

  const samplePreviewQuestions = [
    { text: t.sampleQuestions.q1, type: t.sampleQuestions.q1Type },
    { text: t.sampleQuestions.q2, type: t.sampleQuestions.q2Type },
    { text: t.sampleQuestions.q3, type: t.sampleQuestions.q3Type },
  ];

  return (
    <div className="min-h-screen relative w-full overflow-x-hidden">
      <div className="fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${bambooBg})`, opacity: 0.12 }} />
      <div className="fixed inset-0 z-0 bg-background/80" />

      {/* Header */}
      <header className="relative z-10 border-b border-border bg-card/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 py-4">
          <Link to={localePath('/')} className="text-lg font-bold tracking-tight text-foreground">
            {t.brand}
          </Link>
          <nav className="hidden lg:flex items-center justify-center flex-1 gap-8">
            <Link to={localePath('/library')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t.nav.library}</Link>
            <button onClick={() => handleGatedClick('/journal')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              {t.nav.checkIn}
              {!user && <FLock className="h-3 w-3" />}
            </button>
            <Link to={localePath('/about-legal')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t.nav.about}</Link>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            {user ? (
              <Button variant="outline" size="sm" className="rounded-full px-4" onClick={() => navigate(localePath('/dashboard'))}>
                {t.dashboard}
              </Button>
            ) : (
              <Button size="sm" className="rounded-full px-4" onClick={() => navigate(localePath('/auth'))}>
                {t.getStarted}
              </Button>
            )}
            <button
              className="lg:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Menu"
            >
              {mobileMenuOpen ? <FClose className="h-5 w-5" /> : <FMenu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="lg:hidden border-t border-border bg-card/90 backdrop-blur-xl overflow-hidden"
            >
              <div className="px-4 py-4 space-y-1">
                <Link to={localePath('/library')} onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-3 rounded-2xl text-sm font-medium text-foreground hover:bg-accent/50 transition-colors">{t.nav.library}</Link>
                <button onClick={() => { handleGatedClick('/journal'); setMobileMenuOpen(false); }} className="w-full text-left py-2.5 px-3 rounded-2xl text-sm font-medium text-foreground hover:bg-accent/50 transition-colors flex items-center gap-1.5">
                  {t.nav.checkIn}
                  {!user && <FLock className="h-3 w-3" />}
                </button>
                <Link to={localePath('/about-legal')} onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-3 rounded-2xl text-sm font-medium text-foreground hover:bg-accent/50 transition-colors">{t.nav.about}</Link>
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-4 md:px-8 pt-16 pb-12 max-w-7xl mx-auto text-center">
        <div className="max-w-2xl mx-auto animate-fade-in">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-foreground leading-tight">
            {t.landing.heroTitle}
          </h1>
          <p className="mt-4 text-sm md:text-base text-muted-foreground leading-relaxed max-w-xl mx-auto">
            {t.landing.heroSubtitle}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <Button size="lg" className="rounded-2xl px-6" asChild>
              <Link to={localePath('/library')}>{t.landing.browseLibrary}</Link>
            </Button>
            <Button size="lg" variant="outline" className="rounded-2xl px-6" onClick={() => handleGatedClick('/journal')}>
              {t.landing.startSelfCheck}
              {!user && <FLock className="h-4 w-4 ml-1.5" />}
            </Button>
          </div>
        </div>
      </section>

      {/* Library Section */}
      <section id="library" className="relative z-10 px-4 md:px-8 py-12 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{t.landing.libraryTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.landing.librarySubtitle}</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {articlesLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-card/70 backdrop-blur border border-border rounded-3xl p-6 space-y-3">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))
          ) : articles.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full">{t.landing.noArticles}</p>
          ) : (
            articles.map((article) => (
              <ArticleCard
                key={article.id}
                title={article.title}
                excerpt={article.excerpt}
                category={article.category}
                source={article.source}
                url={article.url}
              />
            ))
          )}
        </div>
        {/* View all link */}
        {!articlesLoading && articles.length > 0 && (
          <div className="mt-6 text-center">
            <Button variant="outline" className="rounded-2xl px-6" asChild>
              <Link to={localePath('/library')}>
                {t.landing.viewAll} <FArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        )}
      </section>

      {/* Self-Check Preview Section */}
      <section id="self-checks" className="relative z-10 px-4 md:px-8 py-12 max-w-7xl mx-auto">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{t.landing.selfCheckPreviewTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.landing.selfCheckPreviewSubtitle}</p>
          </div>
          <div className="bg-card/70 backdrop-blur border border-border rounded-[40px] p-6 md:p-8 space-y-5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.landing.sampleQuestions}</h3>
            {samplePreviewQuestions.map((q, i) => (
              <div key={i} className="border border-border rounded-2xl p-4 space-y-2">
                <p className="text-sm font-medium text-foreground">{i + 1}. {q.text}</p>
                <Badge variant="outline" className="rounded-full text-[10px]">{q.type}</Badge>
                {q.type === t.sampleQuestions.q1Type && (
                  <div className="flex gap-2 pt-1">
                    {[1, 2, 3, 4, 5].map(n => (
                      <div key={n} className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-xs text-muted-foreground">{n}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            <div className="text-center pt-2">
              {user ? (
                <Button className="rounded-2xl px-6" onClick={() => navigate(localePath('/journal'))}>
                  {t.landing.goToSelfChecks} <FArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">{t.landing.createFreeAccount}</p>
                  <Button className="rounded-2xl px-6" onClick={() => navigate(localePath('/auth'))}>
                    {t.landing.createYourSpace} <FArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>


      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-card/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">{t.landing.footerRights.replace('{year}', String(new Date().getFullYear()))}</span>
          <div className="flex items-center gap-6">
            <Link to={localePath('/about-legal')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.nav.about} Grit.hu</Link>
            <Link to={localePath('/terms')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.landing.terms}</Link>
            <Link to={localePath('/cookies')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.landing.cookies}</Link>
            <Link to={localePath('/gdpr')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.landing.gdpr}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
