import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { friendlyDbError } from '@/lib/db-error';
import { FPlus, FTrash, FPencil, FClose, FSave } from '@/components/icons/FreudIcons';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import ObservationStepper from '@/components/observations/ObservationStepper';
import ObservationHistory from '@/components/observations/ObservationHistory';

interface Questionnaire { id: string; title: string; description: string | null; is_published: boolean; created_at: string; repeat_interval: string | null; scoring_enabled: boolean; scoring_mode: string; score_ranges: ScoreRange[] | null; }
interface Question { id: string; question_text: string; question_type: string; options: string[] | null; sort_order: number; answer_scores: Record<string, number> | null; }
interface ScoreRange { min: number; max: number; label: string; description?: string; }

const SelfChecks = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
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
  const [formQuestions, setFormQuestions] = useState<{ id?: string; text: string; type: string; options: string; answerScores: Record<string, number> }[]>([{ text: '', type: 'text', options: '', answerScores: {} }]);
  const [formRepeat, setFormRepeat] = useState<string>('');
  const [formScoringEnabled, setFormScoringEnabled] = useState(false);
  const [formScoringMode, setFormScoringMode] = useState<string>('sum');
  const [formScoreRanges, setFormScoreRanges] = useState<ScoreRange[]>([]);

  const [saving, setSaving] = useState(false);
  const [obsRefreshKey, setObsRefreshKey] = useState(0);

  const fetchQuestionnaires = async () => {
    const { data } = await supabase.from('questionnaires').select('*').order('created_at', { ascending: false });
    setQuestionnaires((data ?? []) as unknown as Questionnaire[]);
  };

  useEffect(() => { fetchQuestionnaires(); }, []);

  const loadQuestions = async (qId: string) => {
    setSelectedQ(qId); setAnswers({});
    const { data } = await supabase.from('questionnaire_questions').select('*').eq('questionnaire_id', qId).order('sort_order');
    setQuestions((data ?? []).map(q => ({ ...q, options: q.options as string[] | null, answer_scores: q.answer_scores as Record<string, number> | null })));
  };

  const openCreate = () => { setEditingId(null); setFormTitle(''); setFormDesc(''); setFormPublished(false); setFormRepeat(''); setFormScoringEnabled(false); setFormScoringMode('sum'); setFormScoreRanges([]); setFormQuestions([{ text: '', type: 'text', options: '', answerScores: {} }]); setShowForm(true); };

  const openEdit = async (q: Questionnaire) => {
    setEditingId(q.id); setFormTitle(q.title); setFormDesc(q.description ?? ''); setFormPublished(q.is_published); setFormRepeat(q.repeat_interval ?? '');
    setFormScoringEnabled(q.scoring_enabled ?? false); setFormScoringMode(q.scoring_mode ?? 'sum'); setFormScoreRanges((q.score_ranges as ScoreRange[]) ?? []);
    const { data } = await supabase.from('questionnaire_questions').select('*').eq('questionnaire_id', q.id).order('sort_order');
    setFormQuestions((data ?? []).map(qq => ({ id: qq.id, text: qq.question_text, type: qq.question_type, options: qq.question_type === 'multiple_choice' && qq.options ? (qq.options as string[]).join(', ') : '', answerScores: (qq.answer_scores as Record<string, number>) ?? {} })));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user || !formTitle.trim()) return;
    setSaving(true);
    if (editingId) {
      const { error } = await supabase.from('questionnaires').update({ title: formTitle, description: formDesc || null, is_published: formPublished, repeat_interval: formRepeat || null, scoring_enabled: formScoringEnabled, scoring_mode: formScoringMode, score_ranges: formScoreRanges.length ? formScoreRanges : null } as any).eq('id', editingId);
      if (error) { toast.error(friendlyDbError(error)); setSaving(false); return; }
      await supabase.from('questionnaire_questions').delete().eq('questionnaire_id', editingId);
      const qRows = formQuestions.filter(nq => nq.text.trim()).map((nq, i) => ({ questionnaire_id: editingId, question_text: nq.text, question_type: nq.type, options: nq.type === 'multiple_choice' ? nq.options.split(',').map(s => s.trim()).filter(Boolean) : null, sort_order: i, answer_scores: formScoringEnabled && formScoringMode === 'weighted' ? nq.answerScores : null }));
      if (qRows.length) await supabase.from('questionnaire_questions').insert(qRows);
      toast.success(t.questionnaires_manage.questionnaireUpdated);
    } else {
      const { data: q, error } = await supabase.from('questionnaires').insert({ title: formTitle, description: formDesc || null, created_by: user.id, is_published: formPublished, repeat_interval: formRepeat || null, scoring_enabled: formScoringEnabled, scoring_mode: formScoringMode, score_ranges: formScoreRanges.length ? formScoreRanges : null } as any).select('id').single();
      if (error || !q) { toast.error(error ? friendlyDbError(error) : 'Failed'); setSaving(false); return; }
      const qRows = formQuestions.filter(nq => nq.text.trim()).map((nq, i) => ({ questionnaire_id: q.id, question_text: nq.text, question_type: nq.type, options: nq.type === 'multiple_choice' ? nq.options.split(',').map(s => s.trim()).filter(Boolean) : null, sort_order: i, answer_scores: formScoringEnabled && formScoringMode === 'weighted' ? nq.answerScores : null }));
      if (qRows.length) await supabase.from('questionnaire_questions').insert(qRows);
      toast.success(t.questionnaires_manage.questionnaireCreated);
    }
    setSaving(false); setShowForm(false); setEditingId(null); fetchQuestionnaires();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('questionnaire_questions').delete().eq('questionnaire_id', id);
    const { error } = await supabase.from('questionnaires').delete().eq('id', id);
    if (error) { toast.error(friendlyDbError(error)); return; }
    toast.success(t.questionnaires_manage.questionnaireDeleted); fetchQuestionnaires();
  };

  const togglePublished = async (q: Questionnaire) => {
    const { error } = await supabase.from('questionnaires').update({ is_published: !q.is_published }).eq('id', q.id);
    if (error) { toast.error(friendlyDbError(error)); return; }
    toast.success(q.is_published ? 'Unpublished' : 'Published'); fetchQuestionnaires();
  };

  const handleSubmitAnswers = async () => {
    if (!user || !selectedQ) return;
    setSubmitting(true);
    const { data: resp, error } = await supabase.from('questionnaire_responses').insert({ user_id: user.id, questionnaire_id: selectedQ }).select('id').single();
    if (error || !resp) { toast.error('Failed to submit'); setSubmitting(false); return; }
    const answerRows = Object.entries(answers).map(([question_id, answer]) => ({ response_id: resp.id, question_id, answer: JSON.stringify(answer) }));
    if (answerRows.length) await supabase.from('questionnaire_answers').insert(answerRows);
    toast.success(t.questionnaires_manage.completed); setSelectedQ(null); setAnswers({}); setSubmitting(false);
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
              <div className="flex items-center gap-2"><RadioGroupItem value="yes" id={`${q.id}-yes`} /><Label htmlFor={`${q.id}-yes`}>{t.yes}</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="no" id={`${q.id}-no`} /><Label htmlFor={`${q.id}-no`}>{t.no}</Label></div>
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
        return <Textarea value={val} onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))} rows={2} placeholder="" className="rounded-2xl" />;
    }
  };

  const questionnaireContent = (
    <>
      {isEditor && (
        <div className="flex justify-end mb-4">
          <Button size="sm" variant="outline" className="rounded-2xl" onClick={openCreate}>
            <FPlus className="h-4 w-4 mr-1" /> {t.create}
          </Button>
        </div>
      )}

      {showForm && isEditor && (
        <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4 animate-fade-in mb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {editingId ? t.questionnaires_manage.editQuestionnaire : t.questionnaires_manage.newQuestionnaire}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><FClose className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.questionnaires_manage.questionnaireTitle}</Label>
            <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder={t.questionnaires_manage.questionnaireTitle} className="rounded-2xl" />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.questionnaires_manage.description}</Label>
            <Textarea value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder={t.questionnaires_manage.description} rows={2} className="rounded-2xl" />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={formPublished} onCheckedChange={setFormPublished} />
            <Label className="text-sm">{t.published}</Label>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.questionnaires_manage.repeatInterval}</Label>
            <select value={formRepeat} onChange={e => setFormRepeat(e.target.value)}
              className="w-full border border-input rounded-2xl px-3 py-2 text-sm bg-background">
              <option value="">{t.questionnaires_manage.repeatOnce}</option>
              <option value="daily">{t.questionnaires_manage.repeatDaily}</option>
              <option value="weekly">{t.questionnaires_manage.repeatWeekly}</option>
              <option value="biweekly">{t.questionnaires_manage.repeatBiweekly}</option>
              <option value="monthly">{t.questionnaires_manage.repeatMonthly}</option>
              <option value="anytime">{t.questionnaires_manage.repeatAnytime}</option>
            </select>
          </div>
          {/* Scoring config */}
          <div className="space-y-3 border border-border rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <Switch checked={formScoringEnabled} onCheckedChange={setFormScoringEnabled} />
              <Label className="text-sm">{t.questionnaires_manage.scoringEnabled}</Label>
            </div>
            {formScoringEnabled && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.questionnaires_manage.scoringMode}</Label>
                  <select value={formScoringMode} onChange={e => setFormScoringMode(e.target.value)}
                    className="w-full border border-input rounded-2xl px-3 py-2 text-sm bg-background">
                    <option value="sum">{t.questionnaires_manage.scoringModeSum}</option>
                    <option value="weighted">{t.questionnaires_manage.scoringModeWeighted}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.questionnaires_manage.scoreRanges}</Label>
                  {formScoreRanges.map((sr, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input type="number" value={sr.min} onChange={e => { const c = [...formScoreRanges]; c[i] = { ...c[i], min: Number(e.target.value) }; setFormScoreRanges(c); }} placeholder={t.questionnaires_manage.scoreRangeMin} className="w-16 rounded-2xl text-xs" />
                      <span className="text-xs text-muted-foreground">–</span>
                      <Input type="number" value={sr.max} onChange={e => { const c = [...formScoreRanges]; c[i] = { ...c[i], max: Number(e.target.value) }; setFormScoreRanges(c); }} placeholder={t.questionnaires_manage.scoreRangeMax} className="w-16 rounded-2xl text-xs" />
                      <Input value={sr.label} onChange={e => { const c = [...formScoreRanges]; c[i] = { ...c[i], label: e.target.value }; setFormScoreRanges(c); }} placeholder={t.questionnaires_manage.scoreRangeLabel} className="flex-1 rounded-2xl text-xs" />
                      <Input value={sr.description ?? ''} onChange={e => { const c = [...formScoreRanges]; c[i] = { ...c[i], description: e.target.value }; setFormScoreRanges(c); }} placeholder={t.questionnaires_manage.scoreRangeDescription} className="flex-1 rounded-2xl text-xs" />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFormScoreRanges(r => r.filter((_, j) => j !== i))}><FTrash className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="rounded-2xl text-xs" onClick={() => setFormScoreRanges(r => [...r, { min: 0, max: 0, label: '', description: '' }])}><FPlus className="h-3 w-3 mr-1" /> {t.questionnaires_manage.addScoreRange}</Button>
                </div>
              </>
            )}
          </div>
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.questionnaires_manage.questions}</Label>
            {formQuestions.map((nq, i) => (
              <div key={i} className="border border-border rounded-2xl p-3 space-y-2">
                <div className="flex gap-2">
                  <Input value={nq.text} onChange={e => { const c = [...formQuestions]; c[i].text = e.target.value; setFormQuestions(c); }} placeholder={`${t.questionnaires_manage.questions} ${i + 1}`} className="flex-1 rounded-2xl" />
                  <select value={nq.type} onChange={e => { const c = [...formQuestions]; c[i].type = e.target.value; setFormQuestions(c); }}
                    className="border border-input rounded-2xl px-3 text-sm bg-background">
                    <option value="text">Text</option>
                    <option value="scale">Scale (1–5)</option>
                    <option value="yes_no">{t.yes}/{t.no}</option>
                    <option value="multiple_choice">Multiple Choice</option>
                  </select>
                  {formQuestions.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => setFormQuestions(q => q.filter((_, j) => j !== i))}><FTrash className="h-4 w-4" /></Button>
                  )}
                </div>
                {nq.type === 'multiple_choice' && (
                  <Input value={nq.options} onChange={e => { const c = [...formQuestions]; c[i].options = e.target.value; setFormQuestions(c); }} placeholder="Options (comma-separated)" className="text-xs rounded-2xl" />
                )}
                {/* Weighted answer scores */}
                {formScoringEnabled && formScoringMode === 'weighted' && nq.type !== 'text' && (
                  <div className="space-y-1 pt-1 border-t border-border/50">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.questionnaires_manage.answerScores}</Label>
                    <div className="flex flex-wrap gap-2">
                      {(nq.type === 'scale' ? ['1','2','3','4','5'] : nq.type === 'yes_no' ? ['yes','no'] : nq.options.split(',').map(s => s.trim()).filter(Boolean)).map(opt => (
                        <div key={opt} className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground">{opt}:</span>
                          <Input type="number" value={nq.answerScores[opt] ?? ''} onChange={e => { const c = [...formQuestions]; c[i].answerScores = { ...c[i].answerScores, [opt]: Number(e.target.value) }; setFormQuestions(c); }} className="w-14 h-7 rounded-xl text-xs" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="rounded-2xl" onClick={() => setFormQuestions(q => [...q, { text: '', type: 'text', options: '', answerScores: {} }])}>{t.questionnaires_manage.addQuestion}</Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="rounded-2xl" onClick={handleSave} disabled={saving}>
              <FSave className="h-4 w-4 mr-1" /> {saving ? t.saving : editingId ? t.update : t.create}
            </Button>
            <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => setShowForm(false)}>{t.cancel}</Button>
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
            <Button size="sm" className="rounded-2xl" onClick={handleSubmitAnswers} disabled={submitting}>{submitting ? t.questionnaires_manage.submitting : t.submit}</Button>
            <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => setSelectedQ(null)}>{t.cancel}</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {questionnaires.length === 0 ? (
            <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
              <p className="text-sm text-muted-foreground">{t.questionnaires_manage.noAvailable}</p>
            </div>
          ) : questionnaires.map(q => (
            <div key={q.id} className="bg-card/60 backdrop-blur border border-border rounded-3xl p-5 flex items-start gap-4">
              <button onClick={() => loadQuestions(q.id)} className="flex-1 text-left hover:opacity-80 transition-opacity min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold">{q.title}</span>
                  {!q.is_published && <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{t.draft}</span>}
                </div>
                {q.description && <p className="text-xs text-muted-foreground leading-relaxed">{q.description}</p>}
              </button>
              {isEditor && (
                <div className="flex gap-1 shrink-0 items-center">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePublished(q)} title={q.is_published ? 'Unpublish' : 'Publish'}>
                    <Switch checked={q.is_published} className="pointer-events-none scale-75" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(q)}><FPencil className="h-3.5 w-3.5" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><FTrash className="h-3.5 w-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.selfChecks.deleteConfirmTitle}</AlertDialogTitle>
                        <AlertDialogDescription>{t.selfChecks.deleteConfirmDesc.replace('{title}', q.title)}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(q.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t.delete}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{t.selfChecks.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.selfChecks.subtitle}</p>
        </div>

        <Tabs defaultValue="questionnaires" className="w-full">
          <TabsList className="rounded-2xl bg-card/60 backdrop-blur border border-border w-full">
            <TabsTrigger value="questionnaires" className="rounded-xl flex-1 text-xs">{t.observations.tabQuestionnaires}</TabsTrigger>
            <TabsTrigger value="observations" className="rounded-xl flex-1 text-xs">{t.observations.tabObservations}</TabsTrigger>
          </TabsList>

          <TabsContent value="questionnaires" className="mt-4">
            {questionnaireContent}
          </TabsContent>

          <TabsContent value="observations" className="mt-4 space-y-6">
            <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
              <ObservationStepper onLogged={() => setObsRefreshKey(k => k + 1)} />
            </div>
            <ObservationHistory refreshKey={obsRefreshKey} />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default SelfChecks;
