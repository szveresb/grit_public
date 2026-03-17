import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { FPlus, FClose } from '@/components/icons/FreudIcons';

interface RecapBannerProps {
  days: number;
  onCatchUp: () => void;
  onDismiss: () => void;
}

const RecapBanner = ({ days, onCatchUp, onDismiss }: RecapBannerProps) => {
  const { t } = useLanguage();

  return (
    <div className="relative bg-primary/10 backdrop-blur border border-primary/20 rounded-3xl p-6 space-y-3">
      <button
        onClick={onDismiss}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <FClose className="h-4 w-4" />
      </button>
      <h3 className="text-sm font-semibold text-foreground">
        {t.checkIn.recapTitle}
      </h3>
      <p className="text-sm text-muted-foreground leading-relaxed pr-6">
        {t.checkIn.recapMessage.replace('{days}', String(days))}
      </p>
      <Button size="sm" className="rounded-2xl gap-1.5" onClick={onCatchUp}>
        <FPlus className="h-4 w-4" />
        {t.checkIn.recapCta}
      </Button>
    </div>
  );
};

export default RecapBanner;
