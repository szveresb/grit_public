import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { FClose } from '@/components/icons/FreudIcons';
import { type ScoreRange } from '@/lib/score-interpretation';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
const supabase = supabaseClient as any;

interface QuestionScore {
  questionText: string;
  answer: string;
  score: number;
}

interface Subscale {
  id: string;
  name: {
    hu?: string;
    en?: string;
  };
  type: 'sum' | 'average';
  score_ranges?: {
    min: number;
    max: number;
    label: {
      hu: string;
      en: string;
    };
    description?: {
      hu?: string;
      en?: string;
    };
  }[];
}

interface ScoreResultsProps {
  surveyId?: string | null;
  totalScore: number;
  maxPossibleScore: number;
  questionScores: QuestionScore[];
  scoreRanges: ScoreRange[];
  subscaleScores?: Record<string, number>;
  onClose: () => void;
}

const ScoreResults = ({
  surveyId,
  totalScore,
  maxPossibleScore,
  questionScores,
  scoreRanges,
  subscaleScores,
  onClose,
}: ScoreResultsProps) => {
  const { t, lang } = useLanguage();
  const [interpretation, setInterpretation] = useState<{ body: string; citationIds: string[] } | null>(null);
  const [citationsList, setCitationsList] = useState<any[]>([]);
  const [subscalesList, setSubscalesList] = useState<Subscale[]>([]);

  useEffect(() => {
    if (!surveyId) return;

    const loadData = async () => {
      // Load subscales configuration
      const { data: qData } = await supabase
        .from('questionnaires')
        .select('subscales')
        .eq('id', surveyId)
        .single();

      if (qData?.subscales) {
        setSubscalesList((qData.subscales as unknown as Subscale[]) ?? []);
      }

      // Load interpretation
      const { data, error } = await supabase
        .from('survey_interpretations')
        .select('*')
        .eq('survey_id', surveyId);

      if (error || !data || data.length === 0) return;

      const matched = data.find(i => 
        i.score_min !== null && 
        i.score_max !== null && 
        totalScore >= i.score_min && 
        totalScore <= i.score_max
      ) || data.find(i => i.score_min === null && i.score_max === null);

      if (matched) {
        setInterpretation({
          body: lang === 'hu' ? matched.body_hu : matched.body_en,
          citationIds: matched.citations || []
        });

        if (matched.citations && matched.citations.length > 0) {
          const { data: studyData } = await supabase
            .from('survey_studies')
            .select('title, authors, year, citation_string, url, doi')
            .in('id', matched.citations);

          if (studyData) {
            setCitationsList(studyData);
          }
        }
      }
    };

    loadData();
  }, [surveyId, totalScore, lang]);

  const matchedRange = scoreRanges.find((r) => totalScore >= r.min && totalScore <= r.max);
  const pct = maxPossibleScore > 0 ? Math.round(Math.max(0, (totalScore / maxPossibleScore) * 100)) : 0;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{t.questionnaires_manage.yourScore}</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <FClose className="h-4 w-4" />
        </Button>
      </div>

      {/* Total score */}
      <div className="bg-accent/30 rounded-2xl p-5 text-center space-y-3">
        <div className="text-3xl font-bold text-foreground">{totalScore}</div>
        <Progress value={pct} className="h-2 rounded-full" />
        <p className="text-xs text-muted-foreground">
          {t.questionnaires_manage.totalScore}: {totalScore} / {maxPossibleScore}
        </p>
        {scoreRanges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 justify-center">
            {scoreRanges.map((range) => (
              <span
                key={`${range.min}-${range.max}`}
                className="rounded-full bg-accent/30 px-2 py-0.5 text-[11px] font-medium text-foreground"
              >
                {range.label
                  ? range.label
                  : range.labelKey === 'low'
                  ? t.questionnaires_manage.interpretationRangeLow
                  : range.labelKey === 'medium'
                    ? t.questionnaires_manage.interpretationRangeMedium
                    : t.questionnaires_manage.interpretationRangeHigh}
                {' '}
                {range.min}–{range.max}
              </span>
            ))}
          </div>
        )}
        {matchedRange && (
          <div className="mt-2 space-y-1">
            <span className="inline-block text-sm font-semibold px-3 py-1 rounded-full bg-primary/10 text-primary">
              {matchedRange.label
                ? matchedRange.label
                : matchedRange.labelKey === 'low'
                ? t.questionnaires_manage.interpretationRangeLow
                : matchedRange.labelKey === 'medium'
                  ? t.questionnaires_manage.interpretationRangeMedium
                  : t.questionnaires_manage.interpretationRangeHigh}
            </span>
            {matchedRange.description && (
              <p className="text-xs text-muted-foreground leading-relaxed">{matchedRange.description}</p>
            )}
          </div>
        )}
        {interpretation && (
          <div className="rounded-2xl border border-border/60 bg-background px-4 py-3.5 text-left space-y-2.5 mt-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t.questionnaires_manage.interpretation}
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {interpretation.body}
            </p>
            {citationsList.length > 0 && (
              <div className="border-t border-border/40 pt-2.5 space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">
                  {t.questionnaires_manage.citationTitle}
                </span>
                <ul className="space-y-1.5 list-none pl-0">
                  {citationsList.map((cite, i) => (
                    <li key={i} className="text-[10px] text-muted-foreground leading-snug">
                      {cite.url || cite.doi ? (
                        <a
                          href={cite.url || `https://doi.org/${cite.doi}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline hover:text-primary transition-colors block font-medium"
                        >
                          {cite.citation_string || `${cite.authors || 'Unknown'} (${cite.year || 'n.d.'}). ${cite.title}`}
                        </a>
                      ) : (
                        <span>
                          {cite.citation_string || `${cite.authors || 'Unknown'} (${cite.year || 'n.d.'}). ${cite.title}`}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Subscale scores */}
      {subscalesList.length > 0 && subscaleScores && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-left">
            {t.questionnaires_manage.subscaleScores}
          </h4>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {subscalesList.map((sub) => {
              const score = subscaleScores[sub.id] ?? 0;
              const name = lang === 'en' ? sub.name.en || sub.id : sub.name.hu || sub.id;
              const typeLabel = sub.type === 'average' ? t.questionnaires_manage.subscaleTypeAverage : t.questionnaires_manage.subscaleTypeSum;

              // Find matched subscale range
              const matchedRange = (sub.score_ranges || []).find(r => score >= r.min && score <= r.max);
              const matchedLabel = matchedRange ? (lang === 'en' ? matchedRange.label.en : matchedRange.label.hu) : null;
              const matchedDesc = matchedRange?.description ? (lang === 'en' ? matchedRange.description.en : matchedRange.description.hu) : null;

              return (
                <div key={sub.id} className="bg-accent/20 rounded-xl p-3 flex flex-col justify-between text-xs border border-border/30 space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="text-left">
                      <p className="font-semibold text-foreground">{name}</p>
                      <p className="text-[10px] text-muted-foreground">{typeLabel}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-foreground">{score}</span>
                      {matchedLabel && (
                        <span className="block text-[10px] font-semibold text-primary mt-0.5">
                          {matchedLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  {matchedDesc && (
                    <p className="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-border/20 text-left">
                      {matchedDesc}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Per-question breakdown */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t.questionnaires_manage.scoreBreakdown}
        </h4>
        {questionScores.map((qs, i) => (
          <div key={i} className="flex items-center justify-between border border-border rounded-xl px-3 py-2">
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-xs font-medium text-foreground truncate">{i + 1}. {qs.questionText}</p>
              {qs.answer === '__SKIPPED__' ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold">
                  {t.questionnaires_manage.skipped}
                </span>
              ) : (
                <p className="text-[11px] text-muted-foreground">{qs.answer}</p>
              )}
            </div>
            {qs.answer !== '__SKIPPED__' && (
              <span className="text-sm font-semibold text-foreground shrink-0">{qs.score >= 0 ? '+' : ''}{qs.score}</span>
            )}
          </div>
        ))}
      </div>

      <Button size="sm" variant="outline" className="rounded-2xl w-full" onClick={onClose}>
        {t.questionnaires_manage.closeResults}
      </Button>
    </div>
  );
};

export default ScoreResults;
