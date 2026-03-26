import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import QuickPulse from '@/components/checkin/QuickPulse';
import { Button } from '@/components/ui/button';
import { FHeartPulse, FClock } from '@/components/icons/FreudIcons';

interface ActionCardProps {
  title: string;
  description: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
  variant: 'sage' | 'leaf' | 'mist';
  onClick: () => void;
}

const variantStyles: Record<ActionCardProps['variant'], string> = {
  sage: 'surface-card text-foreground',
  leaf: 'surface-card text-foreground',
  mist: 'surface-card text-foreground',
};

const iconVariantStyles: Record<ActionCardProps['variant'], string> = {
  sage: 'text-primary',
  leaf: 'text-bamboo-sage',
  mist: 'text-primary',
};

const ActionCard = ({ title, description, icon: Icon, variant, onClick }: ActionCardProps) => {
  return (
    <div
      className={`flex h-full flex-col items-center gap-3 p-6 sm:p-8 text-center max-w-md mx-auto w-full transition-colors ${variantStyles[variant]}`}
    >
      <Icon className={`h-6 w-6 mb-1 ${iconVariantStyles[variant]}`} />
      <div className="flex-1">
        <h3 className="text-base font-bold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <Button
        onClick={onClick}
        className="mt-6 px-6 min-w-[160px] rounded-2xl w-auto"
      >
        {title}
      </Button>
    </div>
  );
};

const ActionGrid = () => {
  const navigate = useNavigate();
  const { t, localePath } = useLanguage();

  return (
    <div className="space-y-6">
      {/* Quick Pulse */}
      <div className="surface-card p-5">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          {t.dash.quickPulse}
        </h2>
        <QuickPulse
          compact
          onMoodSelected={() => navigate(localePath('/journal'))}
        />
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
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
