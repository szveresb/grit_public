import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FArrowRight } from '@/components/icons/FreudIcons';
import PublicHeader from '@/components/PublicHeader';
import bambooBg from '@/assets/bamboo-bg.jpg';
import { renderSimpleMarkdown } from '@/lib/simple-markdown';

const SITE_ORIGIN = 'https://grithu-beta.lovable.app';
const NON_DIAGNOSTIC_NOTE =
  'Educational, non-diagnostic content from the Grit.hu sensemaking library.';

/** Strip markdown/HTML and clamp to a meta-description-safe length. */
const toPlainSnippet = (raw: string | null | undefined, max = 155): string => {
  if (!raw) return '';
  const plain = raw
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[`*_>#-]+/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? `${plain.slice(0, max - 1).trimEnd()}…` : plain;
};

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

  /**
   * Inject per-route title, meta description, canonical, and Article + BreadcrumbList
   * JSON-LD into <head>. All copy is intentionally non-diagnostic — we describe
   * the resource ("educational article"), not the reader.
   */
  useEffect(() => {
    if (!article) return;

    const canonical = `${SITE_ORIGIN}${lang === 'en' ? '/en' : ''}/library/${article.id}`;
    const description = toPlainSnippet(localizedExcerpt) || NON_DIAGNOSTIC_NOTE;
    const headline = localizedTitle;
    const previousTitle = document.title;
    document.title = `${headline} — ${t.landing.libraryTitle}`;

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
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', headline);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', description);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'article');
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', canonical);
    if (article.image_url) {
      upsertMeta('meta[property="og:image"]', 'property', 'og:image', article.image_url);
    }
    upsertLink('canonical', canonical);

    const articleLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline,
      description,
      inLanguage: lang === 'en' ? 'en' : 'hu',
      datePublished: article.created_at,
      author: article.author ? { '@type': 'Person', name: article.author } : undefined,
      publisher: {
        '@type': 'Organization',
        name: 'Grit.hu',
        url: SITE_ORIGIN,
      },
      isPartOf: {
        '@type': 'CollectionPage',
        name: t.landing.libraryTitle,
        url: `${SITE_ORIGIN}${lang === 'en' ? '/en' : ''}/library`,
      },
      mainEntityOfPage: canonical,
      articleSection: article.category,
      image: article.image_url || undefined,
      isAccessibleForFree: true,
      // Non-diagnostic disclosure surfaced to crawlers.
      disambiguatingDescription: NON_DIAGNOSTIC_NOTE,
      ...(article.url ? { citation: article.url } : {}),
    };
    const breadcrumbLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: t.nav.home, item: `${SITE_ORIGIN}${lang === 'en' ? '/en' : ''}/` },
        { '@type': 'ListItem', position: 2, name: t.landing.libraryTitle, item: `${SITE_ORIGIN}${lang === 'en' ? '/en' : ''}/library` },
        { '@type': 'ListItem', position: 3, name: headline, item: canonical },
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
    mountLd(`ld-article-${article.id}`, articleLd);
    mountLd(`ld-breadcrumb-${article.id}`, breadcrumbLd);

    return () => {
      tags.forEach((n) => n.parentNode?.removeChild(n));
      document.title = previousTitle;
    };
  }, [article, lang, localizedTitle, localizedExcerpt, t.landing.libraryTitle, t.nav.home]);

  return (
    <div className="min-h-screen relative w-full overflow-x-hidden">
      <div className="fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${bambooBg})`, opacity: 0.12 }} />
      <div className="fixed inset-0 z-0 bg-background/80" />

      <PublicHeader />

      {/* Content */}
      <article className="relative z-10 px-4 md:px-8 py-12 max-w-3xl mx-auto">
        {loading ? (
          <div className="space-y-8">
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
          <div className="space-y-8">
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
              <div className="text-sm text-foreground/90 leading-relaxed">
                {renderSimpleMarkdown(localizedExcerpt)}
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
            <Link to={localePath('/impressum')} className="text-xs text-muted-foreground hover:text-foreground transition-colors">{t.legal.impressum.title}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Article;
