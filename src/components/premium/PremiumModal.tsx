import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FSparkles, FUsers, FTrendingUp, FFileText } from '@/components/icons/FreudIcons';
import { useLanguage } from '@/hooks/useLanguage';

interface PremiumModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PremiumModal = ({ open, onOpenChange }: PremiumModalProps) => {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="h-10 w-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <FSparkles className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-lg font-bold">{t.premium.modalTitle}</DialogTitle>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed pt-2">
            {t.premium.modalDesc}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {[
            { icon: <FUsers className="h-4 w-4" />, text: t.premium.benefit1 },
            { icon: <FTrendingUp className="h-4 w-4" />, text: t.premium.benefit2 },
            { icon: <FFileText className="h-4 w-4" />, text: t.premium.benefit3 },
          ].map((b, i) => (
            <div key={i} className="flex items-start gap-3 text-sm">
              <div className="h-7 w-7 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                {b.icon}
              </div>
              <span className="text-foreground leading-relaxed">{b.text}</span>
            </div>
          ))}
        </div>

        <div className="pt-4">
          <Button className="w-full rounded-2xl gap-2" onClick={() => onOpenChange(false)}>
            <FSparkles className="h-4 w-4" />
            {t.premium.understood}
          </Button>
          <p className="text-[10px] text-center text-muted-foreground mt-2">{t.premium.comingSoon}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PremiumModal;
