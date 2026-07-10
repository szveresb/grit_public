import type { ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
} from '@/components/ui/drawer';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { FClipboardCheck, FClock } from '@/components/icons/FreudIcons';
import { useIsMobile } from '@/hooks/use-mobile';

type PanelMode = 'description' | 'history' | null;

interface QuestionnaireCardProps {
  title: string;
  description: string | null;
  repeatLabel: string;
  lastCompletedLabel?: string;
  metaFrequencyLabel: string;
  metaFrequencyValue: string;
  metaLastCompletionLabel: string;
  metaLastCompletionValue: string;
  metaNextDueLabel: string;
  metaNextDueValue: string;
  available: boolean;
  canReadMore: boolean;
  onStart: () => void;
  startLabel: string;
  historyLabel: string;
  availableNowLabel: string;
  expandLabel: string;
  completedLabel: string;
  closeLabel: string;
  detailPanelTitle: string;
  activePanel: PanelMode;
  onPanelChange: (mode: PanelMode) => void;
  historyContent: ReactNode;
  categoryLabel?: string | null;
}

const QuestionnaireCard = ({
  title,
  description,
  repeatLabel,
  lastCompletedLabel,
  metaFrequencyLabel,
  metaFrequencyValue,
  metaLastCompletionLabel,
  metaLastCompletionValue,
  metaNextDueLabel,
  metaNextDueValue,
  available,
  canReadMore,
  onStart,
  startLabel,
  historyLabel,
  availableNowLabel,
  expandLabel,
  completedLabel,
  closeLabel,
  detailPanelTitle,
  activePanel,
  onPanelChange,
  historyContent,
  categoryLabel,
}: QuestionnaireCardProps) => {
  const isMobile = useIsMobile();

  const metadataRows: Array<{ label: string; value: string }> = [
    { label: metaFrequencyLabel, value: metaFrequencyValue },
    { label: metaLastCompletionLabel, value: metaLastCompletionValue },
    { label: metaNextDueLabel, value: metaNextDueValue },
  ];

  const renderPanelContent = (mode: Exclude<PanelMode, null>) => {
    const isHistory = mode === 'history';

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-semibold leading-tight text-foreground">{title}</h4>
            {categoryLabel && (
              <span className="rounded-full border border-primary/10 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {categoryLabel}
              </span>
            )}
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {repeatLabel}
            </span>
          </div>
          {isHistory ? (
            <p className="text-sm text-muted-foreground">{detailPanelTitle}</p>
          ) : description ? (
            <div className="prose prose-sm max-w-none text-sm leading-relaxed text-muted-foreground [&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1">
              <ReactMarkdown>{description}</ReactMarkdown>
            </div>
          ) : null}
        </div>

        {isHistory ? historyContent : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onStart} disabled={!available} className="rounded-2xl sm:min-w-[160px]">
            {startLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-2xl"
            onClick={() => onPanelChange(null)}
          >
            {closeLabel}
          </Button>
        </div>
      </div>
    );
  };

  const desktopDescriptionTrigger = description && canReadMore ? (
    <Popover
      open={activePanel === 'description'}
      onOpenChange={(open) => onPanelChange(open ? 'description' : null)}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-fit text-xs font-medium text-primary underline underline-offset-2"
        >
          {expandLabel}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={12}
        className="w-[min(32rem,calc(100vw-2rem))] rounded-[1.75rem] border-border/70 bg-card/95 p-5 shadow-2xl backdrop-blur"
      >
        {renderPanelContent('description')}
      </PopoverContent>
    </Popover>
  ) : null;

  const desktopHistoryTrigger = (
    <Popover
      open={activePanel === 'history'}
      onOpenChange={(open) => onPanelChange(open ? 'history' : null)}
    >
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className="w-full rounded-2xl sm:w-auto">
          {historyLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={12}
        className="w-[min(32rem,calc(100vw-2rem))] rounded-[1.75rem] border-border/70 bg-card/95 p-5 shadow-2xl backdrop-blur"
      >
        {renderPanelContent('history')}
      </PopoverContent>
    </Popover>
  );

  return (
    <article
      className={`flex h-full min-w-0 flex-col rounded-[2rem] border p-5 shadow-sm transition-all ${
        available
          ? 'border-border/60 bg-card/80'
          : 'border-border/50 bg-card/50 opacity-75'
      } ${activePanel ? 'shadow-lg ring-1 ring-primary/15' : ''}`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <FClipboardCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 text-base font-semibold leading-tight text-foreground">
              {title}
            </h3>
            {categoryLabel && (
              <span className="rounded-full border border-primary/10 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                {categoryLabel}
              </span>
            )}
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {repeatLabel}
            </span>
          </div>

          {description && (
            <div className="space-y-2">
              <div className="prose prose-sm max-w-none text-sm leading-relaxed text-muted-foreground line-clamp-4 [&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1">
                <ReactMarkdown>{description}</ReactMarkdown>
              </div>
              {isMobile ? (
                canReadMore ? (
                  <button
                    type="button"
                    onClick={() => onPanelChange(activePanel === 'description' ? null : 'description')}
                    className="w-fit text-xs font-medium text-primary underline underline-offset-2"
                  >
                    {expandLabel}
                  </button>
                ) : null
              ) : (
                desktopDescriptionTrigger
              )}
            </div>
          )}
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-border/60 bg-background/40 p-3">
        {metadataRows.map((row) => (
          <div key={row.label} className="min-w-0 space-y-0.5">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
              {row.label}
            </dt>
            <dd className="truncate text-xs font-medium text-foreground" title={row.value}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <FClock className="h-3 w-3 shrink-0" />
        <span>{available ? availableNowLabel : completedLabel}</span>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-5 sm:flex-row sm:flex-wrap">
        <Button
          onClick={onStart}
          disabled={!available}
          className="w-full rounded-2xl sm:w-auto sm:min-w-[160px]"
        >
          {startLabel}
        </Button>
        {isMobile ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => onPanelChange(activePanel === 'history' ? null : 'history')}
            className="w-full rounded-2xl sm:w-auto"
          >
            {historyLabel}
          </Button>
        ) : (
          desktopHistoryTrigger
        )}
      </div>

      {isMobile && (
        <Drawer open={activePanel !== null} onOpenChange={(open) => onPanelChange(open ? activePanel : null)}>
          <DrawerContent className="max-h-[85vh] rounded-t-[1.75rem]">
            <div className="overflow-y-auto px-5 pb-5 pt-5">
              {activePanel ? renderPanelContent(activePanel) : null}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </article>
  );
};

export default QuestionnaireCard;
