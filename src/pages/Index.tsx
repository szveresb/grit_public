import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Lock, ArrowRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import LanguageToggle from '@/components/LanguageToggle';
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

  useEffect(() => {
    supabase.from('library_articles').select('id, title, excerpt, source, category, url').eq('published', true).order('created_at', { ascending: false })
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
            <a href="#library" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t.nav.library}</a>
            <a href="#research" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t.nav.researchSummaries}</a>
            <button onClick={() => handleGatedClick('/check-in')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
              {t.nav.checkIn}
              {!user && <Lock className="h-3 w-3" />}
            </button>
            <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t.nav.about}</a>
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
          </div>
        </div>
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
              <a href="#library">{t.landing.browseLibrary}</a>
            </Button>
            <Button size="lg" variant="outline" className="rounded-2xl px-6" onClick={() => handleGatedClick('/check-in')}>
              {t.landing.startSelfCheck}
              {!user && <Lock className="h-4 w-4 ml-1.5" />}
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
            articles.map((article) => {
              const Wrapper = article.url ? 'a' : 'div';
              const linkProps = article.url ? { href: article.url, target: '_blank', rel: 'noopener noreferrer' } : {};
              return (
                <Wrapper key={article.id} {...linkProps} className={`bg-card/70 backdrop-blur border border-border rounded-3xl p-6 hover:shadow-md transition-all group ${article.url ? 'cursor-pointer' : ''}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="secondary" className="rounded-full text-[10px] font-semibold uppercase tracking-wider">
                      {article.category}
                    </Badge>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground leading-snug group-hover:text-primary transition-colors">
                    {article.title}
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {article.excerpt}
                  </p>
                  {article.source && (
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {article.source}
                    </p>
                  )}
                </Wrapper>
              );
            })
          )}
        </div>
      </section>

      {/* Research Summaries Section */}
      <section id="research" className="relative z-10 px-4 md:px-8 py-12 max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{t.landing.researchTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.landing.researchSubtitle}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {articles.filter(a => a.category === 'Research' || a.category === 'Study Summary').length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full">{t.landing.noResearch}</p>
          ) : (
            articles.filter(a => a.category === 'Research' || a.category === 'Study Summary').map(study => {
              const Wrapper = study.url ? 'a' : 'div';
              const linkProps = study.url ? { href: study.url, target: '_blank', rel: 'noopener noreferrer' } : {};
              return (
                <Wrapper key={study.id} {...linkProps} className={`bg-card/70 backdrop-blur border border-border rounded-3xl p-6 hover:shadow-md transition-all group ${study.url ? 'cursor-pointer' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <Badge variant="secondary" className="rounded-full text-[10px] font-semibold uppercase tracking-wider">{study.category}</Badge>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">{study.title}</h3>
                  {study.excerpt && <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{study.excerpt}</p>}
                  {study.source && <p className="mt-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{study.source}</p>}
                </Wrapper>
              );
            })
          )}
        </div>
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
                <Button className="rounded-2xl px-6" onClick={() => navigate(localePath('/check-in'))}>
                  {t.landing.goToSelfChecks} <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">{t.landing.createFreeAccount}</p>
                  <Button className="rounded-2xl px-6" onClick={() => navigate(localePath('/auth'))}>
                    {t.landing.createYourSpace} <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative z-10 px-4 md:px-8 py-12 max-w-7xl mx-auto">
        <div className="max-w-2xl mx-auto bg-card/70 backdrop-blur border border-border rounded-[40px] p-8 md:p-10 text-center">
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{t.landing.aboutTitle}</h2>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed">{t.landing.aboutP1}</p>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{t.landing.aboutP2}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border bg-card/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">{t.landing.footerRights.replace('{year}', String(new Date().getFullYear()))}</span>
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.landing.terms}</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.landing.cookies}</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.landing.gdpr}</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
