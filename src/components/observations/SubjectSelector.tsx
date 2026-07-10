import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FPlus, FUser, FUsers, FSparkles, FCheck } from '@/components/icons/FreudIcons';
import { toast } from 'sonner';
import PremiumModal from '@/components/premium/PremiumModal';
import ObserverConsentCard from '@/components/premium/ObserverConsentCard';

export interface Subject {
  id: string;
  name: string;
  relationship_type: string;
  biological_sex?: string | null;
  birth_year?: number | null;
}

interface SubjectSelectorProps {
  subjectType: 'self' | 'relative';
  onSubjectTypeChange: (type: 'self' | 'relative') => void;
  selectedSubjectId: string | null;
  onSubjectIdChange: (id: string | null) => void;
  onSubjectNameChange?: (name: string | undefined) => void;
}

const RELATIONSHIP_TYPES = ['child', 'spouse', 'parent', 'sibling', 'other'] as const;
const OBS_CONSENT_KEY = 'grit_observer_consent_accepted';

const SubjectSelector = ({
  subjectType,
  onSubjectTypeChange,
  selectedSubjectId,
  onSubjectIdChange,
  onSubjectNameChange,
}: SubjectSelectorProps) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRelType, setNewRelType] = useState<string>('other');
  const [newBiologicalSex, setNewBiologicalSex] = useState<string | null>(null);
  const [newBirthYear, setNewBirthYear] = useState<string>('');
  const [adding, setAdding] = useState(false);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [isPremium, setIsPremium] = useState(true); // default true – everyone has access for now
  const [showObserverConsent, setShowObserverConsent] = useState(false);
  const [newObserverConsent, setNewObserverConsent] = useState(false);
  const [observerConsentGiven, setObserverConsentGiven] = useState(false);

  useEffect(() => {
    // Check if observer consent was previously given
    const stored = localStorage.getItem(OBS_CONSENT_KEY);
    if (stored === 'true') setObserverConsentGiven(true);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('premium').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (data) setIsPremium(data.premium); });
  }, [user]);

  const getDemographicsSummary = (s: Subject) => {
    const parts: string[] = [];
    if (s.biological_sex) {
      const key = `biologicalSex${s.biological_sex.charAt(0).toUpperCase() + s.biological_sex.slice(1)}` as keyof typeof t.profile;
      parts.push(t.profile[key] || s.biological_sex);
    }
    if (s.birth_year) {
      parts.push(String(s.birth_year));
      const currentYear = new Date().getFullYear();
      if (s.birth_year >= 1900 && s.birth_year <= currentYear) {
        const age = currentYear - s.birth_year;
        parts.push(t.profile.approximateAge.replace('{age}', String(age)));
      }
    }
    return parts.length > 0 ? ` • ${parts.join(' • ')}` : '';
  };

  const fetchSubjects = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('subjects')
      .select('id, name, relationship_type, biological_sex, birth_year')
      .eq('user_id', user.id)
      .order('created_at');
    setSubjects((data as Subject[]) ?? []);
  }, [user]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleObserverClick = () => {
    if (!isPremium) {
      setPremiumOpen(true);
      return;
    }
    if (!observerConsentGiven) {
      setShowObserverConsent(true);
      return;
    }
    onSubjectTypeChange('relative');
  };

  const handleConsentAccept = () => {
    localStorage.setItem(OBS_CONSENT_KEY, 'true');
    setObserverConsentGiven(true);
    setShowObserverConsent(false);
    onSubjectTypeChange('relative');
  };

  const handleAdd = async () => {
    if (!user || !newName.trim()) return;

    let parsedBirthYear: number | null = null;
    if (newBirthYear.trim() !== '') {
      const yearNum = parseInt(newBirthYear.trim(), 10);
      const currentYear = new Date().getFullYear();
      if (!/^\d{4}$/.test(newBirthYear.trim()) || isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear) {
        toast.error(t.profile.errorInvalidBirthYear);
        return;
      }
      parsedBirthYear = yearNum;
    }

    setAdding(true);
    const { data, error } = await (supabase.from('subjects') as any)
      .insert([{ 
        user_id: user.id, 
        name: newName.trim(), 
        relationship_type: newRelType,
        biological_sex: newBiologicalSex || null,
        birth_year: parsedBirthYear
      }])
      .select('id, name, relationship_type, biological_sex, birth_year')
      .single();
    if (error) {
      toast.error(error.message);
    } else if (data) {
      setSubjects((prev) => [...prev, data as Subject]);
      onSubjectIdChange(data.id);
      onSubjectNameChange?.(data.name);
      setNewName('');
      setNewRelType('other');
      setNewBiologicalSex(null);
      setNewBirthYear('');
      setNewObserverConsent(false);
      setShowAdd(false);
    }
    setAdding(false);
  };

  const relLabels = t.subjects.relationshipTypes;

  if (showObserverConsent) {
    return (
      <ObserverConsentCard
        onAccept={handleConsentAccept}
        onCancel={() => setShowObserverConsent(false)}
      />
    );
  }

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
            onClick={handleObserverClick}
            className={`flex items-center gap-2.5 border rounded-2xl p-3.5 text-left transition-colors relative ${
              subjectType === 'relative'
                ? 'border-amber-400 dark:border-amber-600 bg-amber-50/50 dark:bg-amber-950/20'
                : 'border-border hover:border-amber-300 dark:hover:border-amber-700'
            }`}
          >
            <FUsers className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold block">{t.subjects.otherLabel}</span>
              <span className="text-[10px] text-muted-foreground">{t.subjects.otherDesc}</span>
            </div>
            <Badge variant="outline" className="absolute top-2 right-2 rounded-full text-[8px] font-semibold gap-0.5 border-amber-300 text-amber-600 dark:border-amber-700 dark:text-amber-400 px-1.5 py-0">
              <FSparkles className="h-2 w-2" />
              Premium
            </Badge>
          </button>
        </div>
      </div>

      {/* Subject picker (only when relative) */}
      {subjectType === 'relative' && (
        <div className="space-y-3 animate-fade-in bg-amber-50/30 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-800/30 rounded-2xl p-4">
          <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t.subjects.selectSubject}
          </Label>

          {subjects.length > 0 && (
            <div className="grid gap-2">
              {subjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { onSubjectIdChange(s.id); onSubjectNameChange?.(s.name); }}
                  className={`flex items-center gap-3 border rounded-2xl p-3 text-left transition-colors ${
                    selectedSubjectId === s.id
                      ? 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-950/30'
                      : 'border-border hover:border-amber-300 dark:hover:border-amber-700'
                  }`}
                >
                  <div className="h-7 w-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-xs font-bold text-amber-800 dark:text-amber-200">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-sm font-semibold block">{s.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {relLabels[s.relationship_type as keyof typeof relLabels] ?? s.relationship_type}
                      {getDemographicsSummary(s)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {showAdd ? (
            <div className="border border-border rounded-2xl p-4 space-y-3 bg-card/40">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t.premium.relationshipLabel || t.subjects.perspectiveLabel}
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
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t.profile.biologicalSexLabel}
                </Label>
                <Select 
                  value={newBiologicalSex || "none"} 
                  onValueChange={(val) => setNewBiologicalSex(val === "none" ? null : val)}
                >
                  <SelectTrigger className="rounded-2xl bg-background border-input">
                    <SelectValue placeholder={t.profile.biologicalSexPlaceholder} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-border bg-popover text-popover-foreground shadow-md">
                    <SelectItem value="none" className="rounded-lg">{t.profile.biologicalSexNone}</SelectItem>
                    <SelectItem value="female" className="rounded-lg">{t.profile.biologicalSexFemale}</SelectItem>
                    <SelectItem value="male" className="rounded-lg">{t.profile.biologicalSexMale}</SelectItem>
                    <SelectItem value="intersex" className="rounded-lg">{t.profile.biologicalSexIntersex}</SelectItem>
                    <SelectItem value="unknown" className="rounded-lg">{t.profile.biologicalSexUnknown}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  {t.profile.birthYearLabel}
                </Label>
                <Input 
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={t.profile.birthYearPlaceholder}
                  value={newBirthYear} 
                  onChange={e => {
                    const val = e.target.value;
                    if (/^\d*$/.test(val) && val.length <= 4) {
                      setNewBirthYear(val);
                    }
                  }} 
                  className="rounded-2xl" 
                />
                {newBirthYear.trim() !== '' && (() => {
                  const y = parseInt(newBirthYear.trim(), 10);
                  const currentYear = new Date().getFullYear();
                  if (/^\d{4}$/.test(newBirthYear.trim()) && !isNaN(y) && y >= 1900 && y <= currentYear) {
                    return (
                      <p className="text-xs text-muted-foreground mt-1 animate-fade-in">
                        {t.profile.approximateAge.replace('{age}', String(currentYear - y))}
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>
              
              <label className="flex items-start gap-3 cursor-pointer group pt-2 pb-1">
                <button
                  type="button"
                  onClick={() => setNewObserverConsent(!newObserverConsent)}
                  className={`mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                    newObserverConsent
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-border group-hover:border-primary/50'
                  }`}
                >
                  {newObserverConsent && <FCheck className="h-3 w-3" />}
                </button>
                <span className="text-xs text-muted-foreground leading-relaxed">
                  {t.premium.observerConsentCheckbox}
                </span>
              </label>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="rounded-2xl"
                  onClick={handleAdd}
                  disabled={adding || !newName.trim() || !newObserverConsent}
                >
                  {t.subjects.addSubject}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-2xl"
                  onClick={() => {
                    setShowAdd(false);
                    setNewName('');
                    setNewRelType('other');
                    setNewBiologicalSex(null);
                    setNewBirthYear('');
                    setNewObserverConsent(false);
                  }}
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
              <FSparkles className="h-3 w-3 text-amber-500" />
              {t.subjects.addNew}
            </Button>
          )}
        </div>
      )}

      <PremiumModal open={premiumOpen} onOpenChange={setPremiumOpen} />
    </div>
  );
};

export default SubjectSelector;
