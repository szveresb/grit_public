import { useEffect, useState, useMemo } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import DashboardLayout from '@/components/DashboardLayout';
import ArticleCard from '@/components/ArticleCard';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Link } from 'react-router-dom';
import { FClipboardCheck, FArrowRight } from '@/components/icons/FreudIcons';

const SITE_ORIGIN = 'https://grithu-beta.lovable.app';
const NON_DIAGNOSTIC_NOTE =
  'Educational, non-diagnostic content from the Grit.hu sensemaking library.';

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

  /**
   * Per-route <head> tags for the public Library collection page.
   * Canonical + og:url are aligned to prevent duplicate metadata in previews.
   */
  useEffect(() => {
    const canonical = `${SITE_ORIGIN}${lang === 'en' ? '/en' : ''}/library`;
    const title = `${t.landing.libraryTitle} — Grit.hu`;
    const description = t.landing.librarySubtitle || NON_DIAGNOSTIC_NOTE;
    const previousTitle = document.title;
    document.title = title;

    const tags: HTMLElement[] = [];
    const upsertMeta = (selector: string, attr: 'name' | 'property', key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      let owned = false;
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
        owned = true;
      }
      el.setAttribute('content', content);
      if (owned) tags.push(el);
    };
    const upsertLink = (rel: string, href: string) => {
      let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      let owned = false;
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', rel);
        document.head.appendChild(el);
        owned = true;
      }
      el.setAttribute('href', href);
      if (owned) tags.push(el);
    };

    upsertMeta('meta[name="description"]', 'name', 'description', description);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', title);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
    upsertLink('canonical', canonical);

    const breadcrumbLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t.nav.home, item: `${SITE_ORIGIN}${lang === 'en' ? '/en' : ''}/` },
        { '@type': 'ListItem', position: 2, name: t.landing.libraryTitle, item: canonical },
      ],
    };

    const mountLd = (id: string, payload: unknown) => {
      const node = document.createElement('script');
      node.type = 'application/ld+json';
      node.id = id;
      node.textContent = JSON.stringify(payload);
      document.head.appendChild(node);
      tags.push(node);
    };
    mountLd('ld-breadcrumb-library', breadcrumbLd);

    return () => {
      tags.forEach((n) => n.parentNode?.removeChild(n));
      document.title = previousTitle;
    };
  }, [lang, t.landing.libraryTitle, t.landing.librarySubtitle, t.nav.home]);

  return (
    <DashboardLayout showContextToolPanel={false}>
      <section>
        <Breadcrumbs
          items={[{ label: t.nav.library }]}
          className="mb-3"
        />
        <div className="mb-5 pb-3 border-b border-border/50">
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">{t.landing.libraryTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.landing.librarySubtitle}</p>
          <Link
            to={localePath('/surveys')}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary hover:text-foreground transition-colors"
          >
            <FClipboardCheck className="h-3.5 w-3.5" />
            {t.nav.surveys}
            <FArrowRight className="h-3 w-3" />
          </Link>
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
