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
import { FSave, FLoader, FChevronDown, FChevronUp } from '@/components/icons/FreudIcons';
import { Navigate } from 'react-router-dom';
import { hu } from '@/i18n/hu';
import { en } from '@/i18n/en';

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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const canManage = hasAnyRole('admin', 'editor');

  useEffect(() => {
    const fetchSections = async () => {
      const { data } = await supabase
        .from('landing_sections')
        .select('*')
        .order('created_at');
      
      let sectionsData = (data as LandingSection[]) ?? [];
      const keys = ['about_legal', 'terms', 'cookies', 'gdpr', 'impressum'];
      
      for (const key of keys) {
        const hasSection = sectionsData.some(s => s.section_key === key);
        if (!hasSection) {
          const tKey = key === 'about_legal' ? 'about' : key;
          const huContent = hu.legal[tKey as keyof typeof hu.legal] || {};
          const enContent = en.legal[tKey as keyof typeof en.legal] || {};

          const { data: newSection } = await supabase
            .from('landing_sections')
            .insert({
              section_key: key,
              title: key.replace('_', ' ').toUpperCase(),
              is_active: true,
              config: {
                hu: huContent,
                en: enContent
              }
            })
            .select()
            .single();
          
          if (newSection) {
            sectionsData = [...sectionsData, newSection as LandingSection];
          }
        }
      }

      setSections(sectionsData);
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

  const updateLegalConfig = (id: string, lang: 'hu' | 'en', key: string, value: any) => {
    setSections(prev => prev.map(s => {
      if (s.id !== id) return s;
      const currentLangConfig = s.config?.[lang] ?? {};
      return {
        ...s,
        config: {
          ...(s.config ?? {}),
          [lang]: { ...currentLangConfig, [key]: value }
        }
      };
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
    else toast.success(t.admin.manageLanding.saved);
    setSaving(false);
  };

  if (roleLoading) return null;
  if (!canManage) return <Navigate to="/" replace />;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto w-full space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{t.admin.manageLanding.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t.admin.manageLanding.subtitle}</p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <FLoader className="h-4 w-4 animate-spin" /> {t.admin.manageLanding.loading}
          </div>
        ) : sections.map(section => (
          <div key={section.id} className="surface-card p-6 space-y-5">
            <div 
              className="flex items-center justify-between cursor-pointer" 
              onClick={() => setExpandedId(expandedId === section.id ? null : section.id)}
            >
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-widest">
                  {section.section_key.replace('_', ' ')}
                </h2>
                {expandedId === section.id ? (
                  <FChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <FChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                <Label htmlFor={`active-${section.id}`} className="text-xs text-muted-foreground">{t.admin.manageLanding.active}</Label>
                <Switch
                  id={`active-${section.id}`}
                  checked={section.is_active}
                  onCheckedChange={(val) => updateSection(section.id, { is_active: val })}
                />
              </div>
            </div>

            {expandedId === section.id && (
              <div className="space-y-5 pt-2">
                {/* Title HU */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t.admin.manageLanding.titleHu}</Label>
              <Input
                value={section.title}
                onChange={e => updateSection(section.id, { title: e.target.value })}
                className="rounded-2xl"
              />
            </div>

            {/* Title EN */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t.admin.manageLanding.titleEn}</Label>
              <Input
                value={section.title_localized?.en ?? ''}
                onChange={e => updateSection(section.id, { title_localized: { ...(section.title_localized ?? {}), en: e.target.value } })}
                className="rounded-2xl"
              />
            </div>

            {/* Subtitle HU */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t.admin.manageLanding.subtitleHu}</Label>
              <Textarea
                value={section.subtitle ?? ''}
                onChange={e => updateSection(section.id, { subtitle: e.target.value })}
                className="rounded-2xl min-h-[60px]"
              />
            </div>

            {/* Subtitle EN */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t.admin.manageLanding.subtitleEn}</Label>
              <Textarea
                value={section.subtitle_localized?.en ?? ''}
                onChange={e => updateSection(section.id, { subtitle_localized: { ...(section.subtitle_localized ?? {}), en: e.target.value } })}
                className="rounded-2xl min-h-[60px]"
              />
            </div>

            {/* CTA HU */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t.admin.manageLanding.ctaHu}</Label>
              <Input
                value={section.cta_text ?? ''}
                onChange={e => updateSection(section.id, { cta_text: e.target.value })}
                className="rounded-2xl"
              />
            </div>

            {/* CTA EN */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">{t.admin.manageLanding.ctaEn}</Label>
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
                  <Label className="text-xs text-muted-foreground">{t.admin.manageLanding.moodLabelsHu}</Label>
                  <Input
                    value={(section.config?.mood_labels ?? []).join(', ')}
                    onChange={e => updateConfig(section.id, 'mood_labels', e.target.value.split(',').map((s: string) => s.trim()))}
                    className="rounded-2xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">{t.admin.manageLanding.moodLabelsEn}</Label>
                  <Input
                    value={(section.config?.mood_labels_en ?? []).join(', ')}
                    onChange={e => updateConfig(section.id, 'mood_labels_en', e.target.value.split(',').map((s: string) => s.trim()))}
                    className="rounded-2xl"
                  />
                </div>
              </>
            )}

            {['about_legal', 'terms', 'cookies', 'gdpr', 'impressum'].includes(section.section_key) && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* HU Column */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Hungarian</h3>
                    {Object.entries(section.config?.hu || {}).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{key}</Label>
                        {typeof value === 'string' ? (
                          value.length > 50 ? (
                            <Textarea
                              value={value}
                              onChange={e => updateLegalConfig(section.id, 'hu', key, e.target.value)}
                              className="rounded-xl min-h-[60px]"
                            />
                          ) : (
                            <Input
                              value={value}
                              onChange={e => updateLegalConfig(section.id, 'hu', key, e.target.value)}
                              className="rounded-xl"
                            />
                          )
                        ) : Array.isArray(value) ? (
                          <Textarea
                            value={value.join('\n')}
                            onChange={e => updateLegalConfig(section.id, 'hu', key, e.target.value.split('\n'))}
                            className="rounded-xl min-h-[60px]"
                            placeholder="One item per line"
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>

                  {/* EN Column */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">English</h3>
                    {Object.entries(section.config?.en || {}).map(([key, value]) => (
                      <div key={key} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{key}</Label>
                        {typeof value === 'string' ? (
                          value.length > 50 ? (
                            <Textarea
                              value={value}
                              onChange={e => updateLegalConfig(section.id, 'en', key, e.target.value)}
                              className="rounded-xl min-h-[60px]"
                            />
                          ) : (
                            <Input
                              value={value}
                              onChange={e => updateLegalConfig(section.id, 'en', key, e.target.value)}
                              className="rounded-xl"
                            />
                          )
                        ) : Array.isArray(value) ? (
                          <Textarea
                            value={value.join('\n')}
                            onChange={e => updateLegalConfig(section.id, 'en', key, e.target.value.split('\n'))}
                            className="rounded-xl min-h-[60px]"
                            placeholder="One item per line"
                          />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <Button size="sm" className="rounded-2xl gap-1.5" onClick={() => handleSave(section)} disabled={saving}>
              {saving ? <FLoader className="h-4 w-4 animate-spin" /> : <FSave className="h-4 w-4" />}
              {t.admin.manageLanding.save}
            </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </DashboardLayout>
  );
};

export default ManageLanding;
