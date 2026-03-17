import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { format, parseISO } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { FBookOpen, FEye, FClipboardCheck, FChevronDown, FChevronUp } from '@/components/icons/FreudIcons';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface FeedItem {
  id: string;
  type: 'journal' | 'observation' | 'questionnaire';
  title: string;
  date: string;
  detail?: string;
  meta?: Record<string, string>;
}

const UnifiedFeed = ({ refreshKey, onItemsLoaded, onEntryClick, highlightDate }: { refreshKey?: number; onItemsLoaded?: (items: FeedItem[]) => void; onEntryClick?: (type: FeedItem['type'], dbId: string) => void; highlightDate?: string | null }) => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const didScroll = useRef(false);

  useEffect(() => {
    if (!user) return;
    const fetchAll = async () => {
      const [jRes, oRes, qRes] = await Promise.all([
        supabase.from('journal_entries').select('id, title, entry_date, impact_level, emotional_state, event_description').eq('user_id', user.id).order('entry_date', { ascending: false }).limit(30),
        supabase.from('observation_logs').select('id, intensity, frequency, logged_at, concept_id, user_narrative').eq('user_id', user.id).order('logged_at', { ascending: false }).limit(30),
        supabase.from('questionnaire_responses').select('id, completed_at, questionnaires(title)').eq('user_id', user.id).order('completed_at', { ascending: false }).limit(30),
      ]);

      const journalItems: FeedItem[] = (jRes.data ?? []).map(j => ({
        id: `j-${j.id}`, type: 'journal', title: j.title, date: j.entry_date,
        detail: j.event_description || undefined,
        meta: {
          ...(j.impact_level ? { [t.journal.cardImpact]: `${j.impact_level}/5` } : {}),
          ...(j.emotional_state ? { [t.journal.cardFeeling]: j.emotional_state } : {}),
        },
      }));

      // Resolve observation concept names
      const obsData = oRes.data ?? [];
      let obsItems: FeedItem[] = [];
      if (obsData.length > 0) {
        const conceptIds = [...new Set(obsData.map(o => o.concept_id))];
        const { data: concepts } = await supabase.from('observation_concepts').select('id, name_hu, name_en').in('id', conceptIds);
        const conMap = Object.fromEntries((concepts ?? []).map(c => [c.id, c]));
        obsItems = obsData.map(o => {
          const concept = conMap[o.concept_id];
          const name = concept ? (lang === 'en' ? concept.name_en : concept.name_hu) : t.observations.tabObservations;
          return {
            id: `o-${o.id}`, type: 'observation' as const, title: name, date: o.logged_at,
            detail: o.user_narrative || undefined,
            meta: { [t.observations.intensity]: `${o.intensity}/5`, ...(o.frequency ? { [t.observations.frequency]: o.frequency } : {}) },
          };
        });
      }

      const qItems: FeedItem[] = (qRes.data ?? []).map((r: any) => ({
        id: `q-${r.id}`, type: 'questionnaire', title: r.questionnaires?.title ?? t.nav.selfChecks, date: r.completed_at.split('T')[0],
      }));

      const allItems = [...journalItems, ...obsItems, ...qItems].sort((a, b) => b.date.localeCompare(a.date));
      setItems(allItems);
      onItemsLoaded?.(allItems);
    };
    fetchAll();
  }, [user, refreshKey, lang]);

  const iconFor = (type: FeedItem['type']) => {
    switch (type) {
      case 'journal': return <FBookOpen className="h-3.5 w-3.5 text-primary shrink-0" />;
      case 'observation': return <FEye className="h-3.5 w-3.5 text-accent-foreground/60 shrink-0" />;
      case 'questionnaire': return <FClipboardCheck className="h-3.5 w-3.5 text-muted-foreground shrink-0" />;
    }
  };

  // Scroll to first highlighted item after items load
  useEffect(() => {
    if (highlightDate && items.length > 0 && !didScroll.current) {
      didScroll.current = true;
      setTimeout(() => {
        highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [items, highlightDate]);

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">{t.checkIn.noStory}</p>;
  }

  let firstHighlightAssigned = false;

  return (
    <div className="space-y-2">
      {items.map(item => {
        const isExpanded = expandedId === item.id;
        const hasMeta = item.meta && Object.keys(item.meta).length > 0;
        const isHighlighted = highlightDate ? item.date.slice(0, 10) === highlightDate : false;
        const isFirstHighlight = isHighlighted && !firstHighlightAssigned;
        if (isFirstHighlight) firstHighlightAssigned = true;

        return (
          <Collapsible key={item.id} open={isExpanded} onOpenChange={() => setExpandedId(isExpanded ? null : item.id)}>
            <div ref={isFirstHighlight ? highlightRef : undefined}>
              <CollapsibleTrigger
                className={`w-full flex items-center gap-3 py-2.5 px-3 rounded-2xl text-left transition-colors
                  ${isHighlighted ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-accent/50'}`}
                onClick={(e) => {
                  if (item.type === 'journal' && onEntryClick) {
                    e.preventDefault();
                    onEntryClick(item.type, item.id.slice(2));
                  }
                }}
              >
                {iconFor(item.type)}
                <span className="text-sm flex-1 truncate">{item.title}</span>
                <span className="text-xs text-muted-foreground shrink-0">{format(parseISO(item.date), 'MMM d', { locale: getDateLocale(lang) })}</span>
                {(hasMeta || item.detail) && (
                  isExpanded ? <FChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <FChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </CollapsibleTrigger>
            </div>
            {(hasMeta || item.detail) && (
              <CollapsibleContent className="px-9 pb-2 space-y-1">
                {item.detail && <p className="text-xs text-foreground/80 leading-relaxed">{item.detail}</p>}
                {hasMeta && Object.entries(item.meta!).map(([k, v]) => (
                  <p key={k} className="text-xs text-muted-foreground"><span className="font-medium">{k}:</span> {v}</p>
                ))}
              </CollapsibleContent>
            )}
          </Collapsible>
        );
      })}
    </div>
  );
};

export default UnifiedFeed;
