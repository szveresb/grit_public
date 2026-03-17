import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { FLock, FMoodStruggling, FMoodUneasy, FMoodOkay, FMoodGood, FMoodStrong } from '@/components/icons/FreudIcons';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';

const moodIcons = [
  <FMoodStruggling key="0" className="w-6 h-6" />,
  <FMoodUneasy key="1" className="w-6 h-6" />,
  <FMoodOkay key="2" className="w-6 h-6" />,
  <FMoodGood key="3" className="w-6 h-6" />,
  <FMoodStrong key="4" className="w-6 h-6" />,
];

interface MoodPreviewProps {
  title: string;
  subtitle: string;
  ctaText: string;
  moodLabels: string[];
}

const LandingMoodPreview = ({ title, subtitle, ctaText, moodLabels }: MoodPreviewProps) => {
  const { localePath } = useLanguage();
  const navigate = useNavigate();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const handleMoodTap = (index: number) => {
    setSelectedIndex(index);
    setTimeout(() => setShowDialog(true), 400);
  };

  const handleSignUp = () => {
    setShowDialog(false);
    navigate(localePath('/auth'));
  };

  const opacityLevels = ['opacity-30', 'opacity-50', 'opacity-70', 'opacity-85', 'opacity-100'];

  return (
    <section className="relative z-10 px-4 md:px-8 py-16 max-w-7xl mx-auto">
      <div className="max-w-lg mx-auto text-center space-y-6">
        <div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
        </div>

        <div className="flex justify-center gap-3">
          {moodIcons.map((icon, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <button
                onClick={() => handleMoodTap(i)}
                className={`flex items-center justify-center w-14 h-14 rounded-2xl border transition-all hover:scale-105 hover:shadow-md border-border bg-card/60 backdrop-blur ${
                  selectedIndex === i ? 'ring-2 ring-primary scale-110 shadow-lg' : 'hover:border-primary/50'
                }`}
              >
                <span className={`text-primary ${opacityLevels[i]}`}>{icon}</span>
              </button>
              <span className="text-[10px] font-medium text-muted-foreground">
                {moodLabels[i] ?? ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="rounded-3xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {subtitle}
            </DialogDescription>
          </DialogHeader>
          <Button className="w-full rounded-2xl mt-2" onClick={handleSignUp}>
            {ctaText}
            <FLock className="h-4 w-4 ml-1.5" />
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default LandingMoodPreview;
