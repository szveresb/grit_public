import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import PublicHeader from '@/components/PublicHeader';
import { supabase } from '@/integrations/supabase/client';
import { renderSimpleMarkdown, convertToText } from '@/lib/simple-markdown';

const AboutLegal = () => {
  const { t, lang } = useLanguage();
  const [dbContent, setDbContent] = useState<any>(null);
  
  useEffect(() => {
    const fetchContent = async () => {
      const { data } = await supabase
        .from('landing_sections')
        .select('config')
        .eq('section_key', 'about_legal')
        .single();
      
      if (data?.config) {
        const cfg = data.config as Record<string, any>;
        setDbContent(lang === 'en' ? cfg.en : cfg.hu);
      }
    };
    fetchContent();
  }, [lang]);

  const rawContent = dbContent || t.legal.about;
  const textContent = typeof rawContent === 'string' ? rawContent : convertToText(rawContent);

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-12">
        <div className="space-y-4">
          {renderSimpleMarkdown(textContent)}
        </div>
      </main>
    </div>
  );
};

export default AboutLegal;
