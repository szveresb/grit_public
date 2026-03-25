import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/hooks/useLanguage';
import type { ConsentCategory } from './ConsentCard';

interface ConsentSummaryProps {
  categories: ConsentCategory[];
  consents: Record<string, boolean>;
  onToggle: (key: string, granted: boolean) => void;
  readOnly?: boolean;
}

const ConsentSummary = ({ categories, consents, onToggle, readOnly }: ConsentSummaryProps) => {
  const { t } = useLanguage();

  return (
    <div className="surface-card p-6 space-y-4 w-full max-w-md mx-auto">
      <h3 className="text-sm font-semibold text-foreground">{t.consent.summaryTitle}</h3>
      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.key} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="text-primary flex-shrink-0">{cat.icon}</span>
              <span className="text-sm text-foreground truncate">{cat.title}</span>
            </div>
            <Switch
              checked={consents[cat.key] ?? false}
              onCheckedChange={(v) => onToggle(cat.key, v)}
              disabled={readOnly}
              aria-label={cat.title}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConsentSummary;
