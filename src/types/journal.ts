export interface JournalEntry {
  id: string;
  entry_date: string;
  title: string;
  event_description: string | null;
  impact_level: number | null;
  emotional_state: string | null;
  free_text: string | null;
  self_anchor: string | null;
  reflection: string | null;
  created_at: string;
}

export interface JournalFormData {
  title: string;
  entry_date: string;
  event_description: string;
  impact_level: number;
  emotional_state: string;
  free_text: string;
  self_anchor: string;
}

export const emptyForm: JournalFormData = {
  title: '',
  entry_date: new Date().toISOString().split('T')[0],
  event_description: '',
  impact_level: 3,
  emotional_state: '',
  free_text: '',
  self_anchor: '',
};
