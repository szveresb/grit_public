import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { FPlus, FTrash, FClose, FSave } from '@/components/icons/FreudIcons';

interface Study {
  id: string;
  survey_id: string;
  source_type: string;
  title: string;
  authors: string | null;
  year: number | null;
  citation_string: string | null;
  storage_path: string | null;
  doi: string | null;
  url: string | null;
  key_findings: string | null;
  status: string;
  created_at: string;
}

interface SurveyStudiesManagerProps {
  surveyId: string;
}

export default function SurveyStudiesManager({ surveyId }: SurveyStudiesManagerProps) {
  const { t } = useLanguage();
  const [studies, setStudies] = useState<Study[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [sourceType, setSourceType] = useState<'pdf' | 'doi' | 'manual'>('pdf');
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [year, setYear] = useState<number | ''>('');
  const [citation, setCitation] = useState('');
  const [doi, setDoi] = useState('');
  const [url, setUrl] = useState('');
  const [keyFindings, setKeyFindings] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fetchingMetadata, setFetchingMetadata] = useState(false);

  const fetchStudies = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('survey_studies')
        .select('*')
        .eq('survey_id', surveyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudies((data as Study[]) || []);
    } catch (err: any) {
      console.error('Error fetching studies:', err);
      toast.error(err.message || 'Failed to load studies.');
    } finally {
      setLoading(false);
    }
  }, [surveyId]);

  useEffect(() => {
    if (surveyId) {
      fetchStudies();
    }
  }, [surveyId, fetchStudies]);

  const handleDoiLookup = async () => {
    const cleanDoi = doi.trim().replace(/^https?:\/\/doi\.org\//, '');
    if (!cleanDoi) {
      toast.error(t.questionnaires_manage.studyInvalidDoi);
      return;
    }

    try {
      setFetchingMetadata(true);
      const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`);
      if (!response.ok) throw new Error('DOI not found');
      
      const data = await response.json();
      const work = data.message;

      const fetchedTitle = work.title?.[0] || '';
      const fetchedAuthors = work.author?.map((a: any) => `${a.given || ''} ${a.family || ''}`.trim()).join(', ') || '';
      const fetchedYear = work.created?.['date-parts']?.[0]?.[0] || work.issued?.['date-parts']?.[0]?.[0] || '';
      const fetchedUrl = work.URL || `https://doi.org/${cleanDoi}`;
      
      let containerTitle = work['container-title']?.[0] || '';
      const generatedCitation = `${fetchedAuthors || 'Unknown'} (${fetchedYear || 'n.d.'}). ${fetchedTitle}.${containerTitle ? ` ${containerTitle}.` : ''}`;

      setTitle(fetchedTitle);
      setAuthors(fetchedAuthors);
      setYear(fetchedYear ? Number(fetchedYear) : '');
      setUrl(fetchedUrl);
      setCitation(generatedCitation);
      toast.success('Metadata fetched successfully');
    } catch (err) {
      console.error('CrossRef error:', err);
      toast.error(t.questionnaires_manage.studyMetadataFetchError);
    } finally {
      setFetchingMetadata(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 20 * 1024 * 1024) {
        toast.error(t.questionnaires_manage.studyFileTooLarge);
        e.target.value = '';
        return;
      }
      setFile(selectedFile);
      if (!title) {
        // Pre-fill title with file name without extension
        setTitle(selectedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const resetForm = () => {
    setTitle('');
    setAuthors('');
    setYear('');
    setCitation('');
    setDoi('');
    setUrl('');
    setKeyFindings('');
    setFile(null);
    setShowAddForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setSubmitting(true);
      let storagePath = null;

      if (sourceType === 'pdf') {
        if (!file) {
          toast.error('Please select a file to upload.');
          setSubmitting(false);
          return;
        }

        const fileExt = file.name.split('.').pop();
        const uniqueFileName = `${surveyId}/${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('survey-studies')
          .upload(uniqueFileName, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;
        storagePath = uniqueFileName;
      }

      const { error: insertError } = await supabase
        .from('survey_studies')
        .insert({
          survey_id: surveyId,
          source_type: sourceType,
          title: title.trim(),
          authors: authors.trim() || null,
          year: year ? Number(year) : null,
          citation_string: citation.trim() || null,
          storage_path: storagePath,
          doi: sourceType === 'doi' ? doi.trim() || null : null,
          url: url.trim() || null,
          key_findings: keyFindings.trim() || null,
          status: sourceType === 'manual' ? 'indexed' : 'pending' // pending until background extraction happens
        });

      if (insertError) throw insertError;

      toast.success(t.questionnaires_manage.studyAdded);
      resetForm();
      fetchStudies();
    } catch (err: any) {
      console.error('Error saving study:', err);
      toast.error(err.message || 'Failed to save study.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (study: Study) => {
    if (!window.confirm(t.questionnaires_manage.studyDeleteConfirm)) return;

    try {
      if (study.storage_path) {
        // Delete storage file first
        const { error: storageError } = await supabase.storage
          .from('survey-studies')
          .remove([study.storage_path]);
        if (storageError) {
          console.warn('Storage file deletion warning:', storageError);
        }
      }

      const { error } = await supabase
        .from('survey_studies')
        .delete()
        .eq('id', study.id);

      if (error) throw error;

      toast.success(t.questionnaires_manage.studyDeleted);
      fetchStudies();
    } catch (err: any) {
      console.error('Error deleting study:', err);
      toast.error(err.message || 'Failed to delete study.');
    }
  };

  return (
    <div className="space-y-4 border border-border/60 rounded-2xl p-4 bg-card/25">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-foreground">
            {t.questionnaires_manage.studiesSection}
          </h4>
          <p className="text-[11px] text-muted-foreground">
            {t.questionnaires_manage.studiesHint}
          </p>
        </div>
        {!showAddForm && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-2xl text-xs gap-1"
            onClick={() => setShowAddForm(true)}
          >
            <FPlus className="h-3 w-3" />
            {t.questionnaires_manage.addStudy}
          </Button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="border border-border/80 rounded-2xl p-4 bg-background space-y-4 animate-fade-in">
          <div className="flex items-center justify-between border-b border-border/50 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.questionnaires_manage.addStudy}
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

          {/* Source Type Selector */}
          <div className="flex gap-2">
            {(['pdf', 'doi', 'manual'] as const).map((type) => (
              <button
                key={type}
                type="button"
                className={`flex-1 py-1.5 px-3 rounded-full text-xs font-medium border transition-all ${
                  sourceType === type
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/50'
                }`}
                onClick={() => {
                  setSourceType(type);
                  resetForm();
                  setShowAddForm(true);
                  setSourceType(type);
                }}
              >
                {type === 'pdf'
                  ? t.questionnaires_manage.studySourcePdf
                  : type === 'doi'
                  ? t.questionnaires_manage.studySourceDoi
                  : t.questionnaires_manage.studySourceManual}
              </button>
            ))}
          </div>

          {/* Form Fields based on Source Type */}
          {sourceType === 'doi' && (
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t.questionnaires_manage.studyDoi}
              </Label>
              <div className="flex gap-2">
                <Input
                  value={doi}
                  onChange={(e) => setDoi(e.target.value)}
                  placeholder={t.questionnaires_manage.studyDoiPlaceholder}
                  className="rounded-2xl text-xs flex-1"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-2xl text-xs shrink-0"
                  onClick={handleDoiLookup}
                  disabled={fetchingMetadata}
                >
                  {fetchingMetadata ? t.questionnaires_manage.studyFetchingMetadata : 'Lookup'}
                </Button>
              </div>
            </div>
          )}

          {sourceType === 'pdf' && (
            <div className="space-y-2">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t.questionnaires_manage.studyPdfUpload}
              </Label>
              <Input
                type="file"
                accept="application/pdf,text/plain"
                onChange={handleFileChange}
                className="rounded-2xl text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                {t.questionnaires_manage.studyPdfHint}
              </p>
            </div>
          )}

          {/* Common Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t.questionnaires_manage.studyTitle}
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="rounded-2xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t.questionnaires_manage.studyYear}
              </Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value ? Number(e.target.value) : '')}
                className="rounded-2xl text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {t.questionnaires_manage.studyAuthors}
              </Label>
              <Input
                value={authors}
                onChange={(e) => setAuthors(e.target.value)}
                className="rounded-2xl text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="rounded-2xl text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t.questionnaires_manage.studyCitation}
            </Label>
            <Input
              value={citation}
              onChange={(e) => setCitation(e.target.value)}
              placeholder="e.g. Author A. (Year). Title. Journal."
              className="rounded-2xl text-xs"
            />
          </div>

          {/* Key Findings field - vital for manual, useful for others */}
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {t.questionnaires_manage.studyKeyFindings} {sourceType === 'manual' && '*'}
            </Label>
            <Textarea
              value={keyFindings}
              onChange={(e) => setKeyFindings(e.target.value)}
              required={sourceType === 'manual'}
              placeholder={t.questionnaires_manage.studyKeyFindingsPlaceholder}
              rows={3}
              className="rounded-2xl text-xs"
            />
          </div>

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
              {submitting ? t.saving : t.create}
            </Button>
          </div>
        </form>
      )}

      {/* Studies List */}
      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-4">{t.loading}</p>
      ) : studies.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          {t.questionnaires_manage.noStudies}
        </p>
      ) : (
        <div className="space-y-2">
          {studies.map((study) => (
            <div
              key={study.id}
              className="flex items-center justify-between p-3 border border-border/40 rounded-xl bg-background/50 hover:bg-background/80 transition-colors"
            >
              <div className="flex-1 min-w-0 mr-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-foreground truncate max-w-[250px] md:max-w-[400px]">
                    {study.title}
                  </span>
                  <span className="rounded-full bg-accent/40 px-2 py-0.5 text-[9px] font-medium text-muted-foreground uppercase">
                    {study.source_type}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-semibold border ${
                      study.status === 'indexed'
                        ? 'bg-primary/10 border-primary/20 text-primary'
                        : study.status === 'error'
                        ? 'bg-destructive/10 border-destructive/20 text-destructive'
                        : 'bg-muted border-border text-muted-foreground'
                    }`}
                  >
                    {study.status === 'indexed'
                      ? t.questionnaires_manage.studyStatusIndexed
                      : study.status === 'error'
                      ? t.questionnaires_manage.studyStatusError
                      : t.questionnaires_manage.studyStatusPending}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">
                  {study.citation_string ||
                    `${study.authors || 'Unknown'} (${study.year || 'n.d.'})`}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => handleDelete(study)}
              >
                <FTrash className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
