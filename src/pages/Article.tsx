import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FArrowRight } from '@/components/icons/FreudIcons';
import LanguageToggle from '@/components/LanguageToggle';
import bambooBg from '@/assets/bamboo-bg.jpg';

interface ArticleData {
  id: string;
  title: string;
  title_localized: Record<string, string> | null;
  excerpt: string | null;
  excerpt_localized: Record<string, string> | null;
  source: string | null;
  url: string | null;
  category: string;
  author: string;
  image_url: string | null;
  created_at: string;
}

const Article = () => {
  const { id } = useParams<{ id: string }>();
  const { t, lang, localePath } = useLanguage();
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('library_articles')
      .select('id, title, title_localized, excerpt, excerpt_localized, source, category, url, author, image_url, created_at')
      .eq('id', id)
      .eq('published', true)
      .single()
      .then(({ data }) => {
        setArticle((data as ArticleData) ?? null);
        setLoading(false);
      });
  }, [id]);

  const localizedTitle = article
    ? (lang === 'en' && (article.title_localized as Record<string, string>)?.en) || article.title
    : '';
  const localizedExcerpt = article
    ? (lang === 'en' && (article.excerpt_localized as Record<string, string>)?.en) || article.excerpt
    : '';

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
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Button variant="outline" size="sm" className="rounded-full px-4" asChild>
              <Link to={localePath('/library')}>{t.article.backToLibrary}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <article className="relative z-10 px-4 md:px-8 py-12 max-w-3xl mx-auto">
        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
        ) : !article ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">{t.article.notFound}</p>
            <Button variant="outline" size="sm" className="mt-4 rounded-full" asChild>
              <Link to={localePath('/library')}>{t.article.backToLibrary}</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <Badge variant="secondary" className="rounded-full text-[10px] font-semibold uppercase tracking-wider">
              {article.category}
            </Badge>

            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-foreground leading-tight">
              {localizedTitle}
            </h1>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {[article.author, article.source].filter(Boolean).join(' · ')}
              <span className="text-border">•</span>
              {new Date(article.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'hu-HU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>

            {article.image_url && (
              <img
                src={article.image_url}
                alt={localizedTitle}
                className="w-full rounded-2xl border border-border object-cover max-h-96"
              />
            )}

            {localizedExcerpt && (
              <div className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
                {localizedExcerpt}
              </div>
            )}

            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                {t.landing.viewSource} <FArrowRight className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        )}
      </article>

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

export default Article;
