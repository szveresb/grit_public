import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { FChevronDown, FClipboardCheck, FClock } from '@/components/icons/FreudIcons';

interface QuestionnaireCardProps {
  title: string;
  description: string | null;
  repeatLabel: string;
  lastCompletedLabel?: string;
  available: boolean;
  descriptionExpanded: boolean;
  canToggleDescription: boolean;
  onToggleDescription: () => void;
  onStart: () => void;
  onToggleHistory: () => void;
  historyOpen: boolean;
  startLabel: string;
  historyLabel: string;
  hideHistoryLabel: string;
  availableNowLabel: string;
  expandLabel: string;
  collapseLabel: string;
  completedLabel: string;
  children?: React.ReactNode;
}

const QuestionnaireCard = ({
  title,
  description,
  repeatLabel,
  lastCompletedLabel,
  available,
  descriptionExpanded,
  canToggleDescription,
  onToggleDescription,
  onStart,
  onToggleHistory,
  historyOpen,
  startLabel,
  historyLabel,
  hideHistoryLabel,
  availableNowLabel,
  expandLabel,
  collapseLabel,
  completedLabel,
  children,
}: QuestionnaireCardProps) => {
  return (
    <Collapsible open={historyOpen} onOpenChange={onToggleHistory}>
      <article
      className={`flex h-full min-w-0 flex-col rounded-[2rem] border p-5 shadow-sm transition-colors ${
        available
          ? 'border-border/60 bg-card/80'
          : 'border-border/50 bg-card/50 opacity-75'
      } ${historyOpen ? 'relative z-10 shadow-lg ring-1 ring-primary/15' : ''}`}
      >
      <div className="flex items-start gap-3 overflow-visible">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FClipboardCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 text-base font-semibold leading-tight text-foreground">
              {title}
            </h3>
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {repeatLabel}
            </span>
          </div>

          {description && (
            <div className="space-y-2">
              <p
                className={`text-sm leading-relaxed text-muted-foreground ${
                  descriptionExpanded ? '' : 'line-clamp-4'
                }`}
              >
                {description}
              </p>
              {canToggleDescription && (
                <button
                  type="button"
                  onClick={onToggleDescription}
                  className="text-xs font-medium text-primary underline underline-offset-2"
                >
                  {descriptionExpanded ? collapseLabel : expandLabel}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {lastCompletedLabel ? (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FClock className="h-3.5 w-3.5 shrink-0" />
            <span>{lastCompletedLabel}</span>
          </div>
        ) : (
          <span className="text-xs font-medium text-muted-foreground">
            {available ? availableNowLabel : completedLabel}
          </span>
        )}

        {!available && (
          <span className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {completedLabel}
          </span>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row sm:flex-wrap">
        <Button
          onClick={onStart}
          disabled={!available}
          className="w-full rounded-2xl sm:w-auto sm:min-w-[160px]"
        >
          {startLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onToggleHistory}
          className="w-full rounded-2xl sm:w-auto"
        >
          <span>{historyOpen ? hideHistoryLabel : historyLabel}</span>
          <FChevronDown className={`ml-2 h-4 w-4 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
        </Button>
      </div>

      <CollapsibleContent className="pt-4">
        <div className="rounded-[1.5rem] border border-border/60 bg-background/75 p-4">
          {children}
        </div>
      </CollapsibleContent>
    </article>
    </Collapsible>
  );
};

export default QuestionnaireCard;
