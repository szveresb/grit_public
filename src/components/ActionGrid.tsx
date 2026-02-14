import { useNavigate } from 'react-router-dom';
import { BookOpen, ClipboardCheck, Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  variant: 'sage' | 'leaf' | 'mist';
  onClick: () => void;
}

const variantStyles: Record<ActionCardProps['variant'], string> = {
  sage: 'bg-primary text-primary-foreground border-primary/30',
  leaf: 'bg-bamboo-sage-light text-foreground border-border',
  mist: 'bg-card text-foreground border-border',
};

const iconVariantStyles: Record<ActionCardProps['variant'], string> = {
  sage: 'text-primary-foreground/80',
  leaf: 'text-bamboo-sage',
  mist: 'text-muted-foreground',
};

const ActionCard = ({ title, description, icon: Icon, variant, onClick }: ActionCardProps) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-3 rounded-3xl border p-6 text-left transition-all hover:shadow-md hover:scale-[1.02] ${variantStyles[variant]}`}
    >
      <Icon className={`h-5 w-5 ${iconVariantStyles[variant]}`} />
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className={`mt-1 text-xs leading-relaxed ${variant === 'sage' ? 'opacity-80' : 'text-muted-foreground'}`}>
          {description}
        </p>
      </div>
    </button>
  );
};

const ActionGrid = () => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <ActionCard
        title="Log Observation"
        description="Record what happened with clarity and structure."
        icon={BookOpen}
        variant="sage"
        onClick={() => navigate('/journal')}
      />
      <ActionCard
        title="Complete Self-Check"
        description="A gentle check-in on how you're feeling right now."
        icon={ClipboardCheck}
        variant="leaf"
        onClick={() => navigate('/self-checks')}
      />
      <ActionCard
        title="View History"
        description="See your observations and reflections over time."
        icon={Clock}
        variant="mist"
        onClick={() => navigate('/timeline')}
      />
    </div>
  );
};

export default ActionGrid;
