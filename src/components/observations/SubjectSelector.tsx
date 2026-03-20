import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FPlus, FUser, FUsers } from '@/components/icons/FreudIcons';
import { toast } from 'sonner';

export interface Subject {
  id: string;
  name: string;
  relationship_type: string;
}

interface SubjectSelectorProps {
  subjectType: 'self' | 'relative';
  onSubjectTypeChange: (type: 'self' | 'relative') => void;
  selectedSubjectId: string | null;
  onSubjectIdChange: (id: string | null) => void;
}

const RELATIONSHIP_TYPES = ['child', 'spouse', 'parent', 'sibling', 'other'] as const;

const SubjectSelector = ({
  subjectType,
  onSubjectTypeChange,
  selectedSubjectId,
  onSubjectIdChange,
}: SubjectSelectorProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelType, setNewRelType] = useState<string>('other');
  const [adding, setAdding] = useState(false);

  const fetchSubjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('subjects')
      .select('id, name, relationship_type')
      .eq('user_id', user.id)
      .order('created_at');
    setSubjects((data as Subject[]) ?? []);
  };

  useEffect(() => {
    fetchSubjects();
  }, [user]);

  const handleAdd = async () => {
    if (!user || !newName.trim()) return;
    setAdding(true);
    const { data, error } = await (supabase.from('subjects') as any)
      .insert([{ user_id: user.id, name: newName.trim(), relationship_type: newRelType }])
      .select('id, name, relationship_type')
      .single();
    if (error) {
      toast.error(error.message);
    } else if (data) {
      setSubjects((prev) => [...prev, data as Subject]);
      onSubjectIdChange(data.id);
      setNewName('');
      setShowAdd(false);
    }
    setAdding(false);
  };

  const relLabels = t.subjects.relationshipTypes;

  return (
    <div className="space-y-4">
      {/* Self / Other toggle */}
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {t.subjects.perspectiveLabel}
        </Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              onSubjectTypeChange('self');
              onSubjectIdChange(null);
            }}
            className={`flex items-center gap-2.5 border rounded-2xl p-3.5 text-left transition-colors ${
              subjectType === 'self'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30'
            }`}
          >
            <FUser className="h-4 w-4 text-primary shrink-0" />
            <div>
              <span className="text-sm font-semibold block">{t.subjects.selfLabel}</span>
              <span className="text-[10px] text-muted-foreground">{t.subjects.selfDesc}</span>
            </div>
          </button>
          <button
            type="button"
            onClick={() => onSubjectTypeChange('relative')}
            className={`flex items-center gap-2.5 border rounded-2xl p-3.5 text-left transition-colors ${
              subjectType === 'relative'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30'
            }`}
          >
            <FUsers className="h-4 w-4 text-primary shrink-0" />
            <div>
              <span className="text-sm font-semibold block">{t.subjects.otherLabel}</span>
              <span className="text-[10px] text-muted-foreground">{t.subjects.otherDesc}</span>
            </div>
          </button>
        </div>
      </div>

      {/* Subject picker (only when relative) */}
      {subjectType === 'relative' && (
        <div className="space-y-3 animate-fade-in">
          <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t.subjects.selectSubject}
          </Label>

          {subjects.length > 0 && (
            <div className="grid gap-2">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSubjectIdChange(s.id)}
                  className={`flex items-center gap-3 border rounded-2xl p-3 text-left transition-colors ${
                    selectedSubjectId === s.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className="h-7 w-7 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-semibold block">{s.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {relLabels[s.relationship_type as keyof typeof relLabels] ?? s.relationship_type}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {showAdd ? (
            <div className="border border-border rounded-2xl p-4 space-y-3 bg-card/40">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={t.subjects.namePlaceholder}
                className="rounded-2xl"
              />
              <Select value={newRelType} onValueChange={setNewRelType}>
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIP_TYPES.map((rt) => (
                    <SelectItem key={rt} value={rt}>
                      {relLabels[rt] ?? rt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="rounded-2xl"
                  onClick={handleAdd}
                  disabled={adding || !newName.trim()}
                >
                  {t.subjects.addSubject}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-2xl"
                  onClick={() => setShowAdd(false)}
                >
                  {t.cancel}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-2xl gap-1.5"
              onClick={() => setShowAdd(true)}
            >
              <FPlus className="h-3.5 w-3.5" />
              {t.subjects.addNew}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default SubjectSelector;
