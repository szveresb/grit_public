import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FUser, FUsers } from '@/components/icons/FreudIcons';
import { useLanguage } from '@/hooks/useLanguage';
import { useStance } from '@/hooks/useStance';
import { cn } from '@/lib/utils';

interface SubjectCardItem {
  key: string;
  type: 'self' | 'relative';
  id: string | null;
  name: string;
  subtitle: string;
}

const SubjectCardRegistry = () => {
  const { t } = useLanguage();
  const { activeSubject, subjects, subjectsLoading, setActiveSubjectContext } = useStance();

  const cards = useMemo<SubjectCardItem[]>(() => [
    {
      key: 'self',
      type: 'self',
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
    })),
  ], [subjects, t.subjects.otherLabel, t.subjects.relationshipTypes, t.subjects.selfCardSubtitle, t.subjects.selfCardTitle]);

  return (
    <section className="mb-8 md:mb-12">
      <div className="mb-6 flex items-center justify-between gap-3 max-w-md mx-auto lg:max-w-none">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t.subjects.registryLabel}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t.subjects.registryHint}
          </p>
        </div>
        <Badge variant="outline" className="rounded-full text-[10px] font-semibold uppercase tracking-wider">
          {cards.length}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-12">
        {cards.map((card) => {
          const isActive = card.key === activeSubject.key;
          const isRelative = card.type === 'relative';

          return (
            <div
              key={card.key}
              className={cn(
                'flex min-h-[220px] w-full max-w-md mx-auto flex-col p-6 sm:p-8 text-center transition-colors surface-card',
                isActive && 'ring-2 ring-primary/30'
              )}
            >
              <div className="flex items-center justify-center gap-3 w-full">
                <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                  {isRelative ? <FUsers className="h-6 w-6" /> : <FUser className="h-6 w-6" />}
                </div>
              </div>

              <div className="mt-6 space-y-2 flex-1">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {card.type === 'self' ? t.subjects.selfWorkspaceLabel : t.subjects.supportedWorkspaceLabel}
                </p>
                <h2 className="text-xl font-bold tracking-tight text-balance text-foreground">
                  {card.name}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground line-clamp-2">
                  {card.subtitle}
                </p>
              </div>

              <div className="mt-8 flex flex-col items-center gap-3 w-full">
                <Button
                  type="button"
                  onClick={() => {
                    if (card.type === 'self') {
                      setActiveSubjectContext({ type: 'self' });
                      return;
                    }
                    setActiveSubjectContext({ type: 'relative', id: card.id!, name: card.name });
                  }}
                  variant={isActive ? 'default' : 'outline'}
                  className="w-auto px-8 min-w-[160px] rounded-2xl"
                >
                  {isActive ? t.subjects.activeBadge : t.nav.explore || "Kiválasztás"}
                </Button>
                
                <p className="text-[10px] leading-relaxed text-muted-foreground/70 uppercase tracking-widest">
                  {subjectsLoading ? t.loading : isActive ? t.subjects.activeBadge : t.subjects.inactiveBadge}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default SubjectCardRegistry;
