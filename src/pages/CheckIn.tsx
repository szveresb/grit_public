import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { useStance } from '@/hooks/useStance';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import PremiumModal from '@/components/premium/PremiumModal';
import SubjectWorkspaceSection from '@/components/checkin/SubjectWorkspaceSection';
import SubjectHubGrid from '@/components/checkin/SubjectHubGrid';
import { Button } from '@/components/ui/button';
import { FClose } from '@/components/icons/FreudIcons';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'focus' | 'parallel';

const CheckIn = () => {
  const { t } = useLanguage();
  const { subjects, setActiveSubjectContext } = useStance();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [highlightDate, setHighlightDate] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  
  // Layout Management State
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

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

  const userName = user?.user_metadata?.display_name || t.subjects.selfCardTitle;

  const allWorkspaces = useMemo(() => [
    {
      key: 'self',
      type: 'self' as const,
      id: null,
      name: userName,
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
  ], [subjects, t.subjects.otherLabel, t.subjects.relationshipTypes, t.subjects.selfCardSubtitle, userName]);

  const handleOpenFocus = (key: string) => {
    const target = allWorkspaces.find(w => w.key === key);
    if (!target) return;
    
    // Sync stance for consistency
    if (target.type === 'self') {
      setActiveSubjectContext({ type: 'self' });
    } else {
      setActiveSubjectContext({ type: 'relative', id: target.id!, name: target.name });
    }
    
    setSelectedKeys([key]);
    setViewMode('focus');
  };

  const handleToggleCompare = (key: string) => {
    setSelectedKeys(prev => {
      // If we are already in grid mode, we just toggle the key
      if (prev.includes(key)) return prev.filter(k => k !== key);
      return [...prev, key];
    });
  };

  const startParallelView = () => {
    if (selectedKeys.length < 2) return;
    setViewMode('parallel');
  };

  const closeWorkspace = () => {
    setViewMode('grid');
    setSelectedKeys([]);
  };

  const visibleWorkspaces = allWorkspaces.filter(w => selectedKeys.includes(w.key));

  return (
    <DashboardLayout showSubjectRegistry={false} showContextToolPanel={false}>
        <div className={cn(
          "mx-auto w-full space-y-8 animate-fade-in transition-all duration-500",
          viewMode !== 'grid' && 'max-w-7xl'
        )}>
        
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-1 animation-slide-down">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-foreground transition-all">
              {viewMode === 'grid' ? t.checkIn.title : t.nav.checkIn}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-lg">
              {viewMode === 'grid' ? t.checkIn.subtitle : t.subjects.registryHint}
            </p>
          </div>

          {viewMode !== 'grid' && (
            <Button 
              variant="outline" 
              size="sm" 
              className="rounded-full px-5 gap-2 group hover:bg-destructive/5 hover:text-destructive hover:border-destructive/30 transition-all animate-scale-in" 
              onClick={closeWorkspace}
            >
              <FClose className="h-4 w-4 transition-transform group-hover:rotate-90" />
              <span className="text-xs font-bold uppercase tracking-widest">{t.cancel}</span>
            </Button>
          )}
        </div>

        {/* Dynamic Content */}
        {viewMode === 'grid' ? (
          <SubjectHubGrid 
            onSelect={handleOpenFocus}
            onToggleCompare={handleToggleCompare}
            onStartParallel={startParallelView}
            selectedKeys={selectedKeys}
          />
        ) : (
          <div className={cn(
            "grid gap-8 transition-all duration-500 ease-in-out",
            viewMode === 'parallel' ? "grid-cols-1 xl:grid-cols-2" : "grid-cols-1 w-full"
          )}>
            {visibleWorkspaces.map((subject) => (
              <SubjectWorkspaceSection
                key={subject.key}
                subject={subject}
                isPremium={isPremium}
                onPremiumClick={() => setPremiumOpen(true)}
                highlightedDate={subject.type === 'self' ? highlightDate : null}
                mode={viewMode === 'parallel' ? 'parallel' : 'standalone'}
              />
            ))}
          </div>
        )}
      </div>

      <PremiumModal open={premiumOpen} onOpenChange={setPremiumOpen} />
    </DashboardLayout>
  );
};

export default CheckIn;
