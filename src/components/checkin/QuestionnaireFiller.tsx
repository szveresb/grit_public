import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { FClipboardCheck, FArrowRight } from '@/components/icons/FreudIcons';

interface Questionnaire {
  id: string;
  title: string;
  description: string | null;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  sort_order: number;
}

const QuestionnaireFiller = ({ onCompleted }: { onCompleted?: () => void }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [selectedQ, setSelectedQ] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('questionnaires')
      .select('id, title, description')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setQuestionnaires(data ?? []);
        setLoading(false);
      });
  }, []);

  const loadQuestions = async (qId: string) => {
    setSelectedQ(qId);
    setAnswers({});
    const { data } = await supabase
      .from('questionnaire_questions')
      .select('id, question_text, question_type, options, sort_order')
      .eq('questionnaire_id', qId)
      .order('sort_order');
    setQuestions(
      (data ?? []).map((q) => ({ ...q, options: q.options as string[] | null }))
    );
  };

  const handleSubmit = async () => {
    if (!user || !selectedQ) return;
    setSubmitting(true);
    const { data: resp, error } = await supabase
      .from('questionnaire_responses')
      .insert({ user_id: user.id, questionnaire_id: selectedQ })
      .select('id')
      .single();
    if (error || !resp) {
      toast.error('Failed to submit');
      setSubmitting(false);
      return;
    }
    const answerRows = Object.entries(answers).map(([question_id, answer]) => ({
      response_id: resp.id,
      question_id,
      answer: JSON.stringify(answer),
    }));
    if (answerRows.length) await supabase.from('questionnaire_answers').insert(answerRows);
    toast.success(t.selfChecks.completed);
    setSelectedQ(null);
    setAnswers({});
    setSubmitting(false);
    onCompleted?.();
  };

  const renderInput = (q: Question) => {
    const val = answers[q.id] ?? '';
    switch (q.question_type) {
      case 'scale':
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setAnswers((a) => ({ ...a, [q.id]: String(n) }))}
                className={`h-10 w-10 rounded-full border text-sm font-semibold transition-all ${
                  val === String(n)
                    ? 'bg-primary text-primary-foreground border-primary shadow-md'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        );
      case 'yes_no':
        return (
          <RadioGroup value={val} onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id={`${q.id}-yes`} />
                <Label htmlFor={`${q.id}-yes`}>{t.yes}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id={`${q.id}-no`} />
                <Label htmlFor={`${q.id}-no`}>{t.no}</Label>
              </div>
            </div>
          </RadioGroup>
        );
      case 'multiple_choice':
        return (
          <RadioGroup value={val} onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}>
            <div className="space-y-2">
              {(q.options ?? []).map((opt) => (
                <div
                  key={opt}
                  className="flex items-center gap-2 border border-border rounded-2xl p-3 hover:bg-accent/30 transition-colors"
                >
                  <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                  <Label htmlFor={`${q.id}-${opt}`} className="text-sm cursor-pointer">
                    {opt}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        );
      default:
        return (
          <Textarea
            value={val}
            onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
            rows={2}
            className="rounded-2xl"
          />
        );
    }
  };

  if (loading || questionnaires.length === 0) return null;

  // Filling a specific questionnaire
  if (selectedQ) {
    const qTitle = questionnaires.find((q) => q.id === selectedQ)?.title;
    return (
      <div className="space-y-5 animate-fade-in">
        <h3 className="text-sm font-semibold text-foreground">{qTitle}</h3>
        {questions.map((q, i) => (
          <div key={q.id} className="space-y-2">
            <Label className="text-sm font-medium">
              {i + 1}. {q.question_text}
            </Label>
            {renderInput(q)}
          </div>
        ))}
        <div className="flex gap-2">
          <Button size="sm" className="rounded-2xl" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t.selfChecks.submitting : t.submit}
          </Button>
          <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => setSelectedQ(null)}>
            {t.cancel}
          </Button>
        </div>
      </div>
    );
  }

  // List available questionnaires
  return (
    <div className="space-y-3">
      {questionnaires.map((q) => (
        <button
          key={q.id}
          onClick={() => loadQuestions(q.id)}
          className="w-full text-left flex items-center gap-3 py-2.5 px-3 rounded-2xl hover:bg-accent/50 transition-colors"
        >
          <FClipboardCheck className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium">{q.title}</span>
            {q.description && (
              <p className="text-xs text-muted-foreground truncate">{q.description}</p>
            )}
          </div>
          <FArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </button>
      ))}
    </div>
  );
};

export default QuestionnaireFiller;
