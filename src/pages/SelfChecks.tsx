import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

interface Questionnaire {
  id: string;
  title: string;
  description: string | null;
  is_published: boolean;
  created_at: string;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  options: string[] | null;
  sort_order: number;
}

const SelfChecks = () => {
  const { user } = useAuth();
  const { hasRole } = useUserRole();
  const isAdmin = hasRole('observer');
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [selectedQ, setSelectedQ] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  // Admin state
  const [showAdmin, setShowAdmin] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newQuestions, setNewQuestions] = useState<{ text: string; type: string; options: string }[]>([
    { text: '', type: 'text', options: '' }
  ]);

  const fetchQuestionnaires = async () => {
    const { data } = await supabase.from('questionnaires').select('*').order('created_at', { ascending: false });
    setQuestionnaires(data ?? []);
  };

  useEffect(() => { fetchQuestionnaires(); }, []);

  const loadQuestions = async (qId: string) => {
    setSelectedQ(qId);
    setAnswers({});
    const { data } = await supabase
      .from('questionnaire_questions')
      .select('*')
      .eq('questionnaire_id', qId)
      .order('sort_order');
    setQuestions((data ?? []).map(q => ({ ...q, options: q.options as string[] | null })));
  };

  const handleSubmitAnswers = async () => {
    if (!user || !selectedQ) return;
    setSubmitting(true);
    const { data: resp, error } = await supabase.from('questionnaire_responses')
      .insert({ user_id: user.id, questionnaire_id: selectedQ })
      .select('id')
      .single();
    if (error || !resp) { toast.error('Failed to submit'); setSubmitting(false); return; }

    const answerRows = Object.entries(answers).map(([question_id, answer]) => ({
      response_id: resp.id, question_id, answer: JSON.stringify(answer),
    }));
    if (answerRows.length) await supabase.from('questionnaire_answers').insert(answerRows);

    toast.success('Self-check completed');
    setSelectedQ(null);
    setAnswers({});
    setSubmitting(false);
  };

  const handleCreateQuestionnaire = async () => {
    if (!user || !newTitle.trim()) return;
    const { data: q, error } = await supabase.from('questionnaires')
      .insert({ title: newTitle, description: newDesc || null, created_by: user.id, is_published: true })
      .select('id')
      .single();
    if (error || !q) { toast.error(error?.message ?? 'Failed'); return; }

    const qRows = newQuestions.filter(nq => nq.text.trim()).map((nq, i) => ({
      questionnaire_id: q.id,
      question_text: nq.text,
      question_type: nq.type,
      options: nq.type === 'multiple_choice' ? nq.options.split(',').map(s => s.trim()).filter(Boolean) : null,
      sort_order: i,
    }));
    if (qRows.length) await supabase.from('questionnaire_questions').insert(qRows);

    toast.success('Questionnaire created');
    setNewTitle(''); setNewDesc(''); setNewQuestions([{ text: '', type: 'text', options: '' }]);
    setShowAdmin(false);
    fetchQuestionnaires();
  };

  const renderQuestionInput = (q: Question) => {
    const val = answers[q.id] ?? '';
    switch (q.question_type) {
      case 'scale':
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => setAnswers(a => ({ ...a, [q.id]: String(n) }))}
                className={`h-9 w-9 rounded-sm border text-sm font-medium transition-colors ${val === String(n) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-foreground'}`}
              >{n}</button>
            ))}
          </div>
        );
      case 'yes_no':
        return (
          <RadioGroup value={val} onValueChange={v => setAnswers(a => ({ ...a, [q.id]: v }))}>
            <div className="flex gap-4">
              <div className="flex items-center gap-2"><RadioGroupItem value="yes" id={`${q.id}-yes`} /><Label htmlFor={`${q.id}-yes`}>Yes</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="no" id={`${q.id}-no`} /><Label htmlFor={`${q.id}-no`}>No</Label></div>
            </div>
          </RadioGroup>
        );
      case 'multiple_choice':
        return (
          <RadioGroup value={val} onValueChange={v => setAnswers(a => ({ ...a, [q.id]: v }))}>
            <div className="space-y-2">
              {(q.options ?? []).map(opt => (
                <div key={opt} className="flex items-center gap-2">
                  <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                  <Label htmlFor={`${q.id}-${opt}`} className="text-sm">{opt}</Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        );
      default:
        return <Textarea value={val} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} rows={2} placeholder="Your response" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium tracking-tight text-foreground">Self-Checks</h1>
            <p className="mt-1 text-sm text-muted-foreground">Complete curated questionnaires to track your state.</p>
          </div>
          {isAdmin && (
            <Button size="sm" variant="outline" onClick={() => setShowAdmin(!showAdmin)}>
              <Plus className="h-4 w-4 mr-1" /> Create Questionnaire
            </Button>
          )}
        </div>

        {/* Admin: Create Questionnaire */}
        {showAdmin && isAdmin && (
          <div className="border border-border rounded-sm p-6 space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground">New Questionnaire</h2>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-widest">Title</Label>
              <Input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Questionnaire title" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-mono uppercase tracking-widest">Description</Label>
              <Textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Brief description" rows={2} />
            </div>
            <div className="space-y-3">
              <Label className="text-xs font-mono uppercase tracking-widest">Questions</Label>
              {newQuestions.map((nq, i) => (
                <div key={i} className="border border-border rounded-sm p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input value={nq.text} onChange={e => { const copy = [...newQuestions]; copy[i].text = e.target.value; setNewQuestions(copy); }} placeholder={`Question ${i + 1}`} className="flex-1" />
                    <select value={nq.type} onChange={e => { const copy = [...newQuestions]; copy[i].type = e.target.value; setNewQuestions(copy); }}
                      className="border border-input rounded-md px-2 text-sm bg-background">
                      <option value="text">Text</option>
                      <option value="scale">Scale (1–5)</option>
                      <option value="yes_no">Yes/No</option>
                      <option value="multiple_choice">Multiple Choice</option>
                    </select>
                    {newQuestions.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => setNewQuestions(nq => nq.filter((_, j) => j !== i))}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {nq.type === 'multiple_choice' && (
                    <Input value={nq.options} onChange={e => { const copy = [...newQuestions]; copy[i].options = e.target.value; setNewQuestions(copy); }}
                      placeholder="Options (comma-separated)" className="text-xs" />
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setNewQuestions(q => [...q, { text: '', type: 'text', options: '' }])}>
                Add Question
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateQuestionnaire}>Publish Questionnaire</Button>
              <Button size="sm" variant="outline" onClick={() => setShowAdmin(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Take a questionnaire */}
        {selectedQ ? (
          <div className="border border-border rounded-sm p-6 space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-[0.15em] text-muted-foreground">
              {questionnaires.find(q => q.id === selectedQ)?.title}
            </h2>
            {questions.map((q, i) => (
              <div key={q.id} className="space-y-2">
                <Label className="text-sm font-medium">{i + 1}. {q.question_text}</Label>
                {renderQuestionInput(q)}
              </div>
            ))}
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmitAnswers} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setSelectedQ(null)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {questionnaires.length === 0 ? (
              <div className="border border-border rounded-sm p-6">
                <p className="text-sm text-muted-foreground">No questionnaires available yet.</p>
              </div>
            ) : questionnaires.map(q => (
              <button key={q.id} onClick={() => loadQuestions(q.id)}
                className="w-full text-left border border-border rounded-sm p-4 hover:bg-muted/50 transition-colors">
                <span className="text-sm font-medium">{q.title}</span>
                {q.description && <p className="text-xs text-muted-foreground mt-1">{q.description}</p>}
              </button>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SelfChecks;
