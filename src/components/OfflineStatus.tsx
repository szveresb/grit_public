import React from 'react';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

const OfflineStatus: React.FC = () => {
  const { t } = useLanguage();
  const toastIdRef = React.useRef<string | number | undefined>(undefined);

  React.useEffect(() => {
    const handleOnline = () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = undefined;
      }
      toast.success(t.pwa.online);
    };

    const handleOffline = () => {
      toastIdRef.current = toast.error(t.pwa.syncPending, {
        duration: Infinity,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [t.pwa.online, t.pwa.syncPending]);

  return null;
};

export default OfflineStatus;
