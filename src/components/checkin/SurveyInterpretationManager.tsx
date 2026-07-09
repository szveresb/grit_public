import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { FPlus, FTrash, FClose, FSave, FSparkles } from '@/components/icons/FreudIcons';

interface Interpretation {
  id: string;
  survey_id: string;
  score_min: number | null;
  score_max: number | null;
  body_hu: string;
  body_en: string;
  citations: string[];
  generated_by: 'manual' | 'ai';
  created_at: string;
}

interface Study {
  id: string;
  title: string;
  authors: string | null;
  year: number | null;
  citation_string: string | null;
}

interface SurveyInterpretationManagerProps {
  surveyId: string;
}

export default function SurveyInterpretationManager({ surveyId }: SurveyInterpretationManagerProps) {
  const { t } = useLanguage();
  const [interpretations, setInterpretations] = useState<Interpretation[]>([]);
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scoreMin, setScoreMin] = useState<number | ''>('');
  const [scoreMax, setScoreMax] = useState<number | ''>('');
  const [bodyEn, setBodyEn] = useState('');
  const [bodyHu, setBodyHu] = useState('');
  const [selectedCitations, setSelectedCitations] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch interpretations
      const { data: interData, error: interError } = await supabase
        .from('survey_interpretations')
        .select('*')
        .eq('survey_id', surveyId)
        .order('score_min', { ascending: true, nullsFirst: true });

      if (interError) throw interError;

      // Fetch studies for citations selection
      const { data: studyData, error: studyError } = await supabase
        .from('survey_studies')
        .select('id, title, authors, year, citation_string')
        .eq('survey_id', surveyId);

      if (studyError) throw studyError;

      setInterpretations((interData as Interpretation[]) || []);
      setStudies((studyData as Study[]) || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      toast.error(err.message || 'Failed to load interpretations.');
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    if (surveyId) {
      fetchData();
    }
  }, [surveyId, fetchData]);

  const handleAiGenerate = async () => {
    if (studies.length === 0) {
      toast.error('Please attach at least one study before generating interpretations.');
      return;
    }
    if (!window.confirm(t.questionnaires_manage.generateAiConfirm)) return;

    try {
      setGenerating(true);
      const { data, error } = await supabase.functions.invoke('generate-interpretations', {
        body: { surveyId },
      });

      if (error) throw error;

      toast.success('Interpretations generated successfully.');
      fetchData();
    } catch (err: any) {
      console.error('AI Generation error:', err);
      toast.error(err.message || 'AI generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCitationToggle = (studyId: string) => {
    setSelectedCitations((prev) =>
      prev.includes(studyId) ? prev.filter((id) => id !== studyId) : [...prev, studyId]
    );
  };

  const resetForm = () => {
    setEditingId(null);
    setScoreMin('');
    setScoreMax('');
    setBodyEn('');
    setBodyHu('');
    setSelectedCitations([]);
    setShowAddForm(false);
  };

  const handleEdit = (inter: Interpretation) => {
    setEditingId(inter.id);
    setScoreMin(inter.score_min !== null ? inter.score_min : '');
    setScoreMax(inter.score_max !== null ? inter.score_max : '');
    setBodyEn(inter.body_en);
    setBodyHu(inter.body_hu);
    setSelectedCitations(inter.citations || []);
    setShowAddForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bodyEn.trim() || !bodyHu.trim()) {
      toast.error('Both English and Hungarian texts are required.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        survey_id: surveyId,
        score_min: scoreMin === '' ? null : Number(scoreMin),
        score_max: scoreMax === '' ? null : Number(scoreMax),
        body_en: bodyEn.trim(),
        body_hu: bodyHu.trim(),
        citations: selectedCitations,
        generated_by: 'manual' as const,
      };

      if (editingId) {
        const { error } = await supabase
          .from('survey_interpretations')
          .update(payload)
          .eq('id', editingId);

        if (error) throw error;
        toast.success(t.questionnaires_manage.interpretationAdded);
      } else {
        const { error } = await supabase
          .from('survey_interpretations')
          .insert(payload);

        if (error) throw error;
        toast.success(t.questionnaires_manage.interpretationAdded);
      }

      resetForm();
      fetchData();
    } catch (err: any) {
      console.error('Error saving interpretation:', err);
      toast.error(err.message || 'Failed to save interpretation.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t.questionnaires_manage.interpretationDeleteConfirm)) return;

    try {
      const { error } = await supabase
        .from('survey_interpretations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success(t.questionnaires_manage.interpretationDeleted);
      fetchData();
    } catch (err: any) {
      console.error('Error deleting interpretation:', err);
      toast.error(err.message || 'Failed to delete interpretation.');
    }
  };

  return (
    <div className="space-y-4 border border-border/60 rounded-2xl p-4 bg-card/25 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            {t.questionnaires_manage.interpretationsSection}
          </h4>
          <p className="text-[11px] text-muted-foreground">
            {t.questionnaires_manage.interpretationsHint}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-2xl text-xs gap-1 border-primary/40 text-primary hover:bg-primary/5"
            onClick={handleAiGenerate}
            disabled={generating || studies.length === 0}
          >
            <FSparkles className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
            {generating ? t.questionnaires_manage.generatingAi : t.questionnaires_manage.generateAi}
          </Button>
          {!showAddForm && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-2xl text-xs gap-1"
              onClick={() => setShowAddForm(true)}
            >
              <FPlus className="h-3 w-3" />
              {t.questionnaires_manage.addInterpretation}
            </Button>
          )}
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="border border-border/80 rounded-2xl p-4 bg-background space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {editingId ? t.update : t.questionnaires_manage.addInterpretation}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full"
              onClick={resetForm}
            >
              <FClose className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Score Range Inputs */}
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t.questionnaires_manage.scoreBandRange}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={scoreMin}
                onChange={(e) => setScoreMin(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={t.questionnaires_manage.scoreRangeMin}
                className="w-24 rounded-2xl text-xs"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <Input
                type="number"
                value={scoreMax}
                onChange={(e) => setScoreMax(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder={t.questionnaires_manage.scoreRangeMax}
                className="w-24 rounded-2xl text-xs"
              />
              <span className="text-[10px] text-muted-foreground ml-2">
                ({t.questionnaires_manage.generalNote})
              </span>
            </div>
          </div>

          {/* Text Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t.questionnaires_manage.bodyEn}
              </Label>
              <Textarea
                value={bodyEn}
                onChange={(e) => setBodyEn(e.target.value)}
                required
                rows={4}
                className="rounded-2xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t.questionnaires_manage.bodyHu}
              </Label>
              <Textarea
                value={bodyHu}
                onChange={(e) => setBodyHu(e.target.value)}
                required
                rows={4}
                className="rounded-2xl text-xs"
              />
            </div>
          </div>

          {/* Citations Multi-select */}
          {studies.length > 0 && (
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t.questionnaires_manage.citations}
              </Label>
              <div className="border border-border/80 rounded-2xl p-3 bg-muted/10 max-h-40 overflow-y-auto space-y-2">
                {studies.map((study) => (
                  <label key={study.id} className="flex items-start gap-2.5 text-xs text-foreground cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={selectedCitations.includes(study.id)}
                      onChange={() => handleCitationToggle(study.id)}
                      className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{study.title}</p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {study.citation_string || `${study.authors || 'Unknown'} (${study.year || 'n.d.'})`}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-2xl text-xs"
              onClick={resetForm}
            >
              {t.questionnaires_manage.studyCancel}
            </Button>
            <Button
              type="submit"
              size="sm"
              className="rounded-2xl text-xs gap-1"
              disabled={submitting}
            >
              <FSave className="h-3 w-3" />
              {submitting ? t.saving : editingId ? t.update : t.create}
            </Button>
          </div>
        </form>
      )}

      {/* Interpretations List */}
      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-4">{t.loading}</p>
      ) : interpretations.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          {t.questionnaires_manage.noInterpretations}
        </p>
      ) : (
        <div className="space-y-3">
          {interpretations.map((inter) => (
            <div
              key={inter.id}
              className="border border-border/40 rounded-xl bg-background/50 p-3 hover:bg-background/80 transition-colors space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-foreground">
                    {inter.score_min !== null && inter.score_max !== null
                      ? `${t.questionnaires_manage.scoreBandRange}: ${inter.score_min}–${inter.score_max}`
                      : t.questionnaires_manage.generalInterpretation}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase border ${
                    inter.generated_by === 'ai'
                      ? 'bg-primary/10 border-primary/20 text-primary'
                      : 'bg-muted border-border text-muted-foreground'
                  }`}>
                    {inter.generated_by}
                  </span>
                  {inter.citations && inter.citations.length > 0 && (
                    <span className="rounded-full bg-accent/40 px-2 py-0.5 text-[9px] font-medium text-muted-foreground">
                      {inter.citations.length} cited
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2.5 rounded-full text-[11px]"
                    onClick={() => handleEdit(inter)}
                  >
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(inter.id)}
                  >
                    <FTrash className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs border-t border-border/30 pt-2 text-muted-foreground leading-relaxed">
                <div>
                  <span className="font-semibold text-[10px] uppercase text-foreground/75 block">EN</span>
                  <p className="line-clamp-2">{inter.body_en}</p>
                </div>
                <div>
                  <span className="font-semibold text-[10px] uppercase text-foreground/75 block">HU</span>
                  <p className="line-clamp-2">{inter.body_hu}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
