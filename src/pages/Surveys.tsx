import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { ScopedStanceProvider, useStance } from '@/hooks/useStance';
import ConsentGate from '@/components/consent/ConsentGate';
import QuestionnaireFiller from '@/components/checkin/QuestionnaireFiller';
import { FClipboardCheck, FUsers } from '@/components/icons/FreudIcons';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';
import type { Database } from '@/integrations/supabase/types';

type QuestionnaireRow = Pick<
  Database['public']['Tables']['questionnaires']['Row'],
  'id' | 'title' | 'description' | 'is_published' | 'title_localized' | 'description_localized'
>;

type QuestionRow = Pick<
  Database['public']['Tables']['questionnaire_questions']['Row'],
  'id' | 'questionnaire_id' | 'question_text' | 'question_type' | 'options' | 'sort_order'
> & {
  options: string[] | null;
};

const Surveys = () => {
  const { user } = useAuth();
  const { t, lang, localePath } = useLanguage();
  const navigate = useNavigate();
  const { activeSubject } = useStance();
  const [publicLoading, setPublicLoading] = useState(false);
  const [publicQuestionnaires, setPublicQuestionnaires] = useState<QuestionnaireRow[]>([]);
  const [previewQuestionnaire, setPreviewQuestionnaire] = useState<QuestionnaireRow | null>(null);
  const [previewQuestions, setPreviewQuestions] = useState<QuestionRow[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const supportedSubject =
    activeSubject.type === 'relative'
      ? {
          id: activeSubject.id!,
          name: activeSubject.name,
          relationshipType: activeSubject.relationshipType,
        }
      : null;

  useEffect(() => {
    if (user) return;
    const loadPublishedQuestionnaires = async () => {
      setPublicLoading(true);
      const { data } = await supabase
        .from('questionnaires')
        .select('id, title, description, is_published, title_localized, description_localized')
        .eq('is_published', true)
        .order('created_at', { ascending: true });

      setPublicQuestionnaires((data ?? []) as QuestionnaireRow[]);
      setPublicLoading(false);
    };
    loadPublishedQuestionnaires();
  }, [user]);

  const questionnaireTitle = (questionnaire: QuestionnaireRow) => {
    const localizedTitle = questionnaire.title_localized as Record<string, string> | null;
    return lang === 'en'
      ? localizedTitle?.en ?? questionnaire.title
      : localizedTitle?.hu ?? questionnaire.title;
  };

  const questionnaireDescription = (questionnaire: QuestionnaireRow) => {
    const localizedDescription = questionnaire.description_localized as Record<string, string> | null;
    return lang === 'en'
      ? localizedDescription?.en ?? questionnaire.description
      : localizedDescription?.hu ?? questionnaire.description;
  };

  const openPublicPreview = async (questionnaire: QuestionnaireRow) => {
    setPreviewQuestionnaire(questionnaire);
    setPreviewQuestions([]);
    setPreviewLoading(true);
    const { data } = await supabase
      .from('questionnaire_questions')
      .select('id, questionnaire_id, question_text, question_type, options, sort_order')
      .eq('questionnaire_id', questionnaire.id)
      .order('sort_order');

    setPreviewQuestions(
      ((data ?? []) as Database['public']['Tables']['questionnaire_questions']['Row'][]).map((question) => ({
        id: question.id,
        questionnaire_id: question.questionnaire_id,
        question_text: question.question_text,
        question_type: question.question_type,
        options: question.options as string[] | null,
        sort_order: question.sort_order,
      })),
    );
    setPreviewLoading(false);
  };

  if (!user) {
    return (
      <DashboardLayout showContextToolPanel={false}>
        <div className="mx-auto w-full max-w-5xl space-y-5">
          <div className="pb-3 border-b border-border/50">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
              {t.nav.surveys}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {t.questionnaires_manage.subtitle}
            </p>
          </div>

          {publicLoading ? (
            <div className="surface-card p-6 text-sm text-muted-foreground">{t.loading}</div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
              <section className="surface-card space-y-4 p-5 sm:p-6">
                <h2 className="text-sm font-semibold text-foreground">{t.subjects.selfQuestionnaireTitle}</h2>
                {publicQuestionnaires.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.questionnaires_manage.noAvailable}</p>
                ) : (
                  <div className="space-y-3">
                    {publicQuestionnaires.map((questionnaire) => (
                      <button
                        key={questionnaire.id}
                        type="button"
                        onClick={() => openPublicPreview(questionnaire)}
                        className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                          previewQuestionnaire?.id === questionnaire.id
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        <p className="text-sm font-semibold text-foreground">{questionnaireTitle(questionnaire)}</p>
                        {questionnaireDescription(questionnaire) ? (
                          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                            {questionnaireDescription(questionnaire)}
                          </p>
                        ) : null}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="surface-card space-y-4 p-5 sm:p-6">
                {!previewQuestionnaire ? (
                  <p className="text-sm text-muted-foreground">{t.questionnaires_manage.previewSelectPrompt}</p>
                ) : (
                  <>
                    <h2 className="text-sm font-semibold text-foreground">{questionnaireTitle(previewQuestionnaire)}</h2>
                    {questionnaireDescription(previewQuestionnaire) ? (
                      <div className="prose prose-sm max-w-none text-sm text-muted-foreground [&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1">
                        <ReactMarkdown>{questionnaireDescription(previewQuestionnaire) ?? ''}</ReactMarkdown>
                      </div>
                    ) : null}

                    <div className="space-y-3">
                      {previewLoading ? (
                        <p className="text-sm text-muted-foreground">{t.loading}</p>
                      ) : previewQuestions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t.questionnaires_manage.noAvailable}</p>
                      ) : (
                        previewQuestions.map((question, index) => (
                          <div key={question.id} className="rounded-2xl border border-border p-3">
                            <div className="space-y-1">
                              <span className="text-sm font-medium text-foreground">{index + 1}.</span>
                              <div className="prose prose-sm max-w-none text-sm text-foreground [&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1">
                                <ReactMarkdown>{question.question_text}</ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="rounded-[1.75rem] border border-dashed border-border/60 bg-accent/20 p-4">
                      <p className="text-sm text-muted-foreground">{t.questionnaires_manage.previewAuthPrompt}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button size="sm" className="rounded-2xl" onClick={() => navigate(localePath('/auth'))}>
                          {t.auth.signIn}
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => navigate(localePath('/auth?mode=signup'))}>
                          {t.auth.createAccount}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </section>
            </div>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout showContextToolPanel={false}>
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <div className="pb-3 border-b border-border/50">
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
            {t.nav.surveys}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {t.questionnaires_manage.subtitle}
          </p>
        </div>

        <ConsentGate consentKey="questionnaire_data">
          <div className="space-y-5">
            <section className="surface-card space-y-5 p-5 sm:p-6">
              <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <FClipboardCheck className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold text-foreground">
                  {t.subjects.selfQuestionnaireTitle}
                </h2>
              </div>

              <ScopedStanceProvider subject={{ type: 'self' }}>
                <QuestionnaireFiller key="questionnaires-self" />
              </ScopedStanceProvider>
            </section>

            <section className="surface-card space-y-5 p-5 sm:p-6">
              <div className="flex items-center gap-3 pb-3 border-b border-border/50">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <FUsers className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold text-foreground">
                  {supportedSubject
                    ? `${t.subjects.thirdPartyQuestionnaireTitle} · ${supportedSubject.name}`
                    : t.subjects.thirdPartyQuestionnaireTitle}
                </h2>
              </div>

              {supportedSubject ? (
                <ScopedStanceProvider
                  subject={{
                    type: 'relative',
                    id: supportedSubject.id,
                    name: supportedSubject.name,
                    relationshipType: supportedSubject.relationshipType,
                  }}
                >
                  <QuestionnaireFiller key={`questionnaires-relative-${supportedSubject.id}`} />
                </ScopedStanceProvider>
              ) : (
                <div className="rounded-[1.75rem] border border-dashed border-border/60 bg-accent/20 p-5 text-sm text-muted-foreground">
                  {t.questionnaires_manage.supportedSelectionEmpty}
                </div>
              )}
            </section>
          </div>
        </ConsentGate>
      </div>
    </DashboardLayout>
  );
};

export default Surveys;
