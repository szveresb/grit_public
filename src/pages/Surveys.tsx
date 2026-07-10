import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { ScopedStanceProvider, useStance } from '@/hooks/useStance';
import ConsentGate from '@/components/consent/ConsentGate';
import QuestionnaireFiller from '@/components/checkin/QuestionnaireFiller';
import { FArrowLeft, FClipboardCheck, FUsers, FBookOpen, FArrowRight } from '@/components/icons/FreudIcons';
import Breadcrumbs from '@/components/Breadcrumbs';
import { Button } from '@/components/ui/button';
import type { Database } from '@/integrations/supabase/types';
import {
  getFallbackQuestionnaireCategory,
  isMissingQuestionnaireCategorySchema,
  QUESTIONNAIRE_PUBLIC_SELECT_WITH_CATEGORIES,
  FALLBACK_QUESTIONNAIRE_CATEGORIES,
  type QuestionnaireCategoryLike,
} from '@/lib/questionnaire-category-schema';

type QuestionnaireRow = Pick<
  Database['public']['Tables']['questionnaires']['Row'],
  'id' | 'title' | 'description' | 'is_published' | 'title_localized' | 'description_localized' | 'interpretation_profile'
> & {
  category_id?: string | null;
  category?: {
    id: string;
    key: string;
    name_hu: string;
    name_en: string;
  } | null;
};

type QuestionRow = Pick<
  Database['public']['Tables']['questionnaire_questions']['Row'],
  'id' | 'questionnaire_id' | 'question_text' | 'sort_order'
>;

