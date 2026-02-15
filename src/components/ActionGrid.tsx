import { useNavigate } from 'react-router-dom';
import { BookOpen, ClipboardCheck, Clock } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
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
  const { t, localePath } = useLanguage();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <ActionCard
        title={t.dash.logObservation}
        description={t.dash.logObservationDesc}
        icon={BookOpen}
        variant="sage"
        onClick={() => navigate(localePath('/journal'))}
      />
      <ActionCard
        title={t.dash.completeSelfCheck}
        description={t.dash.completeSelfCheckDesc}
        icon={ClipboardCheck}
        variant="leaf"
        onClick={() => navigate(localePath('/self-checks'))}
      />
      <ActionCard
        title={t.dash.viewHistory}
        description={t.dash.viewHistoryDesc}
        icon={Clock}
        variant="mist"
        onClick={() => navigate(localePath('/timeline'))}
      />
    </div>
  );
};

export default ActionGrid;
