import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { useStance } from '@/hooks/useStance';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QuestionnaireFiller from '@/components/checkin/QuestionnaireFiller';
import ScoreHistory from '@/components/checkin/ScoreHistory';
import StanceBanner from '@/components/premium/StanceBanner';

const Surveys = () => {
  const { t } = useLanguage();
  const { activeSubject, subjectColor } = useStance();
  const [refreshKey, setRefreshKey] = useState(0);
  const isRelativeContext = activeSubject.type === 'relative';

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
            {t.nav.surveys}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {t.questionnaires_manage.subtitle}
          </p>
        </div>

        {isRelativeContext && (
          <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4">
            <StanceBanner subjectType="relative" subjectName={activeSubject.name} subjectColor={subjectColor} />
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t.questionnaires_manage.selfOnlyContext}
            </p>
          </div>
        )}

        {!isRelativeContext && (
        <Tabs defaultValue="fill" className="w-full">
          <TabsList className="rounded-2xl bg-card/60 backdrop-blur border border-border w-full">
            <TabsTrigger value="fill" className="rounded-xl flex-1 text-xs">
              {t.nav.surveys}
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl flex-1 text-xs">
              {t.questionnaires_manage.scoreHistory}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fill" className="mt-4">
            <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
              <QuestionnaireFiller key={`fill-${activeSubject.key}`} onCompleted={() => setRefreshKey(k => k + 1)} />
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                {t.questionnaires_manage.scoreHistory}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {t.questionnaires_manage.scoreHistorySubtitle}
              </p>
              <ScoreHistory key={`${activeSubject.key}-${refreshKey}`} />
            </div>
          </TabsContent>
        </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Surveys;
