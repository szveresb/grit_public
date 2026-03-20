import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FShield, FCheck } from '@/components/icons/FreudIcons';
import { useLanguage } from '@/hooks/useLanguage';

interface ObserverConsentCardProps {
  onAccept: () => void;
  onCancel: () => void;
}

const ObserverConsentCard = ({ onAccept, onCancel }: ObserverConsentCardProps) => {
  const { t } = useLanguage();
  const [checked, setChecked] = useState(false);

  return (
    <div className="bg-card/80 backdrop-blur border border-amber-200 dark:border-amber-800 rounded-3xl p-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-2.5">
        <div className="h-9 w-9 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
          <FShield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <h3 className="text-sm font-bold text-foreground">{t.premium.observerConsentTitle}</h3>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {t.premium.observerConsentDesc}
      </p>

      <label className="flex items-start gap-3 cursor-pointer group">
        <button
          type="button"
          onClick={() => setChecked(!checked)}
          className={`mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
            checked
              ? 'bg-primary border-primary text-primary-foreground'
              : 'border-border group-hover:border-primary/50'
          }`}
        >
          {checked && <FCheck className="h-3 w-3" />}
        </button>
        <span className="text-xs text-muted-foreground leading-relaxed">
          {t.premium.observerConsentCheckbox}
        </span>
      </label>

      <div className="flex gap-2 pt-1">
        <Button
          size="sm"
          className="rounded-2xl"
          disabled={!checked}
          onClick={onAccept}
        >
          {t.premium.observerConsentAccept}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-2xl"
          onClick={onCancel}
        >
          {t.cancel}
        </Button>
      </div>
    </div>
  );
};

export default ObserverConsentCard;
