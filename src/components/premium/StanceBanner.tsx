import { FUser, FUsers, FSparkles } from '@/components/icons/FreudIcons';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

import type { SubjectColor } from '@/hooks/useStance';

interface StanceBannerProps {
  subjectType: 'self' | 'relative';
  subjectName?: string;
  subjectColor?: SubjectColor | null;
  onSwitch?: () => void;
  compact?: boolean;
}

const StanceBanner = ({ subjectType, subjectName, subjectColor, onSwitch, compact }: StanceBannerProps) => {
  const { t } = useLanguage();

  const isObserver = subjectType === 'relative';

  if (compact) {
    return (
      <div className={cn(
        'flex items-center gap-2 rounded-2xl px-3 py-2 text-xs font-semibold transition-colors',
        isObserver ? 'stance-banner-observer' : 'stance-banner-self'
      )}>
        {isObserver ? <FUsers className="h-3.5 w-3.5" /> : <FUser className="h-3.5 w-3.5" />}
        <span>
          {isObserver
            ? `${t.premium.loggingFor}: ${subjectName ?? t.subjects.otherLabel}`
            : `${t.premium.loggingFor}: ${t.subjects.selfLabel}`}
        </span>
        {isObserver && (
          <Badge variant="outline" className="ml-auto rounded-full text-[9px] font-semibold gap-0.5 border-observer/35 text-observer px-1.5 py-0">
            <FSparkles className="h-2 w-2" />
            Premium
          </Badge>
        )}
        {onSwitch && (
          <button
            type="button"
            onClick={onSwitch}
            className="ml-auto text-[10px] underline underline-offset-2 opacity-70 hover:opacity-100"
          >
            {t.premium.switchStance}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-3 rounded-2xl px-4 py-3 transition-colors',
      isObserver ? 'stance-banner-observer' : 'stance-banner-self'
    )}>
      <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
        isObserver ? 'bg-observer/15 text-observer' : 'bg-primary/10 text-primary'
      }`}>
        {isObserver ? <FUsers className="h-4 w-4" /> : <FUser className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-semibold ${isObserver ? 'text-observer' : 'text-primary'}`}>
          {t.premium.loggingFor}
        </p>
        <p className="text-sm font-bold text-foreground truncate">
          {isObserver ? subjectName ?? t.subjects.otherLabel : t.subjects.selfLabel}
        </p>
      </div>
      {isObserver && (
        <Badge variant="outline" className="rounded-full text-[10px] font-semibold gap-1 border-observer/35 text-observer">
          <FSparkles className="h-2.5 w-2.5" />
          Premium
        </Badge>
      )}
      {onSwitch && (
        <button
          type="button"
          onClick={onSwitch}
          className="text-xs font-medium text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          {t.premium.switchStance}
        </button>
      )}
    </div>
  );
};

export default StanceBanner;
