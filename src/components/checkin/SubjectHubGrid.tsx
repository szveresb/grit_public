import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FUser, FUsers, FCheck } from '@/components/icons/FreudIcons';
import { useLanguage } from '@/hooks/useLanguage';
import { useStance } from '@/hooks/useStance';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface SubjectHubGridProps {
  onSelect: (key: string) => void;
  onToggleCompare: (key: string) => void;
  selectedKeys: string[];
  isCompareMode: boolean;
}

const SubjectHubGrid = ({ onSelect, onToggleCompare, selectedKeys, isCompareMode }: SubjectHubGridProps) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { subjects, subjectsLoading } = useStance();

  const userName = user?.user_metadata?.display_name || t.subjects.selfCardTitle;

  const cards = useMemo(() => [
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
    })),
  ], [subjects, t.subjects.otherLabel, t.subjects.relationshipTypes, t.subjects.selfCardSubtitle, userName]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
      {cards.map((card) => {
        const isSelected = selectedKeys.includes(card.key);
        const isRelative = card.type === 'relative';

        return (
          <div
            key={card.key}
            onClick={() => isCompareMode ? onToggleCompare(card.key) : onSelect(card.key)}
            className={cn(
              'relative cursor-pointer group flex flex-col p-6 text-center transition-all duration-300 rounded-[2.5rem] border-2 h-full',
              isSelected 
                ? 'bg-primary/5 border-primary shadow-md scale-[1.02]' 
                : 'bg-card border-border/40 hover:border-primary/20 shadow-sm hover:shadow-md hover:-translate-y-1'
            )}
          >
            {isCompareMode && (
              <div className={cn(
                "absolute top-4 right-4 h-6 w-6 rounded-full border-2 flex items-center justify-center transition-colors",
                isSelected ? "bg-primary border-primary text-primary-foreground" : "border-border/50 bg-background/50"
              )}>
                {isSelected && <FCheck className="h-3 w-3" />}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 w-full">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                {isRelative ? <FUsers className="h-7 w-7" /> : <FUser className="h-7 w-7" />}
              </div>
            </div>

            <div className="mt-5 space-y-2 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                {card.type === 'self' ? t.subjects.selfWorkspaceLabel : t.subjects.supportedWorkspaceLabel}
              </p>
              <h2 className="text-lg font-bold tracking-tight text-foreground leading-tight">
                {card.name}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground/90 line-clamp-2">
                {card.subtitle}
              </p>
            </div>

            <div className="mt-6">
              <Button
                variant={isSelected ? 'default' : 'ghost'}
                size="sm"
                className="rounded-full px-6 transition-all"
              >
                {isCompareMode ? (isSelected ? t.nav.account : t.subjects.select) : t.subjects.goToJournal}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SubjectHubGrid;
