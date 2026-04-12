import { FClose } from '@/components/icons/FreudIcons';
import { useLanguage } from '@/hooks/useLanguage';

const EmergencyExit = () => {
  const { t } = useLanguage();

  const handleExit = async () => {
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.map(name => caches.delete(name)));
      }
      // Clear all storage for maximum discretion
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.error('Error during emergency exit:', e);
    } finally {
      window.location.replace("https://www.google.com");
    }
  };

  return (
    <button
      onClick={handleExit}
      className="fixed bottom-5 right-5 z-[100] flex items-center justify-center h-12 w-12 rounded-full bg-destructive text-destructive-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label={t.emergencyExit}
      title={t.emergencyExit}
    >
      <FClose className="h-5 w-5" />
    </button>
  );
};

export default EmergencyExit;
