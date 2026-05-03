import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuestionnaireTrends } from '@/hooks/useQuestionnaireTrends';
import { FTrendingUp } from '@/components/icons/FreudIcons';
import { cn } from '@/lib/utils';

interface SubjectTrendBadgeProps {
  subjectType: 'self' | 'relative';
  subjectId: string | null;
}

/**
 * SubjectTrendBadge
 * Renders a small badge showing the most significant recent score trend 
 * for a specific subject (self or relative).
 */
const SubjectTrendBadge: React.FC<SubjectTrendBadgeProps> = ({ subjectType, subjectId }) => {
  const { user } = useAuth();
  const { trends, loading } = useQuestionnaireTrends({
    userId: user?.id,
    subjectType,
    subjectId,
  });

  if (loading || trends.length === 0) return null;

  // Identify the most significant trend (largest absolute delta)
  const topTrend = [...trends].sort((a, b) => Math.abs(b.trend_delta) - Math.abs(a.trend_delta))[0];

  if (!topTrend || topTrend.trend_delta === 0) return null;

  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest animate-in fade-in zoom-in duration-700 shadow-sm border border-current/10",
      topTrend.trend_delta > 0 
        ? "bg-primary/5 text-primary border-primary/20" 
        : "bg-destructive/5 text-destructive border-destructive/20"
    )}>
      <FTrendingUp className={cn("h-2.5 w-2.5", topTrend.trend_delta < 0 && "rotate-180")} />
      <span>{topTrend.trend_delta > 0 ? '+' : ''}{topTrend.trend_delta}</span>
    </div>
  );
};

export default SubjectTrendBadge;
