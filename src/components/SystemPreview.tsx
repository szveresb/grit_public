import { subDays, format } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';
import QuickPulse from '@/components/checkin/QuickPulse';
import MoodTrendChart from '@/components/timeline/MoodTrendChart';

const generateMockData = () => {
  const data = [];
  const today = new Date();
  for (let i = 30; i >= 0; i--) {
    const d = subDays(today, i);
    // Generate a somewhat realistic wavy pattern
    const fakeLevel = Math.round(3 + Math.sin(i / 3) * 1.5 + (Math.random() * 0.5 - 0.25));
    data.push({
      date: format(d, 'yyyy-MM-dd'),
      level: Math.max(1, Math.min(5, fakeLevel)),
    });
  }
  return data;
};

const mockData = generateMockData();

const SystemPreview = () => {
  const { lang, t } = useLanguage();

  return (
    <section className="relative z-10 px-4 md:px-8 py-16 max-w-7xl mx-auto space-y-6">
      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold tracking-tight text-foreground">
          {t.landing?.systemPreviewTitle || 'System Preview'}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground text-balance max-w-lg mx-auto">
          {t.landing?.systemPreviewSubtitle || 'A glimpse into the structured self-observation tools you will gain access to.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-5 w-full flex flex-col justify-center">
          <div className="reference-surface rounded-3xl px-4 py-6 pointer-events-none opacity-90 transition-opacity hover:opacity-100">
            {/* We intercept clicks to keep it inert by setting pointer-events-none, but it renders beautifully */}
            <QuickPulse 
              onMoodSelected={() => {}} 
              compact={false}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center px-4">
            A frictionless, single-tap emotional anchor. Standardized using continuous clinical scales.
          </p>
        </div>

        <div className="md:col-span-7 w-full overflow-hidden">
          <div className="pointer-events-none opacity-90 transition-opacity hover:opacity-100">
            <MoodTrendChart 
              data={mockData} 
              lang={lang} 
              t={t} 
              isPremium={true} // Unlocks features for preview
            />
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center px-4">
            Real-time visualization of your emotional baseline and instability patterns over your chosen window.
          </p>
        </div>
      </div>
    </section>
  );
};

export default SystemPreview;
