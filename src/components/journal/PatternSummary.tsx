import { Button } from '@/components/ui/button';
import { FTrendingUp, FLoader, FClose } from '@/components/icons/FreudIcons';
import ReactMarkdown from 'react-markdown';
import { useLanguage } from '@/hooks/useLanguage';

interface PatternSummaryProps {
  summary: string;
  isAnalyzing: boolean;
  onDismiss: () => void;
}

const PatternSummary = ({ summary, isAnalyzing, onDismiss }: PatternSummaryProps) => {
  const { t } = useLanguage();
  if (!summary && !isAnalyzing) return null;

  return (
    <div className="bg-card/60 backdrop-blur border border-primary/20 rounded-3xl p-6 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FTrendingUp className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold uppercase tracking-widest text-primary">Pattern Summary</span>
          {isAnalyzing && <FLoader className="h-3 w-3 animate-spin text-muted-foreground" />}
        </div>
        {!isAnalyzing && summary && (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2" onClick={onDismiss}>
            <FClose className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {summary && (
        <>
          <div className="prose prose-sm max-w-none text-sm text-foreground/90 leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0">
            <ReactMarkdown>{summary}</ReactMarkdown>
          </div>
          <p className="text-[10px] text-muted-foreground/70 italic leading-snug">{t.disclaimer.aiGenerated}</p>
        </>
      )}
    </div>
  );
};

export default PatternSummary;
