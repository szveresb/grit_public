import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage, stripLangPrefix } from '@/hooks/useLanguage';
import { useStance } from '@/hooks/useStance';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FCheck, FLoader, FMessageCircle } from '@/components/icons/FreudIcons';
import { toast } from 'sonner';

type FeedbackKind = Database['public']['Tables']['user_feedback']['Insert']['kind'];
type FeedbackUrgency = NonNullable<Database['public']['Tables']['user_feedback']['Insert']['urgency']>;
type ViewportType = Database['public']['Tables']['user_feedback']['Insert']['viewport'];

interface FeedbackSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FeedbackSheet = ({ open, onOpenChange }: FeedbackSheetProps) => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { activeSubject } = useStance();
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const currentPath = stripLangPrefix(pathname);

  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [summary, setSummary] = useState('');
  const [message, setMessage] = useState('');
  const [urgency, setUrgency] = useState<FeedbackUrgency>('medium');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const formRef = useRef<HTMLDivElement | null>(null);
  const summaryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) return;
    setKind(null);
    setSummary('');
    setMessage('');
    setUrgency('medium');
    setSubmitting(false);
    setSubmitted(false);
  }, [open]);

  useEffect(() => {
    if (!open || !kind || submitted) return;

    const frameId = window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      summaryInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [kind, open, submitted]);

  const pageLabel = useMemo(() => {
    if (currentPath === '/journal') return t.nav.checkIn;
    if (currentPath === '/surveys') return t.nav.surveys;
    if (currentPath === '/timeline') return t.timeline.pageTitle;
    if (currentPath === '/export') return t.nav.dataExport;
    if (currentPath === '/profile') return t.nav.account;
    if (currentPath === '/manage-library') return t.nav.manageLibrary;
    if (currentPath === '/manage-questionnaires') return t.nav.manageQuestionnaires;
    if (currentPath === '/manage-landing') return t.nav.manageLanding;
    if (currentPath === '/manage-users') return t.nav.manageUsers;
    if (currentPath === '/analyst-export') return t.nav.analystExport;
    return currentPath === '/' ? t.nav.home : currentPath.replace('/', '');
  }, [currentPath, t]);

  const viewport = useMemo<ViewportType>(() => {
    if (typeof window === 'undefined') return 'desktop';
    if (window.innerWidth < 768) return 'mobile';
    if (window.innerWidth < 1280) return 'tablet';
    return 'desktop';
  }, [isMobile, open]);

  const subjectLabel =
    activeSubject.type === 'relative' ? activeSubject.name : t.subjects.selfCardTitle;
  const viewportLabel =
    viewport === 'mobile'
      ? t.feedback.viewportMobile
      : viewport === 'tablet'
        ? t.feedback.viewportTablet
        : t.feedback.viewportDesktop;

  const summaryLabel = useMemo(() => {
    switch (kind) {
      case 'bug':
        return t.feedback.summaryBug;
      case 'unclear':
        return t.feedback.summaryUnclear;
      case 'idea':
        return t.feedback.summaryIdea;
      case 'praise':
        return t.feedback.summaryPraise;
      case 'question':
        return t.feedback.summaryQuestion;
      default:
        return t.feedback.summaryDefault;
    }
  }, [kind, t]);

  const detailsLabel = useMemo(() => {
    switch (kind) {
      case 'bug':
        return t.feedback.detailsBug;
      case 'unclear':
        return t.feedback.detailsUnclear;
      case 'idea':
        return t.feedback.detailsIdea;
      case 'praise':
        return t.feedback.detailsPraise;
      case 'question':
        return t.feedback.detailsQuestion;
      default:
        return t.feedback.detailsDefault;
    }
  }, [kind, t]);

  const messageRequired = kind !== 'praise';
  const canSubmit = !!kind && summary.trim().length > 0 && (!messageRequired || message.trim().length > 0);

  const kindOptions: Array<{
    value: FeedbackKind;
    label: string;
    description: string;
  }> = [
    { value: 'bug', label: t.feedback.kindBug, description: t.feedback.kindBugDesc },
    { value: 'unclear', label: t.feedback.kindUnclear, description: t.feedback.kindUnclearDesc },
    { value: 'idea', label: t.feedback.kindIdea, description: t.feedback.kindIdeaDesc },
    { value: 'praise', label: t.feedback.kindPraise, description: t.feedback.kindPraiseDesc },
    { value: 'question', label: t.feedback.kindQuestion, description: t.feedback.kindQuestionDesc },
  ];

  const urgencyOptions: Array<{ value: FeedbackUrgency; label: string }> = [
    { value: 'low', label: t.feedback.urgencyLow },
    { value: 'medium', label: t.feedback.urgencyMedium },
    { value: 'high', label: t.feedback.urgencyHigh },
  ];

  const handleSubmit = async () => {
    if (!user || !kind || !canSubmit) return;

    setSubmitting(true);

    const payload: Database['public']['Tables']['user_feedback']['Insert'] = {
      user_id: user.id,
      kind,
      summary: summary.trim(),
      message: message.trim() || null,
      urgency: kind === 'question' ? urgency : null,
      page_path: currentPath,
      subject_type: activeSubject.type,
      subject_id: activeSubject.type === 'relative' ? activeSubject.id : null,
      locale: lang,
      viewport,
      context_json: {
        page_label: pageLabel,
        subject_name: subjectLabel,
        subject_key: activeSubject.key,
        viewport,
        pathname: currentPath,
      },
    };

    const { error } = await supabase.from('user_feedback').insert(payload);

    setSubmitting(false);

    if (error) {
      toast.error(t.feedback.submitError);
      return;
    }

    setSubmitted(true);
  };

  const content = submitted ? (
    <div className="space-y-6">
      <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary/10 text-primary">
        <FCheck className="h-5 w-5" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-foreground">{t.feedback.successTitle}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{t.feedback.successBody}</p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          className="rounded-2xl"
          onClick={() => {
            setSubmitted(false);
            setKind(null);
            setSummary('');
            setMessage('');
            setUrgency('medium');
          }}
        >
          {t.feedback.sendAnother}
        </Button>
        <Button type="button" variant="outline" className="rounded-2xl" onClick={() => onOpenChange(false)}>
          {t.ui.close}
        </Button>
      </div>
    </div>
  ) : (
    <div className="space-y-6">
      <div className="rounded-[1.75rem] border border-border/60 bg-accent/20 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {t.feedback.contextLabel}
        </p>
        <p className="mt-2 text-sm font-medium text-foreground break-words">
          {pageLabel} / {subjectLabel} / {viewportLabel}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t.feedback.contextHint}</p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">{t.feedback.prompt}</p>
        <div className="grid grid-cols-1 gap-2">
          {kindOptions.map((option) => {
            const isActive = kind === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setKind(option.value)}
                className={`rounded-[1.5rem] border px-4 py-3 text-left transition-all ${
                  isActive
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border/60 bg-card hover:border-primary/30 hover:bg-accent/20'
                }`}
              >
                <div className="text-sm font-semibold text-foreground break-words">{option.label}</div>
                <div className="mt-1 text-xs leading-relaxed text-muted-foreground break-words">{option.description}</div>
              </button>
            );
          })}
        </div>
      </div>

      {kind && (
        <div ref={formRef} className="space-y-4 animate-fade-in">
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {summaryLabel}
            </label>
            <Input
              ref={summaryInputRef}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder={summaryLabel}
              className="h-11 rounded-2xl"
              maxLength={140}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {detailsLabel}
            </label>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={detailsLabel}
              rows={4}
              className="rounded-[1.5rem]"
            />
          </div>

          {kind === 'question' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {t.feedback.urgencyLabel}
              </label>
              <div className="flex flex-wrap gap-2">
                {urgencyOptions.map((option) => (
                  <Button
                    key={option.value}
                    type="button"
                    variant={urgency === option.value ? 'default' : 'outline'}
                    className="rounded-full"
                    onClick={() => setUrgency(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="rounded-2xl" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="button" className="rounded-2xl" disabled={!canSubmit || submitting} onClick={handleSubmit}>
              {submitting ? (
                <>
                  <FLoader className="mr-2 h-4 w-4 animate-spin" />
                  {t.feedback.sending}
                </>
              ) : kind === 'question' ? (
                t.feedback.sendQuestion
              ) : (
                t.feedback.send
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[32rem] p-6 rounded-[1.75rem]">
        <DialogHeader className="sr-only">
          <DialogTitle>{t.feedback.title}</DialogTitle>
          <DialogDescription>{t.feedback.subtitle}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6 max-h-[80vh]">
          <div className="space-y-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1.25rem] bg-primary/10 text-primary">
              <FMessageCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-foreground">{t.feedback.title}</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t.feedback.subtitle}</p>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1 pb-4">{content}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackSheet;
