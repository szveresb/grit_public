import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!; // Anon key
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Querying news_items...');
  const { data, error } = await supabase
    .from('news_items')
    .select('id,title,is_published,category,published_at')
    .eq('is_published', true);
    
  if (error) {
    console.error('Error fetching news_items:', error);
    return;
  }
  
  console.log('Results:', data);
}

check();