const Surveys = () => {
  const { user } = useAuth();
  const { t, lang, localePath } = useLanguage();
  const navigate = useNavigate();
  const { id: questionnaireId } = useParams<{ id?: string }>();
  const { activeSubject } = useStance();
  const [publicListLoading, setPublicListLoading] = useState(false);
  const [publicQuestionnaires, setPublicQuestionnaires] = useState<QuestionnaireRow[]>([]);
  const [publicDetailLoading, setPublicDetailLoading] = useState(false);
  const [publicDetailQuestionnaire, setPublicDetailQuestionnaire] = useState<QuestionnaireRow | null>(null);
  const [publicDetailQuestions, setPublicDetailQuestions] = useState<QuestionRow[]>([]);
  const [publicDetailNotFound, setPublicDetailNotFound] = useState(false);
  const [categories, setCategories] = useState<QuestionnaireCategoryLike[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const supportedSubject =
    activeSubject.type === 'relative'
      ? {
          id: activeSubject.id!,
          name: activeSubject.name,
          relationshipType: activeSubject.relationshipType,
        }
      : null;

  useEffect(() => {
    if (user || questionnaireId) return;
    const loadPublishedQuestionnaires = async () => {
      setPublicListLoading(true);
      const result = await supabase
        .from('questionnaires')
        .select(QUESTIONNAIRE_PUBLIC_SELECT_WITH_CATEGORIES)
        .eq('is_published', true)
        .order('created_at', { ascending: true });

      if (result.error && isMissingQuestionnaireCategorySchema(result.error)) {
        const fallback = await supabase
          .from('questionnaires')
          .select('id, title, description, is_published, title_localized, description_localized, interpretation_profile')
          .eq('is_published', true)
          .order('created_at', { ascending: true });

        if (fallback.error) {
          console.error('Error loading public questionnaires:', fallback.error);
        } else {
          setPublicQuestionnaires(
            ((fallback.data ?? []) as QuestionnaireRow[]).map((questionnaire) => ({
              ...questionnaire,
              category: getFallbackQuestionnaireCategory(questionnaire.title),
            }))
          );
        }
      } else {
        if (result.error) {
          console.error('Error loading public questionnaires:', result.error);
        }
        setPublicQuestionnaires((result.data ?? []) as QuestionnaireRow[]);
      }
      setPublicListLoading(false);
    };
    loadPublishedQuestionnaires();
  }, [questionnaireId, user]);

  useEffect(() => {
    if (user || questionnaireId) return;
    const loadCategories = async () => {
      const { data, error } = await supabase
        .from('questionnaire_categories')
        .select('id, key, name_hu, name_en, is_active, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      const missingCategorySchema = isMissingQuestionnaireCategorySchema(error);

      if (error && !missingCategorySchema) {
        console.error('Error loading categories:', error);
      }

      if (missingCategorySchema) {
        setCategories(FALLBACK_QUESTIONNAIRE_CATEGORIES);
      } else {
        setCategories((data ?? []) as QuestionnaireCategoryLike[]);
      }
    };
    loadCategories();
  }, [questionnaireId, user]);

  useEffect(() => {
    if (user || !questionnaireId) return;
    const loadPublicDetail = async () => {
      setPublicDetailLoading(true);
      setPublicDetailNotFound(false);
      setPublicDetailQuestionnaire(null);
      setPublicDetailQuestions([]);

      const result = await supabase
        .from('questionnaires')
        .select(QUESTIONNAIRE_PUBLIC_SELECT_WITH_CATEGORIES)
        .eq('id', questionnaireId)
        .eq('is_published', true)
        .maybeSingle();

      let questionnaire = result.data;
      if (result.error && isMissingQuestionnaireCategorySchema(result.error)) {
        const fallback = await supabase
          .from('questionnaires')
          .select('id, title, description, is_published, title_localized, description_localized, interpretation_profile')
          .eq('id', questionnaireId)
          .eq('is_published', true)
          .maybeSingle();

        if (fallback.error) {
          console.error('Error loading survey detail:', fallback.error);
        } else {
          questionnaire = fallback.data
            ? {
                ...fallback.data,
                category: getFallbackQuestionnaireCategory(fallback.data.title),
              }
            : fallback.data;
        }
      } else if (result.error) {
        console.error('Error loading survey detail:', result.error);
      }

      if (!questionnaire) {
        setPublicDetailNotFound(true);
        setPublicDetailLoading(false);
        return;
      }

      setPublicDetailQuestionnaire(questionnaire as QuestionnaireRow);

      const { data: questions } = await supabase
        .from('questionnaire_questions')
        .select('id, questionnaire_id, question_text, sort_order')
        .eq('questionnaire_id', questionnaireId)
        .order('sort_order');

      setPublicDetailQuestions((questions ?? []) as QuestionRow[]);
      setPublicDetailLoading(false);
    };

    loadPublicDetail();
  }, [questionnaireId, user]);

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

  const filteredPublicQuestionnaires = publicQuestionnaires.filter((questionnaire) => {
    if (selectedCategory === 'all') return true;
    return questionnaire.category?.key === selectedCategory;
  });

  if (!user) {
    if (questionnaireId) {
      return (
        <DashboardLayout showContextToolPanel={false}>
          <div className="mx-auto w-full max-w-5xl space-y-5 pb-28">
            <div className="pb-3 border-b border-border/50">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
                {t.nav.surveys}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                {t.questionnaires_manage.subtitle}
              </p>
            </div>

            <section className="surface-card space-y-4 p-5 sm:p-6">
              <Link
                to={localePath('/surveys')}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <FArrowLeft className="h-4 w-4" />
                {t.observations.back}
              </Link>

              {publicDetailLoading ? (
                <p className="text-sm text-muted-foreground">{t.loading}</p>
              ) : publicDetailNotFound || !publicDetailQuestionnaire ? (
                <p className="text-sm text-muted-foreground">{t.questionnaires_manage.noAvailable}</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-foreground">
                      {questionnaireTitle(publicDetailQuestionnaire)}
                    </h2>
                    {publicDetailQuestionnaire.category && (
                      <span className="rounded-full border border-primary/10 bg-primary/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {lang === 'en' ? publicDetailQuestionnaire.category.name_en : publicDetailQuestionnaire.category.name_hu}
                      </span>
                    )}
                  </div>
                  {questionnaireDescription(publicDetailQuestionnaire) ? (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {questionnaireDescription(publicDetailQuestionnaire)}
                    </p>
                  ) : null}

                  <div className="space-y-2">
                    {publicDetailQuestions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t.questionnaires_manage.noAvailable}</p>
                    ) : (
                      publicDetailQuestions
                        .slice(0, Math.max(1, Math.floor(publicDetailQuestions.length / 2)))
                        .map((question, index) => (
                        <div key={question.id} className="rounded-xl border border-border/70 p-3">
                          <p className="text-sm font-medium text-foreground">
                            {index + 1}. {question.question_text}
                          </p>
                        </div>
                        ))
                    )}
                  </div>
                </>
              )}
            </section>
          </div>

          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 backdrop-blur">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
              <p className="text-sm text-muted-foreground">{t.questionnaires_manage.previewAuthPrompt}</p>
              <div className="flex shrink-0 gap-2">
                <Button size="sm" className="rounded-2xl" onClick={() => navigate(localePath('/auth'))}>
                  {t.auth.signIn}
                </Button>
                <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => navigate(localePath('/auth?mode=signup'))}>
                  {t.auth.createAccount}
                </Button>
              </div>
            </div>
          </div>
        </DashboardLayout>
      );
    }

    return (
      <DashboardLayout showContextToolPanel={false}>
        <div className="mx-auto w-full max-w-5xl space-y-5">
          <Breadcrumbs items={[{ label: t.nav.surveys }]} />
          <div className="pb-3 border-b border-border/50">
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
              {t.nav.surveys}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {t.questionnaires_manage.subtitle}
            </p>
            <Link
              to={localePath('/library')}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary hover:text-foreground transition-colors"
            >
              <FBookOpen className="h-3.5 w-3.5" />
              {t.nav.library}
              <FArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {publicListLoading ? (
            <div className="surface-card p-6 text-sm text-muted-foreground">{t.loading}</div>
          ) : (
            <section className="surface-card space-y-4 p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <h2 className="text-sm font-semibold text-foreground">{t.subjects.selfQuestionnaireTitle}</h2>
                {categories.length > 0 && (
                  <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
                    <button
                      type="button"
                      onClick={() => setSelectedCategory('all')}
                      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        selectedCategory === 'all'
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {t.questionnaires_manage.filterAllTopics}
                    </button>
                    {categories.map((cat) => {
                      const label = lang === 'en' ? cat.name_en : cat.name_hu;
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setSelectedCategory(cat.key)}
                          className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                            selectedCategory === cat.key
                              ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                              : 'border-border bg-background text-muted-foreground hover:border-primary/50'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {filteredPublicQuestionnaires.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {selectedCategory === 'all'
                    ? t.questionnaires_manage.noAvailable
                    : t.questionnaires_manage.noMatchingQuestionnaires}
                </p>
              ) : selectedCategory !== 'all' ? (
                <div className="space-y-3">
                  {filteredPublicQuestionnaires.map((questionnaire) => (
                    <Link
                      key={questionnaire.id}
                      to={localePath(`/surveys/${questionnaire.id}`)}
                      className="block w-full rounded-2xl border border-border p-4 text-left transition-colors hover:border-primary/40"
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-foreground">{questionnaireTitle(questionnaire)}</span>
                        {questionnaire.category && (
                          <span className="rounded-full border border-primary/10 bg-primary/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                            {lang === 'en' ? questionnaire.category.name_en : questionnaire.category.name_hu}
                          </span>
                        )}
                      </div>
                      {questionnaireDescription(questionnaire) ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {questionnaireDescription(questionnaire)}
                        </p>
                      ) : null}
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {(() => {
                    const categoriesWithSurveys = categories
                      .map((cat) => {
                        const items = filteredPublicQuestionnaires.filter((q) => q.category?.key === cat.key);
                        return { category: cat, items };
                      })
                      .filter((group) => group.items.length > 0);

                    const uncategorizedItems = filteredPublicQuestionnaires.filter(
                      (q) => !q.category || !categories.some((cat) => cat.key === q.category?.key)
                    );

                    if (uncategorizedItems.length > 0) {
                      categoriesWithSurveys.push({
                        category: {
                          id: 'uncategorized',
                          key: 'uncategorized',
                          name_hu: t.questionnaires_manage.uncategorized ?? 'Egyéb',
                          name_en: t.questionnaires_manage.uncategorized ?? 'Other',
                          is_active: true,
                          sort_order: 9999,
                        },
                        items: uncategorizedItems,
                      });
                    }

                    return categoriesWithSurveys.map(({ category, items }) => (
                      <div key={category.id} className="space-y-2.5">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 border-b border-border/40 pb-1">
                          {lang === 'en' ? category.name_en : category.name_hu}
                        </h3>
                        <div className="space-y-3">
                          {items.map((questionnaire) => (
                            <Link
                              key={questionnaire.id}
                              to={localePath(`/surveys/${questionnaire.id}`)}
                              className="block w-full rounded-2xl border border-border p-4 text-left transition-colors hover:border-primary/40 bg-card/50"
                            >
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="text-sm font-semibold text-foreground">{questionnaireTitle(questionnaire)}</span>
                                {questionnaire.category && (
                                  <span className="rounded-full border border-primary/10 bg-primary/5 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                                    {lang === 'en' ? questionnaire.category.name_en : questionnaire.category.name_hu}
                                  </span>
                                )}
                              </div>
                              {questionnaireDescription(questionnaire) ? (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {questionnaireDescription(questionnaire)}
                                </p>
                              ) : null}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}
            </section>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout showContextToolPanel={false}>
      <div className="mx-auto w-full max-w-6xl space-y-5">
        <Breadcrumbs items={[{ label: t.nav.surveys }]} />
        <div className="pb-3 border-b border-border/50">
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
            {t.nav.surveys}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {t.questionnaires_manage.subtitle}
          </p>
          <Link
            to={localePath('/library')}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary hover:text-foreground transition-colors"
          >
            <FBookOpen className="h-3.5 w-3.5" />
            {t.nav.library}
            <FArrowRight className="h-3 w-3" />
          </Link>
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
