import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import PublicHeader from '@/components/PublicHeader';
import { supabase } from '@/integrations/supabase/client';

const Terms = () => {
  const { t, lang } = useLanguage();
  const [dbContent, setDbContent] = useState<any>(null);
  
  useEffect(() => {
    const fetchContent = async () => {
      const { data } = await supabase
        .from('landing_sections')
        .select('config')
        .eq('section_key', 'terms')
        .single();
      
      if (data?.config) {
        setDbContent(lang === 'en' ? data.config.en : data.config.hu);
      }
    };
    fetchContent();
  }, [lang]);

  const content = { ...t.legal.terms, ...(dbContent || {}) };

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-12 space-y-8">
        <h1 className="text-2xl font-bold text-foreground">{content.title}</h1>
        <p className="text-xs text-muted-foreground">{content.lastUpdated}</p>

        <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <h2 className="text-base font-semibold text-foreground">{content.s1Title}</h2>
          <p>{content.s1Desc}</p>

          <h2 className="text-base font-semibold text-foreground">{content.s2Title}</h2>
          <p>{content.s2Desc}</p>

          <h2 className="text-base font-semibold text-foreground">{content.s3Title}</h2>
          <p>{content.s3Desc}</p>

          <h2 className="text-base font-semibold text-foreground">{content.s4Title}</h2>
          <p>{content.s4Desc}</p>

          <h2 className="text-base font-semibold text-foreground">{content.s5Title}</h2>
          <p>{content.s5Desc}</p>

          <h2 className="text-base font-semibold text-foreground">{content.s6Title}</h2>
          <p>{content.s6Desc}</p>

          <h2 className="text-base font-semibold text-foreground">{content.s7Title}</h2>
          <p>{content.s7Desc}</p>
          <ul className="list-disc pl-5 space-y-1">
            {content.s7Items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
};

export default Terms;
