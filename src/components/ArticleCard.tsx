import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/hooks/useLanguage';

interface ArticleCardProps {
  id: string;
  title: string;
  excerpt: string | null;
  category: string;
  source: string | null;
  url: string | null;
  author?: string;
  featured?: boolean;
}

const ArticleCard = ({ id, title, excerpt, category, source, author, featured = false }: ArticleCardProps) => {
  const { localePath } = useLanguage();

  return (
    <Link
      to={localePath(`/library/${id}`)}
      className={`reference-surface block rounded-3xl transition-colors group ${
        featured ? 'p-6 md:p-7' : 'p-6'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Badge variant="secondary" className="rounded-full text-[10px] font-semibold uppercase tracking-wider">
          {category}
        </Badge>
      </div>
      <h3 className={`font-semibold text-foreground leading-snug group-hover:text-primary transition-colors ${
        featured ? 'text-base md:text-lg' : 'text-sm'
      }`}>
        {title}
      </h3>
      {excerpt && (
        <p className={`mt-2 text-xs text-muted-foreground leading-relaxed ${featured ? '' : 'line-clamp-3'}`}>
          {excerpt}
        </p>
      )}
      {(author || source) && (
        <p className="mt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {[author, source].filter(Boolean).join(' · ')}
        </p>
      )}
    </Link>
  );
};

export default ArticleCard;
