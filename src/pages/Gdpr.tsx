import { useState, useEffect } from 'react';
import { useLanguage } from '@/hooks/useLanguage';
import PublicHeader from '@/components/PublicHeader';
import { supabase } from '@/integrations/supabase/client';
import { renderSimpleMarkdown, convertToText } from '@/lib/simple-markdown';

const Gdpr = () => {
  const { t, lang } = useLanguage();
  const [dbContent, setDbContent] = useState<any>(null);
  
  useEffect(() => {
    const fetchContent = async () => {
      const { data } = await supabase
        .from('landing_sections')
        .select('config')
        .eq('section_key', 'gdpr')
        .single();
      
      if (data?.config) {
        setDbContent(lang === 'en' ? data.config.en : data.config.hu);
      }
    };
    fetchContent();
  }, [lang]);

  const rawContent = dbContent || t.legal.gdpr;
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

export default Gdpr;
