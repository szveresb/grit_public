import { Link, useParams, Navigate } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import PublicHeader from '@/components/PublicHeader';
import ArticleCard from '@/components/ArticleCard';
import bambooBg from '@/assets/bamboo-bg.jpg';

interface CategoryItem {
  slug: string;
  label_hu?: string;
  label_en?: string;
  description_hu?: string;
  description_en?: string;
  article_category: string;
  is_active?: boolean;
}

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
  created_at: string;
}

type SortMode = 'featured_first' | 'newest' | 'oldest' | 'title_asc' | 'title_desc';

const CategoryPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, lang, localePath } = useLanguage();
  const [category, setCategory] = useState<CategoryItem | null>(null);
  const [articles, setArticles] = useState<LibraryArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [sortBy, setSortBy] = useState<SortMode>('featured_first');

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const { data: section } = await supabase
        .from('landing_sections')
        .select('config, is_active')
        .eq('section_key', 'content_categories')
        .maybeSingle();
      const items: CategoryItem[] = ((section?.config as Record<string, unknown>)?.items as CategoryItem[]) ?? [];
      const cat = items.find((c) => c.slug === slug && c.is_active !== false);
      if (!cat || section?.is_active === false) {
        if (!cancelled) { setNotFound(true); setLoading(false); }
        return;
      }
      const { data: arts } = await supabase
        .from('library_articles')
        .select('id, title, title_localized, excerpt, excerpt_localized, source, category, url, featured, author, created_at')
        .eq('published', true)
        .eq('category', cat.article_category)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      setCategory(cat);
      setArticles((arts as LibraryArticle[]) ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  const localizedTitleFn = (a: LibraryArticle) =>
    (lang === 'en' && a.title_localized?.en) || a.title;

  const sorted = useMemo(() => {
    const list = [...articles];
    switch (sortBy) {
      case 'featured_first':
        return list.sort(
          (a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) ||
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      case 'newest':
        return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      case 'oldest':
        return list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      case 'title_asc':
        return list.sort((a, b) => localizedTitleFn(a).localeCompare(localizedTitleFn(b), lang));
      case 'title_desc':
        return list.sort((a, b) => localizedTitleFn(b).localeCompare(localizedTitleFn(a), lang));
      default:
        return list;
    }
  }, [articles, sortBy, lang]);

  if (notFound) return <Navigate to={localePath('/library')} replace />;

  const label = (lang === 'en' ? category?.label_en : category?.label_hu) || category?.article_category || slug;
  const description = (lang === 'en' ? category?.description_en : category?.description_hu) || '';

  const localizedTitle = (a: LibraryArticle) => (lang === 'en' && a.title_localized?.en) || a.title;
  const localizedExcerpt = (a: LibraryArticle) => (lang === 'en' && a.excerpt_localized?.en) || a.excerpt;

  return (
    <div className="min-h-screen relative w-full overflow-x-hidden">
      <div className="fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${bambooBg})`, opacity: 0.12 }} />
      <div className="fixed inset-0 z-0 bg-background/80" />
      <PublicHeader />
      <section className="relative z-10 px-4 md:px-8 py-12 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{label}</h1>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card/70 backdrop-blur border border-border rounded-3xl p-6 space-y-3">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.landing.noArticles}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sorted.map((article) => (
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
        )}
        <div className="mt-10">
          <Link to={localePath('/library')} className="text-xs font-semibold uppercase tracking-widest text-muted-foreground hover:text-foreground">
            ← {t.nav.library}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default CategoryPage;