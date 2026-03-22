import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FUsers, FPlus, FTrash, FSparkles, FPencil } from '@/components/icons/FreudIcons';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

interface Subject {
  id: string;
  name: string;
  relationship_type: string;
}

const RELATIONSHIP_TYPES = ['child', 'spouse', 'parent', 'sibling', 'other'] as const;

const ManagedRelatives = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelType, setNewRelType] = useState<string>('other');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRelType, setEditRelType] = useState<string>('other');
  const [saving, setSaving] = useState(false);

  const fetchSubjects = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('subjects')
      .select('id, name, relationship_type')
      .eq('user_id', user.id)
      .order('created_at');
    setSubjects((data as Subject[]) ?? []);
  };

  useEffect(() => { fetchSubjects(); }, [user]);

  const handleAdd = async () => {
    if (!user || !newName.trim()) return;
    setAdding(true);
    const { error } = await (supabase.from('subjects') as any)
      .insert([{ user_id: user.id, name: newName.trim(), relationship_type: newRelType }]);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t.premium.subjectAdded);
      setNewName('');
      setNewRelType('other');
      setShowAdd(false);
      fetchSubjects();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    await supabase.from('subjects').delete().eq('id', id);
    toast.success(t.premium.subjectRemoved);
    setDeleting(null);
    fetchSubjects();
  };

  const startEdit = (s: Subject) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditRelType(s.relationship_type);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditRelType('other');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    setSaving(true);
    const { error } = await supabase
      .from('subjects')
      .update({ name: editName.trim(), relationship_type: editRelType as any })
      .eq('id', editingId);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(t.premium.subjectUpdated);
      cancelEdit();
      fetchSubjects();
    }
    setSaving(false);
  };

  const relLabels = t.subjects.relationshipTypes;

  return (
    <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FUsers className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t.premium.managedRelativesTitle}
          </h2>
        </div>
        <Badge variant="outline" className="rounded-full text-[10px] font-semibold gap-1 border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400">
          <FSparkles className="h-2.5 w-2.5" />
          Premium
        </Badge>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        {t.premium.managedRelativesDesc}
      </p>

      {subjects.length > 0 && (
        <div className="space-y-2">
          {subjects.map((s) =>
            editingId === s.id ? (
              <div key={s.id} className="border border-primary/30 rounded-2xl p-4 space-y-3 bg-card/40 animate-fade-in">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t.subjects.namePlaceholder}
                  </Label>
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder={t.subjects.namePlaceholder}
                    className="rounded-2xl"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t.premium.relationshipLabel}
                  </Label>
                  <Select value={editRelType} onValueChange={setEditRelType}>
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
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="rounded-2xl"
                    onClick={handleSaveEdit}
                    disabled={saving || !editName.trim()}
                  >
                    {saving ? t.saving : t.save}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-2xl"
                    onClick={cancelEdit}
                  >
                    {t.cancel}
                  </Button>
                </div>
              </div>
            ) : (
              <div
                key={s.id}
                className="flex items-center gap-3 border border-border rounded-2xl p-3 bg-card/40"
              >
                <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
                  {s.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold block truncate">{s.name}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {relLabels[s.relationship_type as keyof typeof relLabels] ?? s.relationship_type}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => startEdit(s)}
                >
                  <FEdit className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDelete(s.id)}
                  disabled={deleting === s.id}
                >
                  <FTrash className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          )}
        </div>
      )}

      {showAdd ? (
        <div className="border border-border rounded-2xl p-4 space-y-3 bg-card/40">
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t.subjects.namePlaceholder}
            </Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t.subjects.namePlaceholder}
              className="rounded-2xl"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t.premium.relationshipLabel}
            </Label>
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
          </div>
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
          variant="outline"
          size="sm"
          className="rounded-2xl gap-1.5"
          onClick={() => setShowAdd(true)}
        >
          <FPlus className="h-3.5 w-3.5" />
          <FSparkles className="h-3 w-3 text-amber-500" />
          {t.subjects.addNew}
        </Button>
      )}
    </div>
  );
};

export default ManagedRelatives;
