import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FDownload } from '@/components/icons/FreudIcons';
import ConsentDashboard from '@/components/consent/ConsentDashboard';
import ManagedRelatives from '@/components/premium/ManagedRelatives';
import { buildUserDataExport } from '@/lib/user-data-export';

const Profile = () => {
  const { user, signOut, setDisplayName: setAuthDisplayName, refreshDisplayName } = useAuth();
  const { t } = useLanguage();
  const [displayName, setDisplayName] = useState('');
  const [biologicalSex, setBiologicalSex] = useState<string | null>(null);
  const [birthYear, setBirthYear] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('profiles').select('display_name, biological_sex, birth_year').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name ?? '');
        setBiologicalSex(data?.biological_sex ?? null);
        setBirthYear(data?.birth_year ? String(data.birth_year) : '');
      });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    let parsedBirthYear: number | null = null;
    if (birthYear.trim() !== '') {
      const yearNum = parseInt(birthYear.trim(), 10);
      const currentYear = new Date().getFullYear();
      if (!/^\d{4}$/.test(birthYear.trim()) || isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear) {
        toast.error(t.profile.errorInvalidBirthYear);
        return;
      }
      parsedBirthYear = yearNum;
    }

    setSaving(true);
    const trimmedDisplayName = displayName.trim();
    const nextDisplayName = trimmedDisplayName || null;

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: nextDisplayName,
        biological_sex: biologicalSex || null,
        birth_year: parsedBirthYear,
      })
      .eq('user_id', user.id);

    if (error) {
      toast.error(t.error.submit);
      setSaving(false);
      return;
    }

    const { error: authError } = await supabase.auth.updateUser({
      data: {
        display_name: nextDisplayName,
      },
    });

    if (authError) {
      toast.error(t.error.submit);
      setSaving(false);
      return;
    }

    setDisplayName(trimmedDisplayName);
    setAuthDisplayName(nextDisplayName || user.email || null);
    await refreshDisplayName();
    toast.success(t.profile.profileUpdated);
    setSaving(false);
  };

  const handleExport = async () => {
    if (!user) return;
    try {
      const exportData = await buildUserDataExport(user.id, t.export.bnoLabels);
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `grithu-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t.profile.dataExported);
    } catch (err) {
      console.error('Export failed:', err);
      toast.toast ? toast.error(t.export.exportFailed) : toast.error(t.export.exportFailed);
    }
  };

  return (
    <DashboardLayout showSubjectRegistry={true}>
      <div className="max-w-lg mx-auto w-full space-y-5">
        <div className="pb-3 border-b border-border/50">
          <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{t.profile.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.profile.subtitle}</p>
        </div>

        <div className="surface-card p-5 sm:p-6 space-y-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pb-3 border-b border-border/50">{t.profile.profileSection}</h2>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.profile.emailLabel}</Label>
            <Input value={user?.email ?? ''} disabled className="opacity-60 rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.profile.displayNameLabel}</Label>
            <Input value={displayName} onChange={e => setDisplayName(e.target.value)} className="rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.profile.biologicalSexLabel}</Label>
            <Select 
              value={biologicalSex || "none"} 
              onValueChange={(val) => setBiologicalSex(val === "none" ? null : val)}
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
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.profile.birthYearLabel}</Label>
            <Input 
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={t.profile.birthYearPlaceholder}
              value={birthYear} 
              onChange={e => {
                const val = e.target.value;
                if (/^\d*$/.test(val) && val.length <= 4) {
                  setBirthYear(val);
                }
              }} 
              className="rounded-2xl" 
            />
            {birthYear.trim() !== '' && (() => {
              const y = parseInt(birthYear.trim(), 10);
              const currentYear = new Date().getFullYear();
              if (/^\d{4}$/.test(birthYear.trim()) && !isNaN(y) && y >= 1900 && y <= currentYear) {
                return (
                  <p className="text-xs text-muted-foreground mt-1 animate-fade-in">
                    {t.profile.approximateAge.replace('{age}', String(currentYear - y))}
                  </p>
                );
              }
              return null;
            })()}
          </div>
          <Button onClick={handleSave} disabled={saving} size="sm" className="rounded-2xl">
            {saving ? t.saving : t.profile.saveChanges}
          </Button>
        </div>

        <div className="surface-card p-5 sm:p-6 space-y-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground pb-3 border-b border-border/50">{t.profile.yourData}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.profile.yourDataDesc}</p>
          <Button onClick={handleExport} size="sm" variant="outline" className="rounded-2xl">
            <FDownload className="h-4 w-4 mr-1.5" /> {t.profile.exportAllData}
          </Button>
        </div>
        <ManagedRelatives />
        <ConsentDashboard />

        <Button variant="outline" onClick={signOut} size="sm" className="rounded-2xl">{t.signOut}</Button>
      </div>
    </DashboardLayout>
  );
};

export default Profile;
