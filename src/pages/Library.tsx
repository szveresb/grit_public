import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import PublicHeader from '@/components/PublicHeader';
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
  featured: boolean;
  author: string;
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
      .select('id, title, title_localized, excerpt, excerpt_localized, source, category, url, featured, author')
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
    // Featured articles first
    list = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
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
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-card/70 backdrop-blur border border-border rounded-3xl p-8 space-y-4">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-card/70 backdrop-blur border border-border rounded-3xl p-6 space-y-3">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {search.trim() ? t.manageLibrary.noMatch : t.landing.noArticles}
          </p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Featured article */}
            <ArticleCard
              id={filtered[0].id}
              title={localizedTitle(filtered[0])}
              excerpt={localizedExcerpt(filtered[0])}
              category={filtered[0].category}
              source={filtered[0].source}
              url={filtered[0].url}
              author={filtered[0].author}
              featured
            />
            {/* Remaining articles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {filtered.slice(1).map((article) => (
                <ArticleCard
                  key={article.id}
                  id={article.id}
                  title={localizedTitle(article)}
                  excerpt={localizedExcerpt(article)}
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

export default Library;
