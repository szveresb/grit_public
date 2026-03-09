import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import QuestionnaireFiller from '@/components/checkin/QuestionnaireFiller';

const Surveys = () => {
  const { t } = useLanguage();

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">
            {t.nav.surveys}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            {t.selfChecks.subtitle}
          </p>
        </div>

        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
          <QuestionnaireFiller />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Surveys;
