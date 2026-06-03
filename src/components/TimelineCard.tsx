import { Link } from 'react-router-dom';

const TimelineCard = () => {
  // Mini 7-week pattern preview (non-diagnostic, illustrative only)
  const weeks = [1, 0, 2, 1, 3, 2, 4];
  const max = Math.max(...weeks);

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        {/* Blueprint card — thin borders, mono labels */}
        <div className="border border-border bg-card rounded-sm p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
              Pattern Log
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              Wk 41 · 2026
            </span>
          </div>

          {/* Fields */}
          <dl className="space-y-4">
            <Field label="Observed" value="Interrupted during deep work" />
            <Field label="Context" value="Weekday · afternoon · shared space" />
            <Field label="Intensity" value="3 / 5" />
            <Field label="Frequency (30d)" value="7 occurrences" highlight />
          </dl>

          {/* Mini pattern sparkbar */}
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                7-week trend
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">
                +rising
              </span>
            </div>
            <div className="flex items-end gap-1 h-10">
              {weeks.map((c, i) => (
                <div
                  key={i}
                  className={`flex-1 ${c >= 3 ? 'bg-primary' : 'bg-primary/30'} rounded-sm`}
                  style={{ height: `${Math.max(8, (c / max) * 100)}%` }}
                />
              ))}
            </div>
          </div>

          {/* Non-diagnostic disclaimer */}
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-muted-foreground border-t border-border pt-3">
            Non-diagnostic · Passive archive
          </p>
        </div>

        {/* CTA */}
        <div className="mt-6">
          <Link
            to="/journal"
            className="block w-full py-3 px-6 bg-primary text-primary-foreground text-sm font-medium tracking-wide rounded-sm border border-primary hover:opacity-90 transition-opacity text-center"
          >
            Start tracking patterns
          </Link>
        </div>
      </div>
    </div>
  );
};

const Field = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) => (
  <div className="space-y-1">
    <dt className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
      {label}
    </dt>
    <dd
      className={`text-sm font-medium ${
        highlight ? 'text-primary' : 'text-foreground'
      }`}
    >
      {value}
    </dd>
  </div>
);

export default TimelineCard;
