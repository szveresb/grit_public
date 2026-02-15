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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Trash2, Pencil, X, Save } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Questionnaire { id: string; title: string; description: string | null; is_published: boolean; created_at: string; }
interface Question { id: string; question_text: string; question_type: string; options: string[] | null; sort_order: number; }

const SelfChecks = () => {
  const { user } = useAuth();
  const { hasAnyRole } = useUserRole();
  const isEditor = hasAnyRole('admin', 'editor');
  const [questionnaires, setQuestionnaires] = useState<Questionnaire[]>([]);
  const [selectedQ, setSelectedQ] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPublished, setFormPublished] = useState(true);
  const [formQuestions, setFormQuestions] = useState<{ id?: string; text: string; type: string; options: string }[]>([{ text: '', type: 'text', options: '' }]);
  const [saving, setSaving] = useState(false);

  const fetchQuestionnaires = async () => {
    const { data } = await supabase.from('questionnaires').select('*').order('created_at', { ascending: false });
    setQuestionnaires(data ?? []);
  };

  useEffect(() => { fetchQuestionnaires(); }, []);

  const loadQuestions = async (qId: string) => {
    setSelectedQ(qId); setAnswers({});
    const { data } = await supabase.from('questionnaire_questions').select('*').eq('questionnaire_id', qId).order('sort_order');
    setQuestions((data ?? []).map(q => ({ ...q, options: q.options as string[] | null })));
  };

  const openCreate = () => {
    setEditingId(null);
    setFormTitle(''); setFormDesc(''); setFormPublished(false);
    setFormQuestions([{ text: '', type: 'text', options: '' }]);
    setShowForm(true);
  };

  const openEdit = async (q: Questionnaire) => {
    setEditingId(q.id);
    setFormTitle(q.title); setFormDesc(q.description ?? ''); setFormPublished(q.is_published);
    const { data } = await supabase.from('questionnaire_questions').select('*').eq('questionnaire_id', q.id).order('sort_order');
    setFormQuestions((data ?? []).map(qq => ({
      id: qq.id, text: qq.question_text, type: qq.question_type,
      options: qq.question_type === 'multiple_choice' && qq.options ? (qq.options as string[]).join(', ') : '',
    })));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user || !formTitle.trim()) return;
    setSaving(true);

    if (editingId) {
      const { error } = await supabase.from('questionnaires').update({ title: formTitle, description: formDesc || null, is_published: formPublished }).eq('id', editingId);
      if (error) { toast.error(error.message); setSaving(false); return; }
      // Delete old questions and re-insert
      await supabase.from('questionnaire_questions').delete().eq('questionnaire_id', editingId);
      const qRows = formQuestions.filter(nq => nq.text.trim()).map((nq, i) => ({
        questionnaire_id: editingId, question_text: nq.text, question_type: nq.type,
        options: nq.type === 'multiple_choice' ? nq.options.split(',').map(s => s.trim()).filter(Boolean) : null, sort_order: i,
      }));
      if (qRows.length) await supabase.from('questionnaire_questions').insert(qRows);
      toast.success('Self-check updated');
    } else {
      const { data: q, error } = await supabase.from('questionnaires').insert({ title: formTitle, description: formDesc || null, created_by: user.id, is_published: formPublished }).select('id').single();
      if (error || !q) { toast.error(error?.message ?? 'Failed'); setSaving(false); return; }
      const qRows = formQuestions.filter(nq => nq.text.trim()).map((nq, i) => ({
        questionnaire_id: q.id, question_text: nq.text, question_type: nq.type,
        options: nq.type === 'multiple_choice' ? nq.options.split(',').map(s => s.trim()).filter(Boolean) : null, sort_order: i,
      }));
      if (qRows.length) await supabase.from('questionnaire_questions').insert(qRows);
      toast.success('Self-check created');
    }

    setSaving(false); setShowForm(false); setEditingId(null); fetchQuestionnaires();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('questionnaire_questions').delete().eq('questionnaire_id', id);
    const { error } = await supabase.from('questionnaires').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Self-check deleted'); fetchQuestionnaires();
  };

  const togglePublished = async (q: Questionnaire) => {
    const { error } = await supabase.from('questionnaires').update({ is_published: !q.is_published }).eq('id', q.id);
    if (error) { toast.error(error.message); return; }
    toast.success(q.is_published ? 'Unpublished' : 'Published');
    fetchQuestionnaires();
  };

  const handleSubmitAnswers = async () => {
    if (!user || !selectedQ) return;
    setSubmitting(true);
    const { data: resp, error } = await supabase.from('questionnaire_responses').insert({ user_id: user.id, questionnaire_id: selectedQ }).select('id').single();
    if (error || !resp) { toast.error('Failed to submit'); setSubmitting(false); return; }
    const answerRows = Object.entries(answers).map(([question_id, answer]) => ({ response_id: resp.id, question_id, answer: JSON.stringify(answer) }));
    if (answerRows.length) await supabase.from('questionnaire_answers').insert(answerRows);
    toast.success('Self-check completed'); setSelectedQ(null); setAnswers({}); setSubmitting(false);
  };

  const renderQuestionInput = (q: Question) => {
    const val = answers[q.id] ?? '';
    switch (q.question_type) {
      case 'scale':
        return (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => setAnswers(a => ({ ...a, [q.id]: String(n) }))}
                className={`h-10 w-10 rounded-full border text-sm font-semibold transition-all ${val === String(n) ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'border-border text-muted-foreground hover:border-primary/50'}`}
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
                <div key={opt} className="flex items-center gap-2 border border-border rounded-2xl p-3 hover:bg-accent/30 transition-colors">
                  <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                  <Label htmlFor={`${q.id}-${opt}`} className="text-sm cursor-pointer">{opt}</Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        );
      default:
        return <Textarea value={val} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} rows={2} placeholder="Your response" className="rounded-2xl" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Self-Checks</h1>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">Gentle check-ins to track how you're feeling.</p>
          </div>
          {isEditor && (
            <Button size="sm" variant="outline" className="rounded-2xl" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> Create
            </Button>
          )}
        </div>

        {/* Create / Edit Form */}
        {showForm && isEditor && (
          <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {editingId ? 'Edit Self-Check' : 'New Self-Check'}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Title</Label>
              <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="Self-check title" className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Description</Label>
              <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="Brief description" rows={2} className="rounded-2xl" />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={formPublished} onCheckedChange={setFormPublished} />
              <Label className="text-sm">Published</Label>
            </div>
            <div className="space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Questions</Label>
              {formQuestions.map((nq, i) => (
                <div key={i} className="border border-border rounded-2xl p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input value={nq.text} onChange={e => { const c = [...formQuestions]; c[i].text = e.target.value; setFormQuestions(c); }} placeholder={`Question ${i + 1}`} className="flex-1 rounded-2xl" />
                    <select value={nq.type} onChange={e => { const c = [...formQuestions]; c[i].type = e.target.value; setFormQuestions(c); }}
                      className="border border-input rounded-2xl px-3 text-sm bg-background">
                      <option value="text">Text</option>
                      <option value="scale">Scale (1–5)</option>
                      <option value="yes_no">Yes/No</option>
                      <option value="multiple_choice">Multiple Choice</option>
                    </select>
                    {formQuestions.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => setFormQuestions(q => q.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                  {nq.type === 'multiple_choice' && (
                    <Input value={nq.options} onChange={e => { const c = [...formQuestions]; c[i].options = e.target.value; setFormQuestions(c); }} placeholder="Options (comma-separated)" className="text-xs rounded-2xl" />
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="rounded-2xl" onClick={() => setFormQuestions(q => [...q, { text: '', type: 'text', options: '' }])}>Add Question</Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="rounded-2xl" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-1" /> {saving ? 'Saving...' : editingId ? 'Update' : 'Create'}
              </Button>
              <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {selectedQ ? (
          <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-5 animate-fade-in">
            <h2 className="text-sm font-semibold text-foreground">{questionnaires.find(q => q.id === selectedQ)?.title}</h2>
            {questions.map((q, i) => (
              <div key={q.id} className="space-y-2">
                <Label className="text-sm font-medium">{i + 1}. {q.question_text}</Label>
                {renderQuestionInput(q)}
              </div>
            ))}
            <div className="flex gap-2">
              <Button size="sm" className="rounded-2xl" onClick={handleSubmitAnswers} disabled={submitting}>{submitting ? 'Submitting...' : 'Submit'}</Button>
              <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => setSelectedQ(null)}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {questionnaires.length === 0 ? (
              <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
                <p className="text-sm text-muted-foreground">No self-checks available yet.</p>
              </div>
            ) : questionnaires.map(q => (
              <div key={q.id} className="bg-card/60 backdrop-blur border border-border rounded-3xl p-5 flex items-start gap-4">
                <button onClick={() => loadQuestions(q.id)} className="flex-1 text-left hover:opacity-80 transition-opacity min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold">{q.title}</span>
                    {!q.is_published && <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">Draft</span>}
                  </div>
                  {q.description && <p className="text-xs text-muted-foreground leading-relaxed">{q.description}</p>}
                </button>
                {isEditor && (
                  <div className="flex gap-1 shrink-0 items-center">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePublished(q)} title={q.is_published ? 'Unpublish' : 'Publish'}>
                      <Switch checked={q.is_published} className="pointer-events-none scale-75" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(q)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete self-check?</AlertDialogTitle>
                          <AlertDialogDescription>This will permanently delete "{q.title}" and all its questions. This action cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(q.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SelfChecks;
