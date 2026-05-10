import { useState } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import PublicHeader from '@/components/PublicHeader';

const Impressum = () => {
  const { t } = useLanguage();
  const content = t.legal.impressum;
  
  const [showEmail, setShowEmail] = useState(false);
  
  // Obfuscated email parts
  const emailUser = "hello";
  const emailDomain = "grit.hu";

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-12 space-y-8">
        <h1 className="text-2xl font-bold text-foreground">{content.title}</h1>

        <section className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <div>
            <h2 className="text-base font-semibold text-foreground">{content.operatorLabel}</h2>
            <p>{content.operatorValue}</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground">{content.countryLabel}</h2>
            <p>{content.countryValue}</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground">{content.cityLabel}</h2>
            <p>{content.cityValue}</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground">{content.emailLabel}</h2>
            {showEmail ? (
              <a href={`mailto:${emailUser}@${emailDomain}`} className="text-primary hover:underline">
                {emailUser}@{emailDomain}
              </a>
            ) : (
              <button
                onClick={() => setShowEmail(true)}
                className="text-sm underline text-muted-foreground hover:text-foreground"
              >
                {content.clickToReveal}
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Impressum;
