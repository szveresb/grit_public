import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { FArrowRight } from '@/components/icons/FreudIcons';
import { useLanguage } from '@/hooks/useLanguage';

interface ArticleCardProps {
  title: string;
  excerpt: string | null;
  category: string;
  source: string | null;
  url: string | null;
  author?: string;
  featured?: boolean;
}

const ArticleCard = ({ title, excerpt, category, source, url, author, featured = false }: ArticleCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useLanguage();

  return (
    <div
      className={`bg-card/70 backdrop-blur border border-border rounded-3xl hover:shadow-md transition-all cursor-pointer group ${
        featured ? 'p-8' : 'p-6'
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="secondary" className="rounded-full text-[10px] font-semibold uppercase tracking-wider">
          {category}
        </Badge>
      </div>
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
            className={`mt-2 text-xs text-muted-foreground leading-relaxed ${featured ? '' : 'line-clamp-3'}`}
          >
            {excerpt}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ArticleCard;
