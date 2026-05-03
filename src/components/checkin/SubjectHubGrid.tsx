import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { FUser, FUsers, FScales } from '@/components/icons/FreudIcons';
import { useLanguage } from '@/hooks/useLanguage';
import { useStance } from '@/hooks/useStance';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import SubjectTrendBadge from './SubjectTrendBadge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface SubjectHubGridProps {
  onSelect: (key: string) => void;
  onToggleCompare: (key: string) => void;
  onStartParallel: () => void;
  selectedKeys: string[];
}

const SubjectHubGrid = ({ onSelect, onToggleCompare, onStartParallel, selectedKeys }: SubjectHubGridProps) => {
  const { t } = useLanguage();
  const { displayName } = useAuth();
  const { subjects } = useStance();
  const [openPopoverKey, setOpenPopoverKey] = useState<string | null>(null);

  const userName = displayName || t.subjects.selfCardTitle;

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

  const handleToggle = (key: string) => {
    const isAlreadySelected = selectedKeys.includes(key);
    onToggleCompare(key);
    
    if (!isAlreadySelected) {
      setOpenPopoverKey(key);
    } else {
      setOpenPopoverKey(null);
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in pb-12">
      {cards.map((card) => {
        const isSelected = selectedKeys.includes(card.key);
        const isRelative = card.type === 'relative';

        return (
          <div
            key={card.key}
            className={cn(
              'relative group flex flex-col p-5 sm:p-6 text-center transition-all duration-300 rounded-[2rem] sm:rounded-[2.5rem] border-2 h-full bg-card',
              isSelected 
                ? 'border-primary shadow-md ring-1 ring-primary/20 bg-primary/5' 
                : 'border-border/40 hover:border-primary/20 shadow-sm hover:shadow-md hover:-translate-y-1'
            )}
          >
            {/* Contextual Comparison Toggle (Corner Icon) */}
            <div className="absolute top-5 right-5 z-20">
              <Popover 
                open={openPopoverKey === card.key} 
                onOpenChange={(open) => {
                  if (!open) setOpenPopoverKey(null);
                }}
              >
                <PopoverTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(card.key);
                    }}
                    className={cn(
                      "h-10 w-10 rounded-2xl border-2 flex items-center justify-center transition-all duration-300 active:scale-90",
                      isSelected 
                        ? "bg-primary border-primary text-primary-foreground shadow-lg scale-110" 
                        : "border-border/40 bg-background/50 text-muted-foreground hover:border-primary/30 hover:text-primary"
                    )}
                    title={t.subjects.select}
                  >
                    <FScales className={cn("h-5 w-5", isSelected && "animate-pulse")} />
                  </button>
                </PopoverTrigger>
                <PopoverContent 
                  className="w-72 p-6 rounded-[2rem] shadow-xl border-primary/20 animate-in fade-in zoom-in duration-200" 
                  side="bottom"
                  align="end"
                  sideOffset={12}
                >
                  <div className="space-y-5 text-center">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                        {t.subjects.addedToCompare}
                      </p>
                      <p className="text-xs text-muted-foreground/80">
                        {selectedKeys.length >= 2 
                          ? `${selectedKeys.length} ${t.analystExport?.title || "profil"}`
                          : t.subjects.registryHint
                        }
                      </p>
                    </div>
                    
                    <div className="flex flex-col gap-3">
                       <Button 
                         size="default" 
                         className="w-full rounded-full font-bold h-11"
                         disabled={selectedKeys.length < 2}
                         onClick={(e) => {
                           e.stopPropagation();
                           onStartParallel();
                         }}
                       >
                         {t.subjects.showCompare}
                       </Button>
                       <button 
                         className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70 hover:text-destructive transition-colors py-1"
                         onClick={(e) => {
                           e.stopPropagation();
                           handleToggle(card.key);
                         }}
                       >
                         {t.subjects.removeFromCompare}
                       </button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center justify-center gap-3 w-full">
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-primary/10 text-primary group-hover:scale-110 transition-transform duration-300">
                {isRelative ? <FUsers className="h-7 w-7" /> : <FUser className="h-7 w-7" />}
              </div>
            </div>

            <div className="mt-5 space-y-2 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/80">
                {card.type === 'self' ? t.subjects.selfWorkspaceLabel : t.subjects.supportedWorkspaceLabel}
              </p>
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-foreground leading-tight px-1">
                  {card.name}
                </h2>
                <SubjectTrendBadge subjectType={card.type} subjectId={card.id} />
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground/90 line-clamp-2 px-2">
                {card.subtitle}
              </p>
            </div>

            <div className="mt-6 flex justify-center">
              <Button
                variant={isSelected ? 'outline' : 'default'}
                size="sm"
                onClick={() => onSelect(card.key)}
                className="rounded-full px-8 font-bold transition-all h-9"
              >
                {t.subjects.open}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SubjectHubGrid;
