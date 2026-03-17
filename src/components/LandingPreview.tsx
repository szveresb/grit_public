import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { FArrowRight } from '@/components/icons/FreudIcons';

interface PreviewQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  sort_order: number;
}

interface PreviewQuestionnaire {
  id: string;
  title: string;
  description: string | null;
  questions: PreviewQuestion[];
}

const questionTypeLabel = (type: string, t: ReturnType<typeof useLanguage>['t'], options?: string[] | null): string => {
  switch (type) {
    case 'scale': {
      const sMin = options && options.length >= 2 ? Number(options[0]) || 1 : 1;
      const sMax = options && options.length >= 2 ? Number(options[1]) || 5 : 5;
      return `${t.questionnaires_manage.scaleType} ${sMin}–${sMax}`;
    }
    case 'yes_no': return `${t.yes} / ${t.no}`;
    case 'multiple_choice': return t.landing.previewTypeMultiple;
    default: return t.landing.previewTypeText;
  }
};

const LandingPreview = () => {
  const { user } = useAuth();
  const { t, localePath } = useLanguage();
  const navigate = useNavigate();
  const [data, setData] = useState<PreviewQuestionnaire | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      // Get the first published questionnaire with its questions
      const { data: qs } = await supabase
        .from('questionnaires')
        .select('id, title, description')
        .eq('is_published', true)
        .order('created_at', { ascending: true })
        .limit(1);

      if (!qs || qs.length === 0) { setLoading(false); return; }

      const q = qs[0];
      const { data: questions } = await supabase
        .from('questionnaire_questions')
        .select('id, question_text, question_type, options, sort_order')
        .eq('questionnaire_id', q.id)
        .order('sort_order')
        .limit(5);

      setData({
        ...q,
        questions: (questions ?? []).map(qq => ({
          ...qq,
          options: qq.options as string[] | null,
        })),
      });
      setLoading(false);
    };
    fetch();
  }, []);

  if (loading) {
    return (
      <div className="bg-card/70 backdrop-blur border border-border rounded-[40px] p-6 md:p-8 space-y-5">
        <Skeleton className="h-4 w-32" />
        {[1, 2, 3].map(i => (
          <div key={i} className="border border-border rounded-2xl p-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (!data || data.questions.length === 0) {
    return null; // No published questionnaire, hide section entirely
  }

  return (
    <div className="bg-card/70 backdrop-blur border border-border rounded-[40px] p-6 md:p-8 space-y-5">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {data.title}
      </h3>
      {data.questions.map((q, i) => (
        <div key={q.id} className="border border-border rounded-2xl p-4 space-y-2">
          <p className="text-sm font-medium text-foreground">{i + 1}. {q.question_text}</p>
          <Badge variant="outline" className="rounded-full text-[10px]">
            {questionTypeLabel(q.question_type, t)}
          </Badge>
          {q.question_type === 'scale' && (() => {
            const sMin = q.options && q.options.length >= 2 ? Number(q.options[0]) || 1 : 1;
            const sMax = q.options && q.options.length >= 2 ? Number(q.options[1]) || 5 : 5;
            const points = Array.from({ length: sMax - sMin + 1 }, (_, i) => sMin + i);
            return (
              <div className="flex gap-2 pt-1 flex-wrap">
                {points.map(n => (
                  <div key={n} className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-xs text-muted-foreground">{n}</div>
                ))}
              </div>
            );
          })()}
          {q.question_type === 'multiple_choice' && q.options && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {q.options.map(opt => (
                <span key={opt} className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground">{opt}</span>
              ))}
            </div>
          )}
        </div>
      ))}
      <div className="text-center pt-2">
        {user ? (
          <Button className="rounded-2xl px-6" onClick={() => navigate(localePath('/journal'))}>
            {t.landing.goToJournal} <FArrowRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">{t.landing.createFreeAccount}</p>
            <Button className="rounded-2xl px-6" onClick={() => navigate(localePath('/auth'))}>
              {t.landing.createYourSpace} <FArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LandingPreview;
