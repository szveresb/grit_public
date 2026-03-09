import { Link } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import LanguageToggle from '@/components/LanguageToggle';
import ArticleCard from '@/components/ArticleCard';
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
}

const Library = () => {
  const { t, lang, localePath } = useLanguage();
  const [articles, setArticles] = useState<LibraryArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('library_articles')
      .select('id, title, title_localized, excerpt, excerpt_localized, source, category, url')
      .eq('published', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setArticles((data as LibraryArticle[]) ?? []);
        setLoading(false);
      });
  }, []);

  const categories = useMemo(
    () => Array.from(new Set(articles.map((a) => a.category))).sort(),
    [articles],
  );

  const filtered = useMemo(() => {
    let list = articles;
    if (selectedCategory) list = list.filter((a) => a.category === selectedCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((a) => {
        const title = (lang === 'en' && a.title_localized?.en) || a.title;
        const excerpt = (lang === 'en' && a.excerpt_localized?.en) || a.excerpt || '';
        return title.toLowerCase().includes(q) || excerpt.toLowerCase().includes(q);
      });
    }
    return list;
  }, [articles, search, selectedCategory, lang]);

  const localizedTitle = (a: LibraryArticle) =>
    (lang === 'en' && a.title_localized?.en) || a.title;
  const localizedExcerpt = (a: LibraryArticle) =>
    (lang === 'en' && a.excerpt_localized?.en) || a.excerpt;

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
              <Link to={localePath('/')}>{t.nav.home}</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <section className="relative z-10 px-4 md:px-8 py-12 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{t.landing.libraryTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.landing.librarySubtitle}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <Input
            placeholder={t.manageLibrary.searchArticles}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-full max-w-sm"
          />
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === null ? 'default' : 'secondary'}
              className="rounded-full cursor-pointer text-xs"
              onClick={() => setSelectedCategory(null)}
            >
              {t.manageLibrary.allCategories}
            </Badge>
            {categories.map((cat) => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'secondary'}
                className="rounded-full cursor-pointer text-xs"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {loading ? (
            Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-card/70 backdrop-blur border border-border rounded-3xl p-6 space-y-3">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground col-span-full">
              {search.trim() ? t.manageLibrary.noMatch : t.landing.noArticles}
            </p>
          ) : (
            filtered.map((article) => {
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
                    {localizedTitle(article)}
                  </h3>
                  <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {localizedExcerpt(article)}
                  </p>
                  {article.source && (
                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      {article.source}
                    </p>
                  )}
                  {article.url && (
                    <div className="mt-3 flex items-center gap-1 text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      <FArrowRight className="h-3 w-3" />
                    </div>
                  )}
                </Wrapper>
              );
            })
          )}
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

export default Library;
