import type { Dictionary, Lang } from '@/i18n/types';
import type { DualStats } from '@/hooks/useDualPerspectiveData';
import { FSparkles } from '@/components/icons/FreudIcons';

interface Props {
  stats: DualStats;
  t: Dictionary;
  lang: Lang;
}

const formatTpl = (tpl: string, vars: Record<string, string | number>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

const ConceptCorrelationList = ({ stats, t, lang }: Props) => {
  const items = stats.conceptCorrelations;

  return (
    <div className="surface-card p-5 space-y-4 animate-fade-in">
      <div className="flex items-start gap-2">
        <FSparkles className="h-4 w-4 text-primary mt-0.5" />
        <div className="space-y-1">
          <h3 className="text-sm font-bold text-foreground">{t.timeline.dual.conceptListTitle}</h3>
          <p className="text-xs text-muted-foreground">{t.timeline.dual.conceptListSubtitle}</p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">{t.timeline.dual.noPairedConcepts}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((c) => {
            const positive = c.r >= 0;
            const magnitude = Math.min(1, Math.abs(c.r));
            const name = lang === 'hu' ? c.nameHu : c.nameEn;
            return (
              <li
                key={c.conceptId}
                className="flex items-center gap-3 p-2.5 rounded-2xl bg-muted/20 border border-border/40"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatTpl(t.timeline.dual.conceptDays, { n: c.n })}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-16 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                    <div
                      className={`h-full ${positive ? 'bg-primary' : 'bg-destructive'}`}
                      style={{ width: `${magnitude * 100}%` }}
                    />
                  </div>
                  <span
                    className={`text-xs font-semibold tabular-nums ${
                      positive ? 'text-primary' : 'text-destructive'
                    }`}
                  >
                    {positive ? '+' : ''}
                    {c.r.toFixed(2)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ConceptCorrelationList;