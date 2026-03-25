import { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FChevronDown } from '@/components/icons/FreudIcons';
import { useLanguage } from '@/hooks/useLanguage';

export interface ConsentCategory {
  key: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  learnMore: string;
}

interface ConsentCardProps {
  category: ConsentCategory;
  granted: boolean;
  onToggle: (key: string, granted: boolean) => void;
}

const ConsentCard = ({ category, granted, onToggle }: ConsentCardProps) => {
  const [open, setOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="surface-card p-6 space-y-4 w-full max-w-md mx-auto">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
          {category.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-foreground leading-tight">{category.title}</h3>
            <Switch
              checked={granted}
              onCheckedChange={(v) => onToggle(category.key, v)}
              aria-label={category.title}
            />
          </div>
          <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{category.description}</p>
        </div>
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors font-semibold uppercase tracking-widest">
          <FChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          {t.consent.details}
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <p className="text-xs text-muted-foreground leading-relaxed">{category.learnMore}</p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default ConsentCard;
