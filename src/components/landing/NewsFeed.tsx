import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { safeFormat } from '@/lib/date-safe';
import { Badge } from '@/components/ui/badge';
import { FSparkles, FArrowUp, FCheck } from '@/components/icons/FreudIcons';

interface NewsItem {
  id: string;
  title: string;
  title_localized: Record<string, string> | null;
  body: string;
  body_localized: Record<string, string> | null;
  category: 'feature' | 'upgrade' | 'fix';
  published_at: string;
}

const CategoryIcon = ({ category }: { category: NewsItem['category'] }) => {
  if (category === 'feature') return <FSparkles className="w-4 h-4" />;
  if (category === 'upgrade') return <FArrowUp className="w-4 h-4" />;
  return <FCheck className="w-4 h-4" />;
};

const NewsFeed = () => {
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('news_items')
        .select('id,title,title_localized,body,body_localized,category,published_at')
        .eq('is_published', true)
        .order('sort_order', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(6);
      if (!cancelled) {
        setItems((data ?? []) as unknown as NewsItem[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const localized = (base: string, loc: Record<string, string> | null) => {
    if (lang === 'en' && loc?.en) return loc.en;
    if (lang === 'hu' && loc?.hu) return loc.hu;
    return base;
  };

  if (!loading && items.length === 0) return null;

  return (
    <section className="relative z-10">
      <div className="text-center mb-12">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground uppercase tracking-[0.2em] opacity-80">
          {t.landing.newsTitle}
        </h2>
        <p className="mt-2 text-xs md:text-sm text-muted-foreground">{t.landing.newsSubtitle}</p>
      </div>

      <ol className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="surface-card p-5 flex gap-4">
            <div className="flex-shrink-0 w-9 h-9 rounded-2xl bg-accent/50 flex items-center justify-center text-primary">
              <CategoryIcon category={item.category} />
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center flex-wrap gap-2">
                <Badge variant="secondary" className="rounded-full text-[10px] font-semibold uppercase tracking-wider">
                  {t.landing.newsCategory[item.category]}
                </Badge>
                <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                  {safeFormat(item.published_at, 'MMM d, yyyy', lang)}
                </span>
              </div>
              <h3 className="text-sm md:text-base font-semibold text-foreground leading-snug">
                {localized(item.title, item.title_localized)}
              </h3>
              {localized(item.body, item.body_localized) && (
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  {localized(item.body, item.body_localized)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

export default NewsFeed;