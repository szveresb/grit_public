import { Link } from 'react-router-dom';

const TimelineCard = () => {
  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="border border-border rounded-sm bg-card p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              Journal Entry
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              #001
            </span>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            <Field label="Date" value="Oct 14" />
            <Field label="Event" value="Interrupted during work" />
            <Field label="Impact" value="Medium" />
            <Field
              label="Self-Anchor"
              value="My boundaries are valid."
              highlight
            />
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8">
          <Link to="/dashboard" className="block w-full py-3 px-6 bg-primary text-primary-foreground text-sm font-medium tracking-wide rounded-sm border border-primary hover:opacity-90 transition-opacity text-center">
            Start Your Objective Journal
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
    <dt className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground">
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
