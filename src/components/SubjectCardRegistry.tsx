import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselApi, CarouselContent, CarouselItem } from '@/components/ui/carousel';
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
  const [api, setApi] = useState<CarouselApi>();

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
        name: subject.name,
        subtitle: t.subjects.relationshipTypes[subject.relationshipType as keyof typeof t.subjects.relationshipTypes] ?? subject.relationshipType,
      })),
  ], [subjects, t.subjects.relationshipTypes, t.subjects.selfCardSubtitle, t.subjects.selfCardTitle]);

  useEffect(() => {
    if (!api) return;

    const selectedIndex = cards.findIndex((card) => card.key === activeSubject.key);
    if (selectedIndex >= 0 && api.selectedScrollSnap() !== selectedIndex) {
      api.scrollTo(selectedIndex);
    }
  }, [activeSubject.key, api, cards]);

  // Sync carousel scroll position when the active subject changes
  // (e.g. from sidebar or other external control).
  // Stance is set exclusively via the card button onClick — NOT from
	// carousel scroll events — to avoid circular state updates.

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

      <Carousel setApi={setApi} opts={{ align: 'start', containScroll: 'trimSnaps' }} className="w-full">
        <CarouselContent className="-ml-3">
          {cards.map((card) => {
            const isActive = card.key === activeSubject.key;
            const isRelative = card.type === 'relative';

            return (
              <CarouselItem key={card.key} className="pl-3 basis-[88%] sm:basis-[65%] lg:basis-[42%]">
                <button
                  type="button"
                  onClick={() => {
                    if (card.type === 'self') {
                      setActiveSubjectContext({ type: 'self' });
                      return;
                    }

                    setActiveSubjectContext({ type: 'relative', id: card.id!, name: card.name });
                  }}
                  className={cn(
                    'w-full rounded-3xl p-5 text-left transition-all',
                    isRelative ? 'subject-card-observer hover:-translate-y-0.5 hover:shadow-lg' : 'subject-card-self hover:-translate-y-0.5 hover:shadow-lg',
                    isActive && 'subject-card-active'
                  )}
                  aria-pressed={isActive}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-2xl',
                      isRelative ? 'bg-observer/15 text-observer' : 'bg-primary/10 text-primary'
                    )}>
                      {isRelative ? <FUsers className="h-5 w-5" /> : <FUser className="h-5 w-5" />}
                    </div>
                    <Badge variant={isActive ? 'default' : 'outline'} className="rounded-full text-[10px] uppercase tracking-wider">
                      {isActive ? t.subjects.activeBadge : t.subjects.inactiveBadge}
                    </Badge>
                  </div>

                  <div className="mt-5 space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-widest opacity-75">
                      {card.type === 'self' ? t.subjects.selfWorkspaceLabel : t.subjects.supportedWorkspaceLabel}
                    </p>
                    <h2 className="text-lg font-bold tracking-tight">
                      {card.name}
                    </h2>
                    <p className="text-sm opacity-80">
                      {card.subtitle}
                    </p>
                  </div>

                  <p className="mt-5 text-xs opacity-70">
                    {subjectsLoading ? t.loading : t.subjects.registryCardHint}
                  </p>
                </button>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>
    </section>
  );
};

export default SubjectCardRegistry;
