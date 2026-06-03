import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { FHome } from '@/components/icons/FreudIcons';

export interface BreadcrumbItem {
  label: string;
  to?: string; // absolute path within the app; omit for the current page
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * SEO + a11y breadcrumb trail.
 * - Renders semantic <nav><ol> with aria-current on the last item.
 * - Emits BreadcrumbList JSON-LD so crawlers can map site hierarchy.
 * - First item is always "Home" with the FHome icon.
 */
const Breadcrumbs = ({ items, className = '' }: BreadcrumbsProps) => {
  const { t, localePath } = useLanguage();
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const trail: BreadcrumbItem[] = [
    { label: t.nav.home, to: localePath('/') },
    ...items,
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, idx) => ({
      '@type': 'ListItem',
      position: idx + 1,
      name: item.label,
      ...(item.to ? { item: `${origin}${item.to}` } : {}),
    })),
  };

  return (
    <nav aria-label={t.ui.breadcrumb} className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
        {trail.map((item, idx) => {
          const isLast = idx === trail.length - 1;
          return (
            <li key={`${item.label}-${idx}`} className="flex items-center gap-1.5">
              {idx > 0 && (
                <span aria-hidden="true" className="text-muted-foreground/60">
                  /
                </span>
              )}
              {isLast || !item.to ? (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className="inline-flex items-center gap-1 text-foreground font-medium"
                >
                  {idx === 0 && <FHome className="h-3 w-3" aria-hidden="true" />}
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.to}
                  className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  {idx === 0 && <FHome className="h-3 w-3" aria-hidden="true" />}
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </nav>
  );
};

export default Breadcrumbs;