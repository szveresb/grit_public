import { useState } from 'react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';
import { useConsent } from '@/hooks/useConsent';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getDateLocale } from '@/lib/date-locale';
import { FCalendar, FTrendingUp } from '@/components/icons/FreudIcons';
import {
  usePatternDetectionRange,
  type PatternRangePreset,
} from '@/hooks/usePatternDetectionRange';

const PRESETS: PatternRangePreset[] = ['7d', '30d', '90d', 'custom'];

const AdvancedSettingsPanel = () => {
  const { t, lang } = useLanguage();
  const { consents } = useConsent();
  const { range, setRange, reset, resolved } = usePatternDetectionRange();
  const enabled = consents['pattern_detection'] ?? false;
  const locale = getDateLocale(lang);

  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);

  const startDate = range.startDate ? new Date(range.startDate) : resolved.start;
  const endDate = range.endDate ? new Date(range.endDate) : resolved.end;

  const handlePreset = (preset: PatternRangePreset) => {
    if (preset === 'custom') {
      setRange({
        preset: 'custom',
        startDate: format(resolved.start, 'yyyy-MM-dd'),
        endDate: format(resolved.end, 'yyyy-MM-dd'),
      });
    } else {
      setRange({ preset });
    }
  };

  const activeRange = t.consent.advancedSettings.patternDetection.activeRange
    .replace('{start}', format(resolved.start, 'PPP', { locale }))
    .replace('{end}', format(resolved.end, 'PPP', { locale }));

  return (
    <Accordion type="single" collapsible className="w-full max-w-md mx-auto">
      <AccordionItem value="advanced" className="surface-card border-0 px-5">
        <AccordionTrigger className="hover:no-underline py-4">
          <div className="flex items-center gap-3 text-left">
            <div className="h-9 w-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <FCalendar className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground leading-tight">
                {t.consent.advancedSettings.title}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                {t.consent.advancedSettings.subtitle}
              </p>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-5">
          <div
            className={cn(
              'rounded-3xl border border-border/50 bg-background/40 p-4 space-y-4',
              !enabled && 'opacity-60 pointer-events-none',
            )}
            aria-disabled={!enabled}
          >
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <FTrendingUp className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground leading-tight">
                  {t.consent.advancedSettings.patternDetection.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  {t.consent.advancedSettings.patternDetection.subtitle}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => {
                const active = range.preset === preset;
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handlePreset(preset)}
                    className={cn(
                      'text-xs font-semibold px-3.5 py-1.5 rounded-full border transition-colors',
                      active
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background border-border text-muted-foreground hover:text-foreground hover:border-primary/40',
                    )}
                  >
                    {t.consent.advancedSettings.presets[preset]}
                  </button>
                );
              })}
            </div>

            {range.preset === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {t.consent.advancedSettings.patternDetection.startLabel}
                  </label>
                  <Popover open={startOpen} onOpenChange={setStartOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <FCalendar className="h-4 w-4 mr-2" />
                        {format(startDate, 'PPP', { locale })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => {
                          if (!d) return;
                          setRange({
                            preset: 'custom',
                            startDate: format(d, 'yyyy-MM-dd'),
                            endDate: range.endDate ?? format(endDate, 'yyyy-MM-dd'),
                          });
                          setStartOpen(false);
                        }}
                        disabled={(d) => d > new Date()}
                        initialFocus
                        className={cn('p-3 pointer-events-auto')}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {t.consent.advancedSettings.patternDetection.endLabel}
                  </label>
                  <Popover open={endOpen} onOpenChange={setEndOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <FCalendar className="h-4 w-4 mr-2" />
                        {format(endDate, 'PPP', { locale })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(d) => {
                          if (!d) return;
                          setRange({
                            preset: 'custom',
                            startDate: range.startDate ?? format(startDate, 'yyyy-MM-dd'),
                            endDate: format(d, 'yyyy-MM-dd'),
                          });
                          setEndOpen(false);
                        }}
                        disabled={(d) => d > new Date()}
                        initialFocus
                        className={cn('p-3 pointer-events-auto')}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-muted-foreground tabular-nums">{activeRange}</p>
              <button
                type="button"
                onClick={reset}
                className="text-xs font-semibold text-primary hover:underline"
              >
                {t.consent.advancedSettings.patternDetection.reset}
              </button>
            </div>

            {!enabled && (
              <p className="text-xs text-muted-foreground italic pt-1">
                {t.consent.advancedSettings.disabledHint}
              </p>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

export default AdvancedSettingsPanel;
