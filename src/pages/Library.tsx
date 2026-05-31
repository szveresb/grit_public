import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardLayout from '@/components/DashboardLayout';
import ArticleCard from '@/components/ArticleCard';

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
    <DashboardLayout showContextToolPanel={false}>
      <section>
        <div className="mb-5 pb-3 border-b border-border/50">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{t.landing.libraryTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.landing.librarySubtitle}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card/70 backdrop-blur border border-border rounded-3xl p-8 space-y-4">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
    </DashboardLayout>
  );
};

export default Library;
