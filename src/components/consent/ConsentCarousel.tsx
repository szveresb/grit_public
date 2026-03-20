import { useState, useCallback, useEffect } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { FArrowLeft, FArrowRight, FCheck } from '@/components/icons/FreudIcons';
import ConsentCard from './ConsentCard';
import ConsentSummary from './ConsentSummary';
import { buildCategories, CONSENT_KEYS } from './consentCategories';

interface ConsentCarouselProps {
  onComplete: (consents: Record<string, boolean>) => void;
  loading?: boolean;
}

const ConsentCarousel = ({ onComplete, loading }: ConsentCarouselProps) => {
  const { t } = useLanguage();
  const categories = buildCategories(t);
  const totalSlides = categories.length + 1; // +1 for summary

  const [consents, setConsents] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(CONSENT_KEYS.map((k) => [k, true]))
  );

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, dragFree: false });
  const [activeIndex, setActiveIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setActiveIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  // Attach select listener
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    onSelect(); // sync initial state
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  const handleToggle = (key: string, granted: boolean) => {
    setConsents((prev) => ({ ...prev, [key]: granted }));
  };

  const scrollPrev = () => emblaApi?.scrollPrev();
  const scrollNext = () => emblaApi?.scrollNext();
  const isSummary = activeIndex === totalSlides - 1;

  return (
    <div className="w-full max-w-lg mx-auto space-y-6">
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold tracking-tight text-foreground">{t.consent.carouselTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.consent.carouselSubtitle}</p>
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all ${i === activeIndex ? 'w-6 bg-primary' : 'w-1.5 bg-border'}`}
          />
        ))}
      </div>

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {categories.map((cat) => (
            <div key={cat.key} className="flex-[0_0_100%] min-w-0 px-2">
              <ConsentCard category={cat} granted={consents[cat.key]} onToggle={handleToggle} />
            </div>
          ))}
          <div className="flex-[0_0_100%] min-w-0 px-2">
            <ConsentSummary categories={categories} consents={consents} onToggle={handleToggle} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-2">
        <Button
          variant="ghost"
          size="sm"
          className="rounded-2xl gap-1.5"
          onClick={scrollPrev}
          disabled={activeIndex === 0}
        >
          <FArrowLeft className="h-4 w-4" />
          {t.consent.prev}
        </Button>

        {isSummary ? (
          <Button
            size="sm"
            className="rounded-2xl gap-1.5"
            onClick={() => onComplete(consents)}
            disabled={loading}
          >
            <FCheck className="h-4 w-4" />
            {loading ? t.saving : t.consent.confirm}
          </Button>
        ) : (
          <Button variant="ghost" size="sm" className="rounded-2xl gap-1.5" onClick={scrollNext}>
            {t.consent.next}
            <FArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ConsentCarousel;
