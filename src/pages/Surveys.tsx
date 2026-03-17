import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QuestionnaireFiller from '@/components/checkin/QuestionnaireFiller';
import ScoreHistory from '@/components/checkin/ScoreHistory';

const Surveys = () => {
  const { t } = useLanguage();
  const [refreshKey, setRefreshKey] = useState(0);

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

        <Tabs defaultValue="fill" className="w-full">
          <TabsList className="rounded-2xl bg-card/60 backdrop-blur border border-border w-full">
            <TabsTrigger value="fill" className="rounded-xl flex-1 text-xs">
              {t.nav.surveys}
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-xl flex-1 text-xs">
              {t.selfChecks.scoreHistory}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fill" className="mt-4">
            <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
              <QuestionnaireFiller onCompleted={() => setRefreshKey(k => k + 1)} />
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">
                {t.selfChecks.scoreHistory}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {t.selfChecks.scoreHistorySubtitle}
              </p>
              <ScoreHistory key={refreshKey} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Surveys;
