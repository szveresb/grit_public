import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { friendlyDbError } from '@/lib/db-error';
import { FSave, FLoader } from '@/components/icons/FreudIcons';
import { Navigate } from 'react-router-dom';

interface LandingSection {
  id: string;
  section_key: string;
  title: string;
  title_localized: Record<string, string> | null;
  subtitle: string | null;
  subtitle_localized: Record<string, string> | null;
  cta_text: string | null;
  cta_text_localized: Record<string, string> | null;
  config: Record<string, any> | null;
  is_active: boolean;
}

const ManageLanding = () => {
  const { t } = useLanguage();
  const { hasAnyRole, loading: roleLoading } = useUserRole();
  const [sections, setSections] = useState<LandingSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canManage = hasAnyRole('admin', 'editor');

  useEffect(() => {
    const fetchSections = async () => {
      const { data } = await supabase
        .from('landing_sections')
        .select('*')
        .order('created_at');
      setSections((data as LandingSection[]) ?? []);
      setLoading(false);
    };
    fetchSections();
  }, []);

  const updateSection = (id: string, updates: Partial<LandingSection>) => {
    setSections(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const updateConfig = (id: string, key: string, value: any) => {
    setSections(prev => prev.map(s => {
      if (s.id !== id) return s;
      return { ...s, config: { ...(s.config ?? {}), [key]: value } };
    }));
  };

  const handleSave = async (section: LandingSection) => {
    setSaving(true);
    const { error } = await supabase
      .from('landing_sections')
      .update({
        title: section.title,
        title_localized: section.title_localized,
        subtitle: section.subtitle,
        subtitle_localized: section.subtitle_localized,
        cta_text: section.cta_text,
        cta_text_localized: section.cta_text_localized,
        config: section.config,
        is_active: section.is_active,
      })
      .eq('id', section.id);
    if (error) toast.error(friendlyDbError(error));
    else toast.success('Mentve ✓');
    setSaving(false);
  };

  if (roleLoading) return null;
  if (!canManage) return <Navigate to="/" replace />;

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Landing szekciók kezelése</h1>
          <p className="mt-1 text-sm text-muted-foreground">A nyitólap dinamikus szekciói.</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <FLoader className="h-4 w-4 animate-spin" /> Betöltés...
          </div>
        ) : sections.map(section => (
          <div key={section.id} className="surface-card p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-widest">
                {section.section_key.replace('_', ' ')}
              </h2>
              <div className="flex items-center gap-2">
                <Label htmlFor={`active-${section.id}`} className="text-xs text-muted-foreground">Aktív</Label>
                <Switch
                  id={`active-${section.id}`}
                  checked={section.is_active}
                  onCheckedChange={(val) => updateSection(section.id, { is_active: val })}
                />
              </div>
            </div>

            {/* Title HU */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cím (HU)</Label>
              <Input
                value={section.title}
                onChange={e => updateSection(section.id, { title: e.target.value })}
                className="rounded-2xl"
              />
            </div>

            {/* Title EN */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Cím (EN)</Label>
              <Input
                value={section.title_localized?.en ?? ''}
                onChange={e => updateSection(section.id, { title_localized: { ...(section.title_localized ?? {}), en: e.target.value } })}
                className="rounded-2xl"
              />
            </div>

            {/* Subtitle HU */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Alcím (HU)</Label>
              <Textarea
                value={section.subtitle ?? ''}
                onChange={e => updateSection(section.id, { subtitle: e.target.value })}
                className="rounded-2xl min-h-[60px]"
              />
            </div>

            {/* Subtitle EN */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Alcím (EN)</Label>
              <Textarea
                value={section.subtitle_localized?.en ?? ''}
                onChange={e => updateSection(section.id, { subtitle_localized: { ...(section.subtitle_localized ?? {}), en: e.target.value } })}
                className="rounded-2xl min-h-[60px]"
              />
            </div>

            {/* CTA HU */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">CTA gomb (HU)</Label>
              <Input
                value={section.cta_text ?? ''}
                onChange={e => updateSection(section.id, { cta_text: e.target.value })}
                className="rounded-2xl"
              />
            </div>

            {/* CTA EN */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">CTA gomb (EN)</Label>
              <Input
                value={section.cta_text_localized?.en ?? ''}
                onChange={e => updateSection(section.id, { cta_text_localized: { ...(section.cta_text_localized ?? {}), en: e.target.value } })}
                className="rounded-2xl"
              />
            </div>

            {/* Mood labels (for mood_preview) */}
            {section.section_key === 'mood_preview' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Hangulat címkék (HU, vesszővel elválasztva)</Label>
                  <Input
                    value={(section.config?.mood_labels ?? []).join(', ')}
                    onChange={e => updateConfig(section.id, 'mood_labels', e.target.value.split(',').map((s: string) => s.trim()))}
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Hangulat címkék (EN, vesszővel elválasztva)</Label>
                  <Input
                    value={(section.config?.mood_labels_en ?? []).join(', ')}
                    onChange={e => updateConfig(section.id, 'mood_labels_en', e.target.value.split(',').map((s: string) => s.trim()))}
                    className="rounded-2xl"
                  />
                </div>
              </>
            )}

            <Button size="sm" className="rounded-2xl gap-1.5" onClick={() => handleSave(section)} disabled={saving}>
              {saving ? <FLoader className="h-4 w-4 animate-spin" /> : <FSave className="h-4 w-4" />}
              Mentés
            </Button>
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default ManageLanding;
