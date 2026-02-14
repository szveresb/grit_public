import { BookOpen, ClipboardCheck, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  variant: 'blue' | 'slate' | 'bordered';
}

const variantStyles: Record<ActionCardProps['variant'], string> = {
  blue: 'bg-primary text-primary-foreground border-primary',
  slate: 'bg-foreground text-background border-foreground',
  bordered: 'bg-background text-foreground border-border',
};

const iconVariantStyles: Record<ActionCardProps['variant'], string> = {
  blue: 'text-primary-foreground/70',
  slate: 'text-background/70',
  bordered: 'text-muted-foreground',
};

const ActionCard = ({ title, description, icon: Icon, variant }: ActionCardProps) => {
  return (
    <button
      className={`flex flex-col items-start gap-3 rounded-sm border p-6 text-left transition-opacity hover:opacity-80 ${variantStyles[variant]}`}
    >
      <Icon className={`h-5 w-5 ${iconVariantStyles[variant]}`} />
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className={`mt-1 text-xs ${variant === 'bordered' ? 'text-muted-foreground' : 'opacity-70'}`}>
          {description}
        </p>
      </div>
    </button>
  );
};

const ActionGrid = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <ActionCard
        title="Log Observation"
        description="Record a factual event as it happened."
        icon={BookOpen}
        variant="blue"
      />
      <ActionCard
        title="Complete Self-Check"
        description="Assess your current emotional state."
        icon={ClipboardCheck}
        variant="slate"
      />
      <ActionCard
        title="View Timeline"
        description="See your observations in sequence."
        icon={Clock}
        variant="bordered"
      />
    </div>
  );
};

export default ActionGrid;
