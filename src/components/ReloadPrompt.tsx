import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

const ReloadPrompt: React.FC = () => {
  const { t } = useLanguage();

  if (import.meta.env.DEV) return null;

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ', r);
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  React.useEffect(() => {
    if (offlineReady) {
      toast.success(t.pwa.offlineReady);
      setOfflineReady(false);
    }
  }, [offlineReady, t.pwa.offlineReady, setOfflineReady]);

  React.useEffect(() => {
    if (needRefresh) {
      toast(t.pwa.newVersion, {
        description: t.pwa.reload,
        action: {
          label: t.pwa.reload,
          onClick: () => updateServiceWorker(true),
        },
        duration: Infinity,
      });
    }
  }, [needRefresh, updateServiceWorker, t.pwa.newVersion, t.pwa.reload]);

  return null;
};

export default ReloadPrompt;
