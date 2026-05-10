import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import PublicHeader from '@/components/PublicHeader';
import { supabase } from '@/integrations/supabase/client';

const Impressum = () => {
  const { t, lang } = useLanguage();
  const content = t.legal.impressum;
  
  const [showEmail, setShowEmail] = useState(false);
  const [dbValues, setDbValues] = useState<{
    operator?: string;
    country?: string;
    city?: string;
  }>({});
  
  // Obfuscated email parts
  const emailUser = "hello";
  const emailDomain = "grit.hu";

  useEffect(() => {
    const fetchImpressum = async () => {
      const { data } = await supabase
        .from('landing_sections')
        .select('config')
        .eq('section_key', 'impressum')
        .single();
      
      if (data?.config) {
        const config = data.config;
        setDbValues({
          operator: lang === 'en' ? config.operator_en : config.operator_hu,
          country: lang === 'en' ? config.country_en : config.country_hu,
          city: lang === 'en' ? config.city_en : config.city_hu,
        });
      }
    };
    fetchImpressum();
  }, [lang]);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-12 space-y-8">
        <h1 className="text-2xl font-bold text-foreground">{content.title}</h1>

        <section className="space-y-4 text-sm text-muted-foreground leading-relaxed">
          <div>
            <h2 className="text-base font-semibold text-foreground">{content.operatorLabel}</h2>
            <p>{dbValues.operator || content.operatorValue}</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground">{content.countryLabel}</h2>
            <p>{dbValues.country || content.countryValue}</p>
          </div>

          <div>
            <h2 className="text-base font-semibold text-foreground">{content.cityLabel}</h2>
            <p>{dbValues.city || content.cityValue}</p>
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
