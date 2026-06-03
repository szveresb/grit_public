import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data: questionnaires, error } = await supabase
    .from('questionnaires')
    .select('id, title, is_published, created_at');
    
  if (error) {
    console.error('Error fetching questionnaires:', error);
    return;
  }
  
  for (const q of questionnaires) {
    const { count } = await supabase
      .from('questionnaire_questions')
      .select('*', { count: 'exact', head: true })
      .eq('questionnaire_id', q.id);
      
    console.log(`Title: ${q.title} | Published: ${q.is_published} | Questions: ${count} | ID: ${q.id} | Created: ${q.created_at}`);
  }
}

check();
