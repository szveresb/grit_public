import { useLanguage } from '@/hooks/useLanguage';
import type { Lang } from '@/i18n/types';

const LanguageToggle = () => {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className="flex items-center rounded-full border border-border bg-card/60 backdrop-blur overflow-hidden text-xs font-semibold">
      {(['hu', 'en'] as Lang[]).map((l) => (
        <button
          key={l}
          onClick={() => setLang(l)}
          className={`px-3 py-1.5 transition-colors ${
            lang === l
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t.langToggle[l]}
        </button>
      ))}
    </div>
  );
};

export default LanguageToggle;
