import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import QuickPulse from '@/components/checkin/QuickPulse';
import { FHeartPulse, FClock } from '@/components/icons/FreudIcons';

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
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
    <div className="space-y-6">
      {/* Quick Pulse */}
      <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          {t.dash.quickPulse}
        </h2>
        <QuickPulse
          compact
          onMoodSelected={() => navigate(localePath('/journal'))}
        />
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ActionCard
          title={t.dash.completeJournal}
          description={t.dash.completeJournalDesc}
          icon={FHeartPulse}
          variant="sage"
          onClick={() => navigate(localePath('/journal'))}
        />
        <ActionCard
          title={t.dash.viewHistory}
          description={t.dash.viewHistoryDesc}
          icon={FClock}
          variant="mist"
          onClick={() => navigate(localePath('/journal'))}
        />
      </div>
    </div>
  );
};

export default ActionGrid;
