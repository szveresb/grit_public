import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TopMenuItem {
  label_hu: string;
  label_en: string;
  url: string;
  gated?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

let cache: TopMenuItem[] | null = null;
let inflight: Promise<TopMenuItem[]> | null = null;

const fetchItems = async (): Promise<TopMenuItem[]> => {
  const { data } = await supabase
    .from('landing_sections')
    .select('config, is_active')
    .eq('section_key', 'top_menu')
    .maybeSingle();
  if (!data || data.is_active === false) return [];
  const items = ((data.config as Record<string, unknown>)?.items as TopMenuItem[]) ?? [];
  return items
    .filter((i) => i.is_active !== false && i.url)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
};

export const useTopMenu = () => {
  const [items, setItems] = useState<TopMenuItem[] | null>(cache);
  useEffect(() => {
    if (cache) { setItems(cache); return; }
    if (!inflight) inflight = fetchItems();
    inflight.then((res) => { cache = res; setItems(res); });
  }, []);
  return items;
};