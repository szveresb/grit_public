import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { FLock, FArrowRight } from '@/components/icons/FreudIcons';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PublicHeader from '@/components/PublicHeader';
import ArticleCard from '@/components/ArticleCard';
import LandingMoodPreview from '@/components/LandingMoodPreview';
import QuickPulse from '@/components/checkin/QuickPulse';

import bambooBg from '@/assets/bamboo-bg.jpg';

interface LibraryArticle {
  id: string;
  title: string;
  title_localized: Record<string, string> | null;
  excerpt: string | null;
  excerpt_localized: Record<string, string> | null;
  source: string | null;
  url: string | null;
  category: string;
  featured: boolean;
  author: string;
}

const Index = () => {
  const { user } = useAuth();
  const { t, lang, localePath } = useLanguage();
  const navigate = useNavigate();
  const [articles, setArticles] = useState<LibraryArticle[]>([]);
  const [articlesLoading, setArticlesLoading] = useState(true);
  const [moodSection, setMoodSection] = useState<{ title: string; subtitle: string; cta_text: string; config: Record<string, any> } | null>(null);

  useEffect(() => {
    supabase.from('library_articles').select('id, title, title_localized, excerpt, excerpt_localized, source, category, url, featured, author').eq('published', true).order('featured', { ascending: false }).order('created_at', { ascending: false }).limit(6)
      .then(({ data }) => { setArticles((data as LibraryArticle[]) ?? []); setArticlesLoading(false); });

    supabase.from('landing_sections').select('*').eq('section_key', 'mood_preview').eq('is_active', true).maybeSingle()
      .then(({ data }) => { if (data) setMoodSection(data as any); });
  }, []);

  const handleGatedClick = (path: string) => {
    navigate(user ? localePath(path) : localePath('/auth'));
  };


  return (
    <div className="min-h-screen relative w-full overflow-x-hidden">
      <div className="fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${bambooBg})`, opacity: 0.12 }} />
      <div className="fixed inset-0 z-0 bg-background/80" />

      <PublicHeader />

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
              {t.landing.startJournal}
              {!user && <FLock className="h-4 w-4 ml-1.5" />}
            </Button>
          </div>
        </div>
      </section>

      {/* Mood Preview / QuickPulse */}
      {moodSection && !user && (
        <LandingMoodPreview
          title={(lang === 'en' && (moodSection as any).title_localized?.en) || moodSection.title}
          subtitle={(lang === 'en' && (moodSection as any).subtitle_localized?.en) || moodSection.subtitle}
          ctaText={(lang === 'en' && (moodSection as any).cta_text_localized?.en) || moodSection.cta_text}
          moodLabels={lang === 'en' ? (moodSection.config?.mood_labels_en ?? []) : (moodSection.config?.mood_labels ?? [])}
        />
      )}
      {user && (
        <section className="relative z-10 px-4 md:px-8 py-16 max-w-7xl mx-auto">
          <div className="max-w-lg mx-auto">
            <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
              <QuickPulse onMoodSelected={() => navigate(localePath('/journal'))} />
            </div>
          </div>
        </section>
      )}


      <section id="library" className="relative z-10 px-4 md:px-8 py-16 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{t.landing.libraryTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.landing.librarySubtitle}</p>
          </div>
          <Button variant="ghost" size="sm" className="rounded-full text-sm font-medium text-muted-foreground hover:text-foreground" asChild>
            <Link to={localePath('/library')}>
              {t.landing.viewAll} <FArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>

        {articlesLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-card/70 backdrop-blur border border-border rounded-3xl p-8 space-y-4">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="space-y-5">
              {[1, 2].map(i => (
                <div key={i} className="bg-card/70 backdrop-blur border border-border rounded-3xl p-6 space-y-3">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          </div>
        ) : articles.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.landing.noArticles}</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Featured article */}
            <ArticleCard
              id={articles[0].id}
              title={(lang === 'en' && articles[0].title_localized?.en) || articles[0].title}
              excerpt={(lang === 'en' && articles[0].excerpt_localized?.en) || articles[0].excerpt}
              category={articles[0].category}
              source={articles[0].source}
              url={articles[0].url}
              author={articles[0].author}
              featured
            />
            {/* Remaining articles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {articles.slice(1).map((article) => (
                <ArticleCard
                  key={article.id}
                  id={article.id}
                  title={(lang === 'en' && article.title_localized?.en) || article.title}
                  excerpt={(lang === 'en' && article.excerpt_localized?.en) || article.excerpt}
                  category={article.category}
                  source={article.source}
                  url={article.url}
                  author={article.author}
                />
              ))}
            </div>
          </div>
        )}
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
