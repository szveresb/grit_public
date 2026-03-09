import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { FArrowRight } from '@/components/icons/FreudIcons';
import { useLanguage } from '@/hooks/useLanguage';

import categoryArticle from '@/assets/category-article.png';
import categoryBook from '@/assets/category-book.png';
import categoryResearch from '@/assets/category-research.png';

const CATEGORY_IMAGES: Record<string, string> = {
  Article: categoryArticle,
  Book: categoryBook,
  Research: categoryResearch,
  'Study Summary': categoryResearch,
};

interface ArticleCardProps {
  title: string;
  excerpt: string | null;
  category: string;
  source: string | null;
  url: string | null;
  imageUrl?: string | null;
  featured?: boolean;
}

const ArticleCard = ({ title, excerpt, category, source, url, imageUrl, featured = false }: ArticleCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLanguage();

  const displayImage = imageUrl || CATEGORY_IMAGES[category] || categoryArticle;

  return (
    <div
      className={`bg-card/70 backdrop-blur border border-border rounded-3xl hover:shadow-md transition-all cursor-pointer group overflow-hidden ${
        featured ? '' : ''
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Image */}
      <div className={`relative overflow-hidden bg-muted ${featured ? 'h-48 md:h-56' : 'h-32'}`}>
        <img
          src={displayImage}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card/80 to-transparent" />
        <div className="absolute bottom-3 left-4">
          <Badge variant="secondary" className="rounded-full text-[10px] font-semibold uppercase tracking-wider bg-card/80 backdrop-blur-sm">
            {category}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className={featured ? 'p-6' : 'p-4'}>
        <h3 className={`font-semibold text-foreground leading-snug group-hover:text-primary transition-colors ${
          featured ? 'text-lg md:text-xl' : 'text-sm'
        }`}>
          {title}
        </h3>
        <AnimatePresence initial={false}>
          {expanded ? (
            <motion.div
              key="expanded"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              {excerpt && (
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                  {excerpt}
                </p>
              )}
              {source && (
                <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  {source}
                </p>
              )}
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t.landing.viewSource} <FArrowRight className="h-3 w-3" />
                </a>
              )}
            </motion.div>
          ) : (
            <motion.p
              key="collapsed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-2"
            >
              {excerpt}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ArticleCard;
