import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { useStance } from '@/hooks/useStance';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import PremiumModal from '@/components/premium/PremiumModal';
import SubjectWorkspaceSection from '@/components/checkin/SubjectWorkspaceSection';

const CheckIn = () => {
  const { t } = useLanguage();
  const { subjects } = useStance();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightDate, setHighlightDate] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);

  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (!dateParam) return;

    setHighlightDate(dateParam);
    searchParams.delete('date');
    setSearchParams(searchParams, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('profiles')
      .select('premium')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setIsPremium(data.premium);
      });
  }, [user]);

  const workspaceCards = useMemo(() => [
    {
      key: 'self',
      type: 'self' as const,
      id: null,
      name: t.subjects.selfCardTitle,
      subtitle: t.subjects.selfCardSubtitle,
    },
    ...subjects.map((subject) => ({
      key: `relative:${subject.id}`,
      type: 'relative' as const,
      id: subject.id,
      name: subject.name?.trim() || t.subjects.otherLabel,
      subtitle:
        t.subjects.relationshipTypes[
          subject.relationshipType as keyof typeof t.subjects.relationshipTypes
        ] ?? subject.relationshipType,
      relationshipType: subject.relationshipType,
    })),
  ], [subjects, t.subjects.otherLabel, t.subjects.relationshipTypes, t.subjects.selfCardSubtitle, t.subjects.selfCardTitle]);

  return (
    <DashboardLayout showSubjectRegistry={false} showContextToolPanel={false}>
      <div className="max-w-4xl mx-auto w-full space-y-8">
        <div>
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{t.checkIn.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.checkIn.subtitle}</p>
        </div>

        <div className="space-y-6">
          {workspaceCards.map((subject) => (
            <SubjectWorkspaceSection
              key={subject.key}
              subject={subject}
              isPremium={isPremium}
              onPremiumClick={() => setPremiumOpen(true)}
              highlightedDate={subject.type === 'self' ? highlightDate : null}
            />
          ))}
        </div>
      </div>

      <PremiumModal open={premiumOpen} onOpenChange={setPremiumOpen} />
    </DashboardLayout>
  );
};

export default CheckIn;
