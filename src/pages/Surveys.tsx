import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { ScopedStanceProvider, useStance } from '@/hooks/useStance';
import ConsentGate from '@/components/consent/ConsentGate';
import QuestionnaireFiller from '@/components/checkin/QuestionnaireFiller';
import { FClipboardCheck, FUsers } from '@/components/icons/FreudIcons';

const Surveys = () => {
  const { t } = useLanguage();
  const { activeSubject } = useStance();
  const supportedSubject =
    activeSubject.type === 'relative'
      ? {
          id: activeSubject.id!,
          name: activeSubject.name,
          relationshipType: activeSubject.relationshipType,
        }
      : null;

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
