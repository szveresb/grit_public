import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Pencil, Trash2, Sparkles, Loader2, Save } from 'lucide-react';
import { format } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { JournalEntry } from '@/types/journal';

interface JournalEntryCardProps {
  entry: JournalEntry;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  // Reflection props
  streamedReflection?: string;
  isReflecting: boolean;
  reflectDisabled: boolean;
  onReflect: () => void;
  onSaveReflection: () => void;
  onDismissReflection: () => void;
  onClearSavedReflection: () => void;
}

const JournalEntryCard = ({
  entry,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  streamedReflection,
  isReflecting,
  reflectDisabled,
  onReflect,
  onSaveReflection,
  onDismissReflection,
  onClearSavedReflection,
}: JournalEntryCardProps) => {
  return (
    <div className="bg-card/60 backdrop-blur border border-border rounded-3xl overflow-hidden">
      <div className="flex items-center">
        <button
          onClick={onToggleExpand}
          className="flex-1 flex items-center justify-between p-4 text-left hover:bg-accent/30 transition-colors"
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{entry.title}</span>
            <span className="text-xs text-muted-foreground">{format(new Date(entry.entry_date), 'MMM d, yyyy')}</span>
            {entry.impact_level && (
              <span className={`text-xs px-2 py-0.5 rounded-full border ${entry.impact_level >= 4 ? 'border-destructive/40 text-destructive bg-destructive/10' : 'border-border text-muted-foreground'}`}>
                Impact: {entry.impact_level}/5
              </span>
            )}
          </div>
          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
        <div className="flex gap-1 pr-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete entry?</AlertDialogTitle>
                <AlertDialogDescription>This will permanently delete "{entry.title}". This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-border/60 pt-3">
          {entry.event_description && <div><span className="text-xs font-semibold uppercase text-muted-foreground">What happened:</span><p className="text-sm mt-1 leading-relaxed">{entry.event_description}</p></div>}
          {entry.emotional_state && <div><span className="text-xs font-semibold uppercase text-muted-foreground">Feeling:</span><p className="text-sm mt-1">{entry.emotional_state}</p></div>}
          {entry.self_anchor && <div><span className="text-xs font-semibold uppercase text-muted-foreground">Self-Anchor:</span><p className="text-sm mt-1 italic leading-relaxed">{entry.self_anchor}</p></div>}
          {entry.free_text && <div><span className="text-xs font-semibold uppercase text-muted-foreground">Notes:</span><p className="text-sm mt-1 whitespace-pre-wrap leading-relaxed">{entry.free_text}</p></div>}

          {/* AI Reflection */}
          <div className="pt-2 border-t border-border/40">
            {/* Saved reflection */}
            {entry.reflection && !streamedReflection && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">Saved Reflection</span>
                </div>
                <div className="prose prose-sm max-w-none text-sm text-foreground/90 leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0">
                  <ReactMarkdown>{entry.reflection}</ReactMarkdown>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" className="rounded-2xl text-xs gap-1.5" onClick={onReflect} disabled={reflectDisabled}>
                    <Sparkles className="h-3.5 w-3.5" /> New Reflection
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2">Remove</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remove saved reflection?</AlertDialogTitle>
                        <AlertDialogDescription>This will delete the saved reflection for this entry.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onClearSavedReflection} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            )}

            {/* Streaming/new reflection */}
            {streamedReflection ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-primary">Reflection</span>
                  {isReflecting && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>
                <div className="prose prose-sm max-w-none text-sm text-foreground/90 leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0">
                  <ReactMarkdown>{streamedReflection}</ReactMarkdown>
                </div>
                {!isReflecting && (
                  <div className="flex gap-2">
                    <Button variant="default" size="sm" className="rounded-2xl text-xs gap-1.5" onClick={onSaveReflection}>
                      <Save className="h-3.5 w-3.5" /> Save Reflection
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7 px-2" onClick={onDismissReflection}>
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>
            ) : !entry.reflection && (
              <Button variant="ghost" size="sm" className="rounded-2xl text-xs gap-1.5" onClick={onReflect} disabled={reflectDisabled}>
                <Sparkles className="h-3.5 w-3.5" />
                Reflect on this entry
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JournalEntryCard;
