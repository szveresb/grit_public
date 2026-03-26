import { format, parseISO } from 'date-fns';
import { hu, enUS } from 'date-fns/locale';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/hooks/useLanguage';
import ObservationStepper from '@/components/observations/ObservationStepper';

interface ObservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryDate: string; // yyyy-MM-dd
  onSaved: () => void;
}

const ObservationModal = ({ open, onOpenChange, entryDate, onSaved }: ObservationModalProps) => {
  const { t, lang } = useLanguage();

  const dateLabel = (() => {
    try {
      const d = parseISO(entryDate);
      return format(d, 'MMMM d', { locale: lang === 'hu' ? hu : enUS });
    } catch { return entryDate; }
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto rounded-3xl border-border bg-card/95 backdrop-blur-lg">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            {t.observations.logObservation} — {dateLabel}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <ObservationStepper 
            observationDate={entryDate}
            onLogged={() => {
              onSaved();
              onOpenChange(false);
            }} 
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ObservationModal;
