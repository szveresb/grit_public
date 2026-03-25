import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
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
    <section className="mb-6 md:mb-8">
      <div className="mb-3 flex items-center justify-between gap-3">
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

      <div className="space-y-3">
        {cards.map((card) => {
          const isActive = card.key === activeSubject.key;
          const isRelative = card.type === 'relative';

          return (
            <button
              key={card.key}
              type="button"
              onClick={() => {
                if (card.type === 'self') {
                  setActiveSubjectContext({ type: 'self' });
                  return;
                }

                setActiveSubjectContext({ type: 'relative', id: card.id!, name: card.name });
              }}
              className={cn(
                'flex min-h-[204px] w-full flex-col p-5 text-left transition-colors sm:min-h-[220px] sm:p-6 surface-card',
                isActive && 'ring-2 ring-primary/30'
              )}
              aria-pressed={isActive}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  {isRelative ? <FUsers className="h-5 w-5" /> : <FUser className="h-5 w-5" />}
                </div>
                <Badge variant={isActive ? 'default' : 'outline'} className="shrink-0 rounded-full text-[10px] uppercase tracking-wider">
                  {isActive ? t.subjects.activeBadge : t.subjects.inactiveBadge}
                </Badge>
              </div>

              <div className="mt-5 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {card.type === 'self' ? t.subjects.selfWorkspaceLabel : t.subjects.supportedWorkspaceLabel}
                </p>
                <h2 className="text-lg font-bold tracking-tight text-balance text-foreground sm:text-xl">
                  {card.name}
                </h2>
                <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
                  {card.subtitle}
                </p>
              </div>

              <p className="mt-auto pt-5 text-xs leading-relaxed text-muted-foreground">
                {subjectsLoading ? t.loading : t.subjects.registryCardHint}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
};

export default SubjectCardRegistry;
