import { useConsent } from '@/hooks/useConsent';
import { useLanguage } from '@/hooks/useLanguage';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FShield } from '@/components/icons/FreudIcons';
import type { ConsentKey } from './consentCategories';

interface ConsentGateProps {
  consentKey: ConsentKey;
  children: React.ReactNode;
  /** Compact inline variant vs full card */
  variant?: 'card' | 'inline';
}

const ConsentGate = ({ consentKey, children, variant = 'card' }: ConsentGateProps) => {
  const { hasConsent, loaded } = useConsent();
  const { t, localePath } = useLanguage();
  const navigate = useNavigate();

  if (!loaded) return null;

  if (hasConsent(consentKey)) return <>{children}</>;

  const categoryTitle = t.consent.categories[consentKey]?.title ?? consentKey;

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-accent/20 text-sm text-muted-foreground">
        <FShield className="h-4 w-4 shrink-0" />
        <span>{t.consent.gateMessage.replace('{feature}', categoryTitle)}</span>
        <button
          onClick={() => navigate(localePath('/profile'))}
          className="ml-auto text-xs font-semibold text-primary hover:underline whitespace-nowrap"
        >
          {t.consent.gateAction}
        </button>
      </div>
    );
  }

  return (
    <div className="surface-card p-6 space-y-3">
      <div className="flex items-center gap-2">
        <FShield className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{t.consent.gateTitle}</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        {t.consent.gateMessage.replace('{feature}', categoryTitle)}
      </p>
      <Button
        variant="outline"
        size="sm"
        className="rounded-2xl gap-1.5"
        onClick={() => navigate(localePath('/profile'))}
      >
        <FShield className="h-3.5 w-3.5" />
        {t.consent.gateAction}
      </Button>
    </div>
  );
};

export default ConsentGate;
