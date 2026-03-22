import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useConsent } from '@/hooks/useConsent';
import { supabase } from '@/integrations/supabase/client';
import ConsentCarousel from '@/components/consent/ConsentCarousel';
import LanguageToggle from '@/components/LanguageToggle';
import EmergencyExit from '@/components/EmergencyExit';
import bambooBg from '@/assets/bamboo-bg.jpg';
import { toast } from 'sonner';

const ConsentOnboarding = () => {
  const { user } = useAuth();
  const { localePath } = useLanguage();
  const { refresh: refreshConsent, setConsentCompleted } = useConsent();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleComplete = async (consents: Record<string, boolean>) => {
    if (!user) return;
    setSaving(true);

    const rows = Object.entries(consents).map(([consent_key, granted]) => ({
      user_id: user.id,
      consent_key,
      granted,
      updated_at: new Date().toISOString(),
    }));

    const { error: cErr } = await supabase.from('user_consents').upsert(rows, {
      onConflict: 'user_id,consent_key',
    });
    if (cErr) { toast.error(cErr.message); setSaving(false); return; }

    const { error: pErr } = await supabase
      .from('profiles')
      .update({ consent_completed: true })
      .eq('user_id', user.id);
    if (pErr) { toast.error(pErr.message); setSaving(false); return; }

    setConsentCompleted(true); // optimistic update to prevent re-redirect
    await refreshConsent();
    navigate(localePath('/journal'));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="fixed inset-0 z-0 bg-cover bg-center" style={{ backgroundImage: `url(${bambooBg})`, opacity: 0.12 }} />
      <div className="fixed inset-0 z-0 bg-background/80" />
      <div className="fixed top-4 right-4 z-20">
        <LanguageToggle />
      </div>
      <EmergencyExit />
      <div className="relative z-10 w-full max-w-lg py-12">
        <ConsentCarousel onComplete={handleComplete} loading={saving} />
      </div>
    </div>
  );
};

export default ConsentOnboarding;
