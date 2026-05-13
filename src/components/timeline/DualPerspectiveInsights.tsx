import type { Dictionary } from '@/i18n/types';
import type { DualStats } from '@/hooks/useDualPerspectiveData';
import { FSparkles, FTimeline, FUsers } from '@/components/icons/FreudIcons';

interface Props {
  stats: DualStats;
  t: Dictionary;
  relativeName: string;
}

const formatTpl = (tpl: string, vars: Record<string, string | number>) =>
  tpl.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

const strengthBand = (r: number, t: Dictionary) => {
  const a = Math.abs(r);
  if (a < 0.15) return t.timeline.dual.strengthNone;
  if (r < 0) {
    if (a >= 0.6) return t.timeline.dual.strengthStrongInverse;
    if (a >= 0.3) return t.timeline.dual.strengthModerateInverse;
    return t.timeline.dual.strengthWeakInverse;
  }
  if (a >= 0.6) return t.timeline.dual.strengthStrong;
  if (a >= 0.3) return t.timeline.dual.strengthModerate;
  return t.timeline.dual.strengthWeak;
};

const DualPerspectiveInsights = ({ stats, t, relativeName }: Props) => {
  if (stats.overlapDays < 5) {
    return (
      <div className="surface-card p-5 space-y-2 animate-fade-in">
        <div className="flex items-center gap-2">
          <FTimeline className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-bold text-foreground">{t.timeline.dual.notEnoughOverlap}</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {formatTpl(t.timeline.dual.notEnoughOverlapDesc, { name: relativeName })}
        </p>
      </div>
    );
  }

  const r = stats.overallR;
  const pct = stats.totalDays > 0 ? Math.round((stats.overlapDays / stats.totalDays) * 100) : 0;

  const lagText = (() => {
    if (!stats.bestLag) return t.timeline.dual.leadLagNone;
    if (stats.bestLag.lag === 0) return t.timeline.dual.leadLagSameDay;
    if (stats.bestLag.lag > 0) {
      return formatTpl(t.timeline.dual.leadLagAfter, {
        days: stats.bestLag.lag,
        name: relativeName,
      });
    }
    return formatTpl(t.timeline.dual.leadLagBefore, {
      days: Math.abs(stats.bestLag.lag),
      name: relativeName,
    });
  })();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-fade-in">
      <div className="surface-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <FSparkles className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t.timeline.dual.overallCorrelation}
          </span>
        </div>
        <p className="text-2xl font-semibold text-foreground tabular-nums">
          {r == null ? '—' : r.toFixed(2)}
        </p>
        <p className="text-xs text-muted-foreground">
          {r == null ? t.timeline.dual.strengthNone : strengthBand(r, t)}
        </p>
      </div>

      <div className="surface-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <FTimeline className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t.timeline.dual.leadLagTitle}
          </span>
        </div>
        <p className="text-xs text-foreground leading-relaxed">{lagText}</p>
        {stats.bestLag && (
          <p className="text-[11px] text-muted-foreground tabular-nums">
            r = {stats.bestLag.r.toFixed(2)} · n = {stats.bestLag.n}
          </p>
        )}
      </div>

      <div className="surface-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <FUsers className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t.timeline.dual.coOccurrenceTitle}
          </span>
        </div>
        <p className="text-2xl font-semibold text-foreground tabular-nums">{pct}%</p>
        <p className="text-xs text-muted-foreground">
          {formatTpl(t.timeline.dual.coOccurrenceDesc, {
            n: stats.overlapDays,
            total: stats.totalDays,
            pct,
          })}
        </p>
      </div>
    </div>
  );
};

export default DualPerspectiveInsights;