import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
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
import SurveyStudiesManager from '@/components/checkin/SurveyStudiesManager';
import SurveyInterpretationManager from '@/components/checkin/SurveyInterpretationManager';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { friendlyDbError } from '@/lib/db-error';
import { FPlus, FTrash, FPencil, FClose, FSave, FList, FClipboardCheck, FClock, FChevronDown } from '@/components/icons/FreudIcons';
import type { Database, Json } from '@/integrations/supabase/types';
import { type LogicRule, type QuestionWithLogic } from '@/lib/logic-engine';
import { validateLogicRules } from '@/lib/logic-validation';
import { FALLBACK_QUESTIONNAIRE_CATEGORIES, isMissingQuestionnaireCategorySchema, getFallbackQuestionnaireCategory } from '@/lib/questionnaire-category-schema';
import { getQuestionnaireCategoryErrorMessage } from '@/lib/questionnaire-category-ui';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Category {
  id: string;
  key: string;
  name_hu: string;
  name_en: string;
  description_hu?: string | null;
  description_en?: string | null;
  is_active: boolean;
  sort_order: number;
}

type Questionnaire = Omit<
  Database['public']['Tables']['questionnaires']['Row'],
  'category_id'
> & { 
  category_id?: string | null;
  score_ranges: ScoreRange[] | null;
  category?: Category | null;
};
type Question = Database['public']['Tables']['questionnaire_questions']['Row'] & { 
  options: string[] | null; 
  answer_scores: Record<string, number> | null; 
  options_localized: Record<string, string> | null; 
};
interface ScoreRange { min: number; max: number; label: string; description?: string; }
interface Subscale {
  id: string;
  name: {
    hu: string;
    en: string;
  };
  type: string;
  score_ranges?: {
    min: number;
    max: number;
    label: {
      hu: string;
      en: string;
    };
    description?: {
      hu?: string;
      en?: string;
    };
  }[];
}

type AdminStatusFilter = 'all' | 'published' | 'draft';
type AdminSortMode = 'recent' | 'alphabetical';

const SelfChecks = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const { hasAnyRole } = useUserRole();
  const isEditor = hasAnyRole('admin', 'editor');
  const location = useLocation();

  useEffect(() => {
    // Reset state when location changes (e.g., clicking sidebar link)
    setSelectedQ(null);
    setShowForm(false);
    setEditingId(null);
  }, [location]);
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
  const [formQuestions, setFormQuestions] = useState<{ id?: string; text: string; type: string; options: string; answerScores: Record<string, number>; scaleMin: number; scaleMax: number; scaleLabels: Record<string, string>; reverseScored: boolean; excludeFromScoring: boolean; logicRules: LogicRule[]; subscaleIds: string[] }[]>([{ text: '', type: 'text', options: '', answerScores: {}, scaleMin: 1, scaleMax: 5, scaleLabels: {}, reverseScored: false, excludeFromScoring: false, logicRules: [], subscaleIds: [] }]);
  const [formRepeat, setFormRepeat] = useState<string>('');
  const [formScoringEnabled, setFormScoringEnabled] = useState(false);
  const [formScoringMode, setFormScoringMode] = useState<string>('sum');
  const [formScoreRanges, setFormScoreRanges] = useState<ScoreRange[]>([]);
  const [formInterpretationProfile, setFormInterpretationProfile] = useState<string>('');
  const [formSubscales, setFormSubscales] = useState<Subscale[]>([]);
  const [subscaleEditMode, setSubscaleEditMode] = useState<'form' | 'json'>('form');
  const [rawSubscalesJson, setRawSubscalesJson] = useState('[]');
  const [subscaleJsonError, setSubscaleJsonError] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [categorySchemaAvailable, setCategorySchemaAvailable] = useState(true);
  const [adminStatusFilter, setAdminStatusFilter] = useState<AdminStatusFilter>('all');
  const [adminCategoryFilter, setAdminCategoryFilter] = useState<string>('all');
  const [adminFrequencyFilter, setAdminFrequencyFilter] = useState<string>('all');
  const [adminSortMode, setAdminSortMode] = useState<AdminSortMode>('recent');
  const [formCategory, setFormCategory] = useState<string>('');
  const [showCategoryEditor, setShowCategoryEditor] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catKey, setCatKey] = useState('');
  const [catNameHu, setCatNameHu] = useState('');
  const [catNameEn, setCatNameEn] = useState('');
  const [catDescHu, setCatDescHu] = useState('');
  const [catDescEn, setCatDescEn] = useState('');
  const [catSortOrder, setCatSortOrder] = useState(0);
  const [catIsActive, setCatIsActive] = useState(true);
  const [savingCategory, setSavingCategory] = useState(false);

  const [saving, setSaving] = useState(false);
  const [mockEditorAnswers, setMockEditorAnswers] = useState<Record<string, string>>({});

  const getSkippedQuestionsForRule = (sourceIndex: number, rule: LogicRule) => {
    if (rule.action === 'skip_to_end') {
      return formQuestions.slice(sourceIndex + 1).filter(q => q.type !== 'text' && q.text.trim());
    } else if (rule.action === 'jump_to' && rule.target_question_id) {
      const targetIndex = formQuestions.findIndex(q => q.id === rule.target_question_id);
      if (targetIndex > sourceIndex) {
        return formQuestions.slice(sourceIndex + 1, targetIndex).filter(q => q.type !== 'text' && q.text.trim());
      }
    }
    return [];
  };

  const handleRuleTargetChange = (questionIndex: number, ruleIndex: number, action: 'jump_to' | 'skip_to_end', targetQuestionId?: string) => {
    const c = [...formQuestions];
    const oldRule = c[questionIndex].logicRules[ruleIndex];
    const tempRule = {
      ...oldRule,
      action,
      target_question_id: targetQuestionId
    };
    
    const skippedQuestions = getSkippedQuestionsForRule(questionIndex, tempRule);
    const skippedIds = new Set(skippedQuestions.map(q => q.id).filter(Boolean) as string[]);
    
    const prunedAnswers: Record<string, string> = {};
    if (oldRule.synthetic_skipped_answers) {
      Object.entries(oldRule.synthetic_skipped_answers).forEach(([qId, val]) => {
        if (skippedIds.has(qId)) {
          prunedAnswers[qId] = val;
        }
      });
    }
    
    c[questionIndex].logicRules = [...c[questionIndex].logicRules];
    c[questionIndex].logicRules[ruleIndex] = {
      ...tempRule,
      synthetic_skipped_answers: Object.keys(prunedAnswers).length > 0 ? prunedAnswers : undefined
    };
    setFormQuestions(c);
  };

  const handleSyntheticAnswerChange = (questionIndex: number, ruleIndex: number, skippedQuestionId: string, value: string) => {
    const c = [...formQuestions];
    c[questionIndex].logicRules = [...c[questionIndex].logicRules];
    const rule = c[questionIndex].logicRules[ruleIndex];
    const currentAnswers = { ...rule.synthetic_skipped_answers };
    
    if (value === "") {
      delete currentAnswers[skippedQuestionId];
    } else {
      currentAnswers[skippedQuestionId] = value;
    }
    
    c[questionIndex].logicRules[ruleIndex] = {
      ...rule,
      synthetic_skipped_answers: Object.keys(currentAnswers).length > 0 ? currentAnswers : undefined
    };
    setFormQuestions(c);
  };

  const fetchCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('questionnaire_categories')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('key', { ascending: true });
    if (error) {
      if (isMissingQuestionnaireCategorySchema(error)) {
        setCategorySchemaAvailable(false);
        setCategories(FALLBACK_QUESTIONNAIRE_CATEGORIES as Category[]);
        return;
      }
      console.error('Error fetching categories:', error);
      toast.error(getQuestionnaireCategoryErrorMessage(error));
      setCategories([]);
    } else {
      setCategorySchemaAvailable(true);
      setCategories((data ?? []) as unknown as Category[]);
    }
  }, []);

  const fetchQuestionnaires = useCallback(async () => {
    const result = await supabase
      .from('questionnaires')
      .select('*, category:questionnaire_categories(id, key, name_hu, name_en, description_hu, description_en, is_active, sort_order)')
      .order('created_at', { ascending: false });

    if (result.error && isMissingQuestionnaireCategorySchema(result.error)) {
      const fallbackResult = await supabase
        .from('questionnaires')
        .select('*')
        .order('created_at', { ascending: false });

      if (fallbackResult.error) {
        console.error('Error fetching questionnaires:', fallbackResult.error);
        toast.error('Failed to load questionnaires');
      } else {
        const mapped = (fallbackResult.data ?? []).map((q) => ({
          ...q,
          category: getFallbackQuestionnaireCategory(q.title) as Category | null,
        }));
        setQuestionnaires(mapped as unknown as Questionnaire[]);
      }
    } else {
      if (result.error) {
        console.error('Error fetching questionnaires:', result.error);
        toast.error('Failed to load questionnaires');
      }
      setQuestionnaires((result.data ?? []) as unknown as Questionnaire[]);
    }
  }, []);

  useEffect(() => {
    fetchQuestionnaires();
    fetchCategories();
  }, [fetchQuestionnaires, fetchCategories]);

  const getLocalizedCategoryName = (category?: Category | null) => {
    if (!category) {
      return t.questionnaires_manage.uncategorized;
    }

    return lang === 'en' ? category.name_en : category.name_hu;
  };

  const getRepeatIntervalLabel = (repeatInterval?: string | null) => {
    switch (repeatInterval) {
      case 'daily':
        return t.questionnaires_manage.repeatDaily;
      case 'weekly':
        return t.questionnaires_manage.repeatWeekly;
      case 'biweekly':
        return t.questionnaires_manage.repeatBiweekly;
      case 'monthly':
        return t.questionnaires_manage.repeatMonthly;
      case 'anytime':
        return t.questionnaires_manage.repeatAnytime;
      default:
        return t.questionnaires_manage.repeatOnce;
    }
  };

  const formatAdminDate = (value?: string | null) => {
    if (!value) {
      return t.questionnaires_manage.metaNever;
    }

    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'hu-HU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(value));
  };

  const getQuestionnaireDescriptionPreview = (description?: string | null) => {
    if (!description?.trim()) {
      return t.questionnaires_manage.adminNoDescription;
    }

    return description.replace(/\s+/g, ' ').trim();
  };

  const adminCategoryOptions = categories.filter(
    (category) =>
      category.is_active || questionnaires.some((questionnaire) => questionnaire.category?.id === category.id)
  );

  const adminAvailableFrequencies = Array.from(
    new Set(
      questionnaires
        .map((questionnaire) => questionnaire.repeat_interval ?? 'once')
        .filter((value) => value !== 'all')
    )
  );

  const filteredAdminQuestionnaires = questionnaires
    .filter((questionnaire) => {
      if (adminStatusFilter === 'published' && !questionnaire.is_published) {
        return false;
      }

      if (adminStatusFilter === 'draft' && questionnaire.is_published) {
        return false;
      }

      if (adminFrequencyFilter !== 'all' && (questionnaire.repeat_interval ?? 'once') !== adminFrequencyFilter) {
        return false;
      }

      if (adminCategoryFilter === 'all') {
        return true;
      }

      return questionnaire.category?.key === adminCategoryFilter;
    })
    .sort((left, right) => {
      if (adminSortMode === 'alphabetical') {
        return left.title.localeCompare(right.title, lang === 'en' ? 'en' : 'hu');
      }

      const leftTime = new Date(left.updated_at ?? left.created_at ?? 0).getTime();
      const rightTime = new Date(right.updated_at ?? right.created_at ?? 0).getTime();
      return rightTime - leftTime;
    });

  const loadQuestions = async (qId: string) => {
    setSelectedQ(qId); setAnswers({});
    const { data } = await supabase.from('questionnaire_questions').select('*').eq('questionnaire_id', qId).order('sort_order');
    setQuestions((data ?? []).map(q => ({ 
      ...q, 
      options: q.options as string[] | null, 
      answer_scores: q.answer_scores as Record<string, number> | null, 
      options_localized: q.options_localized as Record<string, string> | null 
    })));
  };

  const handleRawSubscalesJsonChange = (val: string) => {
    setRawSubscalesJson(val);
    if (!val.trim()) {
      setFormSubscales([]);
      setSubscaleJsonError(null);
      return;
    }
    try {
      const parsed = JSON.parse(val);
      if (!Array.isArray(parsed)) {
        setSubscaleJsonError('Subscales must be a JSON array.');
        return;
      }
      for (const item of parsed) {
        if (typeof item !== 'object' || item === null) {
          setSubscaleJsonError('Each item in subscales must be an object.');
          return;
        }
        if (typeof item.id !== 'string') {
          setSubscaleJsonError('Each item must have a string "id".');
          return;
        }
        if (typeof item.name !== 'object' || item.name === null || typeof item.name.hu !== 'string' || typeof item.name.en !== 'string') {
          setSubscaleJsonError('Each item must have a "name" object with "hu" and "en" string properties.');
          return;
        }
        if (typeof item.type !== 'string') {
          setSubscaleJsonError('Each item must have a string "type".');
          return;
        }
        if (item.score_ranges !== undefined) {
          if (!Array.isArray(item.score_ranges)) {
            setSubscaleJsonError('If present, "score_ranges" must be an array.');
            return;
          }
          for (const r of item.score_ranges) {
            if (typeof r !== 'object' || r === null) {
              setSubscaleJsonError('Each score range must be an object.');
              return;
            }
            if (typeof r.min !== 'number' || typeof r.max !== 'number') {
              setSubscaleJsonError('Each score range must have numeric "min" and "max" fields.');
              return;
            }
            if (typeof r.label !== 'object' || r.label === null || typeof r.label.hu !== 'string' || typeof r.label.en !== 'string') {
              setSubscaleJsonError('Each score range must have a "label" object with "hu" and "en" string properties.');
              return;
            }
            if (r.description !== undefined) {
              if (typeof r.description !== 'object' || r.description === null || (r.description.hu !== undefined && typeof r.description.hu !== 'string') || (r.description.en !== undefined && typeof r.description.en !== 'string')) {
                setSubscaleJsonError('If present, "description" must be an object with "hu" and "en" string properties.');
                return;
              }
            }
          }
        }
      }
      setFormSubscales(parsed as Subscale[]);
      setSubscaleJsonError(null);
    } catch (e: any) {
      setSubscaleJsonError(`Syntax Error: ${e.message}`);
    }
  };

  const updateFormSubscales = (newSubscales: Subscale[]) => {
    setFormSubscales(newSubscales);
    setRawSubscalesJson(JSON.stringify(newSubscales, null, 2));
    setSubscaleJsonError(null);
  };

  const openCreate = () => {
    setEditingId(null);
    setFormTitle('');
    setFormDesc('');
    setFormPublished(false);
    setFormRepeat('');
    setFormCategory('');
    setFormScoringEnabled(false);
    setFormScoringMode('sum');
    setFormScoreRanges([]);
    setFormInterpretationProfile('');
    setFormSubscales([]);
    setRawSubscalesJson('[]');
    setSubscaleJsonError(null);
    setSubscaleEditMode('form');
    setMockEditorAnswers({});
    setFormQuestions([{
      id: crypto.randomUUID(),
      text: '',
      type: 'text',
      options: '',
      answerScores: {},
      scaleMin: 1,
      scaleMax: 5,
      scaleLabels: {},
      reverseScored: false,
      excludeFromScoring: false,
      logicRules: [],
      subscaleIds: []
    }]);
    setShowForm(true);
  };

  const openEdit = async (q: Questionnaire) => {
    setEditingId(q.id);
    setFormTitle(q.title);
    setFormDesc(q.description ?? '');
    setFormPublished(q.is_published);
    setFormRepeat(q.repeat_interval ?? '');
    setFormCategory(q.category_id ?? ''); // Story 4: Currently assigned category is preselected when editing
    setFormScoringEnabled(q.scoring_enabled ?? false);
    setFormScoringMode(q.scoring_mode ?? 'sum');
    setFormScoreRanges((q.score_ranges as ScoreRange[]) ?? []);
    setFormInterpretationProfile(q.interpretation_profile ?? '');
    setMockEditorAnswers({});

    const loadedSubscales = (q.subscales as unknown as Subscale[]) ?? [];
    setFormSubscales(loadedSubscales);
    setRawSubscalesJson(JSON.stringify(loadedSubscales, null, 2));
    setSubscaleJsonError(null);
    setSubscaleEditMode('form');

    const { data } = await supabase.from('questionnaire_questions').select('*').eq('questionnaire_id', q.id).order('sort_order');
    setFormQuestions((data ?? []).map(qq => {
      const opts = qq.options as string[] | null;
      let scaleMin = 1, scaleMax = 5;
      if (qq.question_type === 'scale' && opts && opts.length >= 2) {
        scaleMin = opts[0] !== undefined && opts[0] !== '' ? Number(opts[0]) : 1;
        scaleMax = opts[1] !== undefined && opts[1] !== '' ? Number(opts[1]) : 5;
      }
      const scores = (qq.answer_scores as Record<string, number>) ?? {};
      let isReverse = false;
      if (qq.question_type === 'scale' && Object.keys(scores).length > 0) {
        isReverse = true;
        for (let n = scaleMin; n <= scaleMax; n++) {
          if (scores[String(n)] !== (scaleMin + scaleMax) - n) { isReverse = false; break; }
        }
      }
      return {
        id: qq.id,
        text: qq.question_text,
        type: qq.question_type,
        options: qq.question_type === 'multiple_choice' && opts ? opts.join(', ') : '',
        answerScores: scores,
        scaleMin,
        scaleMax,
        scaleLabels: (qq.options_localized as Record<string, string>) ?? {},
        reverseScored: isReverse,
        excludeFromScoring: (qq as { exclude_from_scoring?: boolean }).exclude_from_scoring ?? false,
        logicRules: (qq.logic_rules as unknown as LogicRule[]) ?? [],
        subscaleIds: (qq.subscale_ids as string[]) ?? []
      };
    }));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!user || !formTitle.trim()) return;

    if (subscaleEditMode === 'json' && subscaleJsonError) {
      toast.error(t.errors?.validationError || 'Invalid subscales JSON format.');
      return;
    }

    setSaving(true);
    
    const validQuestions = formQuestions.filter(nq => nq.text.trim());
    if (formPublished && validQuestions.length === 0) {
      toast.error(t.errors?.validationError || 'Cannot publish a questionnaire without questions.');
      setSaving(false);
      return;
    }

    if (categorySchemaAvailable && formPublished && !formCategory) {
      toast.error(t.questionnaires_manage.noCategoryError);
      setSaving(false);
      return;
    }

    let finalSubscales: Subscale[] = [];
    if (formScoringEnabled) {
      if (subscaleEditMode === 'json') {
        try {
          finalSubscales = JSON.parse(rawSubscalesJson);
        } catch (e) {
          toast.error('Invalid subscales JSON');
          setSaving(false);
          return;
        }
      } else {
        finalSubscales = formSubscales;
      }

      if (formPublished) {
        for (const sub of finalSubscales) {
          const hasMapped = validQuestions.some(q => q.subscaleIds?.includes(sub.id));
          if (!hasMapped) {
            toast.error(lang === 'en' 
              ? `Subscale "${sub.name.en || sub.id}" must have at least one question associated with it before publishing.`
              : `A(z) "${sub.name.hu || sub.id}" rĂ©szskĂˇlĂˇhoz legalĂˇbb egy kĂ©rdĂ©st hozzĂˇ kell rendelni a kĂ¶zzĂ©tĂ©tel elĹ‘tt.`
            );
            setSaving(false);
            return;
          }
        }
      }
    }

    // Map form questions to QuestionWithLogic structure for validation
    const questionsForValidation: QuestionWithLogic[] = validQuestions.map((nq, idx) => ({
      id: nq.id || `temp-${idx}`,
      sort_order: idx,
      logic_rules: nq.logicRules,
      question_type: nq.type,
      options: nq.type === 'multiple_choice' ? nq.options.split(',').map(s => s.trim()).filter(Boolean) : nq.type === 'scale' ? [String(nq.scaleMin), String(nq.scaleMax)] : null,
      answer_scores: nq.answerScores,
      exclude_from_scoring: nq.excludeFromScoring,
    }));

    const validation = validateLogicRules(questionsForValidation);
    if (!validation.valid) {
      const firstErr = validation.errors[0];
      toast.error(`Validation Error (Q${firstErr.questionIndex + 1}): ${firstErr.message}`);
      setSaving(false);
      return;
    }

    if (editingId) {
      // Story 4: Saving a survey persists the selected category_id (update path)
      const questionnaireUpdatePayload = { title: formTitle, description: formDesc || null, is_published: formPublished, repeat_interval: formRepeat || null, scoring_enabled: formScoringEnabled, scoring_mode: formScoringMode, score_ranges: (formScoreRanges.length ? formScoreRanges : null) as unknown as Json, interpretation_profile: formInterpretationProfile || null, subscales: finalSubscales as unknown as Json, ...(categorySchemaAvailable ? { category_id: formCategory || null } : {}) };
      const { error } = await supabase.from('questionnaires').update(questionnaireUpdatePayload).eq('id', editingId);
      if (error) { toast.error(friendlyDbError(error)); setSaving(false); return; }
      await supabase.from('questionnaire_questions').delete().eq('questionnaire_id', editingId);
      const qRows = validQuestions.map((nq, i) => {
        let answerScores: Record<string, number> | null = null;
        if (formScoringEnabled && formScoringMode === 'weighted') answerScores = nq.answerScores;
        else if (formScoringEnabled && nq.reverseScored && nq.type === 'scale') answerScores = nq.answerScores;
        return { id: nq.id || crypto.randomUUID(), questionnaire_id: editingId, question_text: nq.text, question_type: nq.type, options: nq.type === 'multiple_choice' ? nq.options.split(',').map(s => s.trim()).filter(Boolean) : nq.type === 'scale' ? [String(nq.scaleMin), String(nq.scaleMax)] : null, sort_order: i, answer_scores: answerScores, options_localized: nq.type === 'scale' && Object.keys(nq.scaleLabels).length > 0 ? nq.scaleLabels : null, logic_rules: (nq.logicRules.length > 0 ? nq.logicRules : null) as unknown as Json, exclude_from_scoring: nq.excludeFromScoring, subscale_ids: nq.subscaleIds || [] };
      });
      if (qRows.length) {
        const { error: insertErr } = await supabase.from('questionnaire_questions').insert(qRows);
        if (insertErr) { toast.error(friendlyDbError(insertErr)); setSaving(false); return; }
      }
      toast.success(t.questionnaires_manage.questionnaireUpdated);
    } else {
      // Story 4: Saving a survey persists the selected category_id (insert path)
      const questionnaireInsertPayload = { title: formTitle, description: formDesc || null, created_by: user.id, is_published: formPublished, repeat_interval: formRepeat || null, scoring_enabled: formScoringEnabled, scoring_mode: formScoringMode, score_ranges: (formScoreRanges.length ? formScoreRanges : null) as unknown as Json, interpretation_profile: formInterpretationProfile || null, subscales: finalSubscales as unknown as Json, ...(categorySchemaAvailable ? { category_id: formCategory || null } : {}) };
      const { data: q, error } = await supabase.from('questionnaires').insert(questionnaireInsertPayload).select('id').single();
      if (error || !q) { toast.error(error ? friendlyDbError(error) : t.errors.genericFailure); setSaving(false); return; }
      const qRows = validQuestions.map((nq, i) => {
        let answerScores: Record<string, number> | null = null;
        if (formScoringEnabled && formScoringMode === 'weighted') answerScores = nq.answerScores;
        else if (formScoringEnabled && nq.reverseScored && nq.type === 'scale') answerScores = nq.answerScores;
        return { id: nq.id || crypto.randomUUID(), questionnaire_id: q.id, question_text: nq.text, question_type: nq.type, options: nq.type === 'multiple_choice' ? nq.options.split(',').map(s => s.trim()).filter(Boolean) : nq.type === 'scale' ? [String(nq.scaleMin), String(nq.scaleMax)] : null, sort_order: i, answer_scores: answerScores, options_localized: nq.type === 'scale' && Object.keys(nq.scaleLabels).length > 0 ? nq.scaleLabels : null, logic_rules: (nq.logicRules.length > 0 ? nq.logicRules : null) as unknown as Json, exclude_from_scoring: nq.excludeFromScoring, subscale_ids: nq.subscaleIds || [] };
      });
      if (qRows.length) {
        const { error: insertErr } = await supabase.from('questionnaire_questions').insert(qRows);
        if (insertErr) { toast.error(friendlyDbError(insertErr)); setSaving(false); return; }
      }
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
    const nextPublished = !q.is_published;
    if (categorySchemaAvailable && nextPublished && !q.category_id) {
      toast.error(t.questionnaires_manage.noCategoryError);
      return;
    }
    const { error } = await supabase.from('questionnaires').update({ is_published: nextPublished }).eq('id', q.id);
    if (error) { toast.error(friendlyDbError(error)); return; }
    toast.success(nextPublished ? t.questionnaires_manage.publishedToast : t.questionnaires_manage.unpublishedToast); fetchQuestionnaires();
  };

  const handleClone = async (q: Questionnaire) => {
    if (!user) return;
    // Clone the questionnaire (unpublished draft)
    const { data: cloned, error } = await supabase.from('questionnaires').insert({
      title: `${q.title} (copy)`,
      description: q.description,
      created_by: user.id,
      is_published: false,
      repeat_interval: q.repeat_interval,
      scoring_enabled: q.scoring_enabled,
      scoring_mode: q.scoring_mode,
      score_ranges: q.score_ranges,
      interpretation_profile: q.interpretation_profile,
      subscales: q.subscales,
      ...(categorySchemaAvailable ? { category_id: q.category_id ?? null } : {}),
    }).select('id').single();
    if (error || !cloned) { toast.error(error ? friendlyDbError(error) : t.errors.genericFailure); return; }
    // Clone questions
    const { data: origQuestions } = await supabase.from('questionnaire_questions').select('*').eq('questionnaire_id', q.id).order('sort_order');
    if (origQuestions && origQuestions.length > 0) {
      // Build a mapping from old question IDs to new ones for logic_rules target remapping
      const idMap = new Map<string, string>();
      const qRows = origQuestions.map(oq => {
        const newId = crypto.randomUUID();
        idMap.set(oq.id, newId);
        return {
          questionnaire_id: cloned.id,
          question_text: oq.question_text,
          question_type: oq.question_type,
          options: oq.options,
          sort_order: oq.sort_order,
          answer_scores: oq.answer_scores,
          options_localized: oq.options_localized,
          question_text_localized: oq.question_text_localized,
          exclude_from_scoring: (oq as { exclude_from_scoring?: boolean }).exclude_from_scoring ?? false,
          logic_rules: null as LogicRule[] | null, // placeholder, remapped below
          subscale_ids: oq.subscale_ids,
        };
      });
      // Remap logic_rules target IDs and synthetic skipped answer mappings to the new cloned question IDs
      origQuestions.forEach((oq, idx) => {
        const rules = oq.logic_rules as unknown as LogicRule[] | null;
        if (rules && rules.length > 0) {
          qRows[idx].logic_rules = rules.map(r => {
            const remappedRule: LogicRule = {
              ...r,
              target_question_id: r.target_question_id ? (idMap.get(r.target_question_id) ?? r.target_question_id) : r.target_question_id,
            };
            if (r.synthetic_skipped_answers) {
              const newSyntheticAnswers: Record<string, string> = {};
              Object.entries(r.synthetic_skipped_answers).forEach(([oldId, val]) => {
                const newId = idMap.get(oldId) ?? oldId;
                newSyntheticAnswers[newId] = val;
              });
              remappedRule.synthetic_skipped_answers = newSyntheticAnswers;
            }
            return remappedRule;
          }) as unknown as LogicRule[] | null;
        }
      });
      await supabase.from('questionnaire_questions').insert(qRows as unknown as Database['public']['Tables']['questionnaire_questions']['Insert'][]);
    }
    toast.success(t.questionnaires_manage.questionnaireCloned);
    fetchQuestionnaires();
  };

  const handleSubmitAnswers = async () => {
    if (!user || !selectedQ) return;
    setSubmitting(true);
    const { data: resp, error } = await supabase.from('questionnaire_responses').insert({ user_id: user.id, questionnaire_id: selectedQ }).select('id').single();
    if (error || !resp) { toast.error(t.errors.failedToSubmit); setSubmitting(false); return; }
    const answerRows = Object.entries(answers).map(([question_id, answer]) => ({ response_id: resp.id, question_id, answer: JSON.stringify(answer) }));
    if (answerRows.length) await supabase.from('questionnaire_answers').insert(answerRows);
    toast.success(t.questionnaires_manage.completed); setSelectedQ(null); setAnswers({}); setSubmitting(false);
  };

  const renderQuestionInput = (q: Question) => {
    const val = answers[q.id] ?? '';
    switch (q.question_type) {
      case 'scale': {
        const opts = q.options as string[] | null;
        const sMin = opts && opts.length >= 2 ? Number(opts[0]) || 1 : 1;
        const sMax = opts && opts.length >= 2 ? Number(opts[1]) || 5 : 5;
        const points = Array.from({ length: sMax - sMin + 1 }, (_, i) => sMin + i);
        return (
          <div className="flex gap-2 flex-wrap">
            {points.map(n => (
              <button key={n} type="button" onClick={() => setAnswers(a => ({ ...a, [q.id]: String(n) }))}
                className={`h-10 w-10 rounded-full border text-sm font-semibold transition-all ${val === String(n) ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'border-border text-muted-foreground hover:border-primary/50'}`}
              >{n}</button>
            ))}
          </div>
        );
      }
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

  const getLivePreviewScores = (
    qConfig: { scoring_mode?: string | null; subscales?: any },
    qList: any[],
    ansObj: Record<string, string>
  ) => {
    let totalScore = 0;
    let maxPossibleScore = 0;
    const subscaleTotals: Record<string, number> = {};
    const subscaleCounts: Record<string, number> = {};

    const subscalesList = (qConfig.subscales as unknown as Subscale[]) ?? [];
    for (const sub of subscalesList) {
      subscaleTotals[sub.id] = 0;
      subscaleCounts[sub.id] = 0;
    }

    for (const question of qList) {
      const answer = ansObj[question.id ?? ''];
      if (!answer || question.question_type === 'text') continue;

      let score = 0;
      let maxScore = 0;

      if (qConfig.scoring_mode === 'weighted' && question.answer_scores) {
        const scores = question.answer_scores as Record<string, number>;
        score = scores[answer] ?? 0;
        maxScore = Math.max(...Object.values(scores), 0);
      } else if (question.question_type === 'scale') {
        const scaleMax =
          question.options && question.options.length >= 2 && question.options[1] !== ''
            ? Number(question.options[1])
            : 5;

        if (question.answer_scores && Object.keys(question.answer_scores).length > 0) {
          const scores = question.answer_scores as Record<string, number>;
          score = scores[answer] ?? 0;
          maxScore = Math.max(...Object.values(scores), 0);
        } else {
          score = Number(answer) || 0;
          maxScore = scaleMax;
        }
      } else if (question.question_type === 'yes_no') {
        score = answer === 'yes' ? 1 : 0;
        maxScore = 1;
      } else if (question.question_type === 'multiple_choice') {
        const optionIndex = (question.options ?? []).indexOf(answer);
        score = optionIndex !== -1 ? optionIndex + 1 : 0;
        maxScore = (question.options ?? []).length;
      }

      totalScore += score;
      maxPossibleScore += maxScore;

      const subscaleIds = (question.subscale_ids as string[]) ?? [];
      for (const subId of subscaleIds) {
        if (subscaleTotals[subId] !== undefined) {
          subscaleTotals[subId] += score;
          subscaleCounts[subId] += 1;
        }
      }
    }

    const calculatedSubscales: Record<string, number> = {};
    for (const sub of subscalesList) {
      if (sub.type === 'average') {
        const count = subscaleCounts[sub.id];
        calculatedSubscales[sub.id] = count > 0 ? Number((subscaleTotals[sub.id] / count).toFixed(2)) : 0;
      } else {
        calculatedSubscales[sub.id] = subscaleTotals[sub.id];
      }
    }

    return { totalScore, maxPossibleScore, subscaleScores: calculatedSubscales };
  };

  const renderLiveScoringPreviewPanel = (
    calculatedScores: { totalScore: number; maxPossibleScore: number; subscaleScores: Record<string, number> },
    scoreRanges: ScoreRange[],
    subscalesList: Subscale[]
  ) => {
    const primaryMatched = scoreRanges.find(r => calculatedScores.totalScore >= r.min && calculatedScores.totalScore <= r.max);
    
    return (
      <div className="border border-border/80 rounded-2xl p-4 bg-muted/5 space-y-4 text-left">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Live Scoring Preview / KalkulĂˇciĂłs Teszt
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Test questionnaire calculations in real time using mock inputs.
          </p>
        </div>

        <div className="bg-accent/10 border border-border/20 rounded-xl p-3 flex flex-col gap-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-foreground">Primary Score / FĹ‘pontszĂˇm:</span>
            <span className="font-bold text-foreground">
              {calculatedScores.totalScore} / {calculatedScores.maxPossibleScore} pt
            </span>
          </div>
          {primaryMatched && (
            <div className="pt-1.5 border-t border-border/10">
              <span className="text-[10px] font-semibold text-primary block">
                Interpretation: {primaryMatched.label}
              </span>
              {primaryMatched.description && (
                <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                  {primaryMatched.description}
                </p>
              )}
            </div>
          )}
        </div>

        {subscalesList.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Subscale Scores / RĂ©szskĂˇlĂˇk:
            </span>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {subscalesList.map((sub) => {
                const score = calculatedScores.subscaleScores[sub.id] ?? 0;
                const name = lang === 'en' ? sub.name.en || sub.id : sub.name.hu || sub.id;
                const typeLabel = sub.type === 'average' ? t.questionnaires_manage.subscaleTypeAverage : t.questionnaires_manage.subscaleTypeSum;

                const matchedRange = (sub.score_ranges || []).find(r => score >= r.min && score <= r.max);
                const matchedLabel = matchedRange ? (lang === 'en' ? matchedRange.label.en : matchedRange.label.hu) : null;
                const matchedDesc = matchedRange?.description ? (lang === 'en' ? matchedRange.description.en : matchedRange.description.hu) : null;

                return (
                  <div key={sub.id} className="bg-accent/10 rounded-xl p-2.5 flex flex-col justify-between text-xs border border-border/10 space-y-1.5">
                    <div className="flex justify-between items-start">
                      <div className="text-left">
                        <p className="font-semibold text-foreground">{name}</p>
                        <p className="text-[9px] text-muted-foreground">{typeLabel}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-bold text-foreground">{score}</span>
                        {matchedLabel && (
                          <span className="block text-[9px] font-semibold text-primary mt-0.5">
                            {matchedLabel}
                          </span>
                        )}
                      </div>
                    </div>
                    {matchedDesc && (
                      <p className="text-[10px] text-muted-foreground leading-relaxed pt-1 border-t border-border/10 text-left">
                        {matchedDesc}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const questionnaireContent = (
    <>
      {isEditor && (
        <div className="flex justify-end gap-2 mb-4">
          {categorySchemaAvailable && (
            <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => setShowCategoryEditor(true)}>
              <FList className="h-4 w-4 mr-1" /> {t.questionnaires_manage.manageCategoriesBtn}
            </Button>
          )}
          <Button size="sm" variant="outline" className="rounded-2xl" onClick={openCreate}>
            <FPlus className="h-4 w-4 mr-1" /> {t.create}
          </Button>
        </div>
      )}

      {showForm && isEditor && (
        <div className="surface-card p-6 space-y-4 animate-fade-in mb-4">
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
            <p className="text-[11px] text-muted-foreground">{t.questionnaires_manage.textFormattingHint}</p>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={formPublished} onCheckedChange={setFormPublished} />
            <Label className="text-sm">{t.published}</Label>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.questionnaires_manage.categoryLabel}</Label>
            <select value={formCategory} onChange={e => setFormCategory(e.target.value)} disabled={!categorySchemaAvailable}
              className="w-full border border-input rounded-2xl px-3 py-2 text-sm bg-background disabled:cursor-not-allowed disabled:opacity-60">
              <option value="">-- {t.questionnaires_manage.selectCategoryPlaceholder || 'Select Category'} --</option>
              {categories.filter(c => c.is_active || c.id === formCategory).map(c => (
                <option key={c.id} value={c.id}>
                  {c.name_hu} / {c.name_en}
                  {!c.is_active && ` (${t.questionnaires_manage.categoryInactive})`}
                </option>
              ))}
            </select>
            {!categorySchemaAvailable && (
              <p className="text-[11px] text-muted-foreground">Questionnaire categories are visible, but saving them is blocked until the Supabase migration is applied.</p>
            )}
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
                      <span className="text-xs text-muted-foreground">â€“</span>
                      <Input type="number" value={sr.max} onChange={e => { const c = [...formScoreRanges]; c[i] = { ...c[i], max: Number(e.target.value) }; setFormScoreRanges(c); }} placeholder={t.questionnaires_manage.scoreRangeMax} className="w-16 rounded-2xl text-xs" />
                      <Input value={sr.label} onChange={e => { const c = [...formScoreRanges]; c[i] = { ...c[i], label: e.target.value }; setFormScoreRanges(c); }} placeholder={t.questionnaires_manage.scoreRangeLabel} className="flex-1 rounded-2xl text-xs" />
                      <Input value={sr.description ?? ''} onChange={e => { const c = [...formScoreRanges]; c[i] = { ...c[i], description: e.target.value }; setFormScoreRanges(c); }} placeholder={t.questionnaires_manage.scoreRangeDescription} className="flex-1 rounded-2xl text-xs" />
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFormScoreRanges(r => r.filter((_, j) => j !== i))}><FTrash className="h-3 w-3" /></Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="rounded-2xl text-xs" onClick={() => setFormScoreRanges(r => [...r, { min: 0, max: 0, label: '', description: '' }])}><FPlus className="h-3 w-3 mr-1" /> {t.questionnaires_manage.addScoreRange}</Button>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Switch
                      id="interpretation-enabled"
                      checked={formInterpretationProfile !== ''}
                      onCheckedChange={(checked) =>
                        setFormInterpretationProfile(checked ? 'enabled' : '')
                      }
                    />
                    <div className="flex flex-col gap-0.5">
                      <Label
                        htmlFor="interpretation-enabled"
                        className="text-xs font-semibold uppercase tracking-widest text-muted-foreground"
                      >
                        {t.questionnaires_manage.interpretationProfile}
                      </Label>
                      <span className="text-[11px] text-muted-foreground">
                        {t.questionnaires_manage.interpretationProfileHint}
                      </span>
                    </div>
                  </div>
                </div>

                {formInterpretationProfile !== '' && (
                  <div className="pt-2">
                    {editingId ? (
                      <div className="space-y-4">
                        <SurveyStudiesManager surveyId={editingId} />
                        <SurveyInterpretationManager surveyId={editingId} />
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border/80 p-4 text-center bg-muted/10">
                        <p className="text-xs text-muted-foreground">
                          {t.questionnaires_manage.studySaveFirst}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Subscales config */}
          {formScoringEnabled && (
            <div className="space-y-3 border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t.questionnaires_manage.subscalesSection}
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t.questionnaires_manage.subscalesHint}
                  </p>
                </div>
                <div className="flex bg-muted p-0.5 rounded-xl text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => setSubscaleEditMode('form')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      subscaleEditMode === 'form'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubscaleEditMode('json')}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      subscaleEditMode === 'json'
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    JSON
                  </button>
                </div>
              </div>

              {subscaleEditMode === 'form' ? (
                <div className="space-y-3">
                  {formSubscales.map((ss, i) => (
                    <div key={i} className="border-b border-border/30 pb-3 last:border-0 last:pb-0 space-y-2.5">
                      <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-end w-full">
                        <div className="w-full sm:flex-[0.8] sm:min-w-[80px] space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase">{t.questionnaires_manage.subscaleId}</Label>
                          <Input
                            value={ss.id}
                            onChange={e => {
                              const c = [...formSubscales];
                              c[i] = { ...c[i], id: e.target.value };
                              updateFormSubscales(c);
                            }}
                            placeholder="e.g. anx"
                            className="rounded-xl h-8 text-xs"
                          />
                        </div>
                        <div className="w-full sm:flex-[1.2] sm:min-w-[100px] space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase">{t.questionnaires_manage.subscaleNameHu}</Label>
                          <Input
                            value={ss.name.hu}
                            onChange={e => {
                              const c = [...formSubscales];
                              c[i] = { ...c[i], name: { ...c[i].name, hu: e.target.value } };
                              updateFormSubscales(c);
                            }}
                            placeholder="pl. szorongĂˇs"
                            className="rounded-xl h-8 text-xs"
                          />
                        </div>
                        <div className="w-full sm:flex-[1.2] sm:min-w-[100px] space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase">{t.questionnaires_manage.subscaleNameEn}</Label>
                          <Input
                            value={ss.name.en}
                            onChange={e => {
                              const c = [...formSubscales];
                              c[i] = { ...c[i], name: { ...c[i].name, en: e.target.value } };
                              updateFormSubscales(c);
                            }}
                            placeholder="e.g. anxiety"
                            className="rounded-xl h-8 text-xs"
                          />
                        </div>
                        <div className="w-full sm:w-24 space-y-1">
                          <Label className="text-[10px] text-muted-foreground uppercase">{t.questionnaires_manage.subscaleType}</Label>
                          <select
                            value={ss.type}
                            onChange={e => {
                              const c = [...formSubscales];
                              c[i] = { ...c[i], type: e.target.value };
                              updateFormSubscales(c);
                            }}
                            className="w-full border border-input rounded-xl px-2 h-8 text-xs bg-background"
                          >
                            <option value="sum">{t.questionnaires_manage.subscaleTypeSum}</option>
                            <option value="average">{t.questionnaires_manage.subscaleTypeAverage}</option>
                          </select>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive shrink-0 self-end sm:self-auto"
                          onClick={() => {
                            const c = formSubscales.filter((_, j) => j !== i);
                            updateFormSubscales(c);
                          }}
                        >
                          <FTrash className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Subscale Score Interpretation Ranges */}
                      <div className="pl-4 space-y-2 border-l-2 border-border/40">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground block">
                          {t.questionnaires_manage.scoreRanges}
                        </span>
                        <div className="space-y-2">
                          {(ss.score_ranges || []).map((range, ri) => (
                            <div key={ri} className="flex flex-col sm:flex-row sm:flex-wrap gap-2 items-stretch sm:items-end bg-muted/30 p-2.5 rounded-xl border border-border/20 w-full">
                              <div className="w-full sm:w-14 space-y-1">
                                <Label className="text-[8px] text-muted-foreground uppercase">Min</Label>
                                <Input
                                  type="number"
                                  value={range.min}
                                  onChange={e => {
                                    const c = [...formSubscales];
                                    const ranges = [...(c[i].score_ranges || [])];
                                    ranges[ri] = { ...ranges[ri], min: Number(e.target.value) };
                                    c[i] = { ...c[i], score_ranges: ranges };
                                    updateFormSubscales(c);
                                  }}
                                  className="rounded-lg h-7 text-xs"
                                />
                              </div>
                              <div className="w-full sm:w-14 space-y-1">
                                <Label className="text-[8px] text-muted-foreground uppercase">Max</Label>
                                <Input
                                  type="number"
                                  value={range.max}
                                  onChange={e => {
                                    const c = [...formSubscales];
                                    const ranges = [...(c[i].score_ranges || [])];
                                    ranges[ri] = { ...ranges[ri], max: Number(e.target.value) };
                                    c[i] = { ...c[i], score_ranges: ranges };
                                    updateFormSubscales(c);
                                  }}
                                  className="rounded-lg h-7 text-xs"
                                />
                              </div>
                              <div className="w-full sm:flex-1 sm:min-w-[90px] space-y-1">
                                <Label className="text-[8px] text-muted-foreground uppercase">Label HU</Label>
                                <Input
                                  value={range.label?.hu || ''}
                                  onChange={e => {
                                    const c = [...formSubscales];
                                    const ranges = [...(c[i].score_ranges || [])];
                                    ranges[ri] = { ...ranges[ri], label: { ...ranges[ri].label, hu: e.target.value } };
                                    c[i] = { ...c[i], score_ranges: ranges };
                                    updateFormSubscales(c);
                                  }}
                                  placeholder="pl. Alacsony"
                                  className="rounded-lg h-7 text-xs"
                                />
                              </div>
                              <div className="w-full sm:flex-1 sm:min-w-[90px] space-y-1">
                                <Label className="text-[8px] text-muted-foreground uppercase">Label EN</Label>
                                <Input
                                  value={range.label?.en || ''}
                                  onChange={e => {
                                    const c = [...formSubscales];
                                    const ranges = [...(c[i].score_ranges || [])];
                                    ranges[ri] = { ...ranges[ri], label: { ...ranges[ri].label, en: e.target.value } };
                                    c[i] = { ...c[i], score_ranges: ranges };
                                    updateFormSubscales(c);
                                  }}
                                  placeholder="e.g. Low"
                                  className="rounded-lg h-7 text-xs"
                                />
                              </div>
                              <div className="w-full sm:flex-[1.5] sm:min-w-[130px] space-y-1">
                                <Label className="text-[8px] text-muted-foreground uppercase">Desc HU</Label>
                                <Input
                                  value={range.description?.hu || ''}
                                  onChange={e => {
                                    const c = [...formSubscales];
                                    const ranges = [...(c[i].score_ranges || [])];
                                    ranges[ri] = { ...ranges[ri], description: { ...ranges[ri].description, hu: e.target.value } };
                                    c[i] = { ...c[i], score_ranges: ranges };
                                    updateFormSubscales(c);
                                  }}
                                  className="rounded-lg h-7 text-xs"
                                />
                              </div>
                              <div className="w-full sm:flex-[1.5] sm:min-w-[130px] space-y-1">
                                <Label className="text-[8px] text-muted-foreground uppercase">Desc EN</Label>
                                <Input
                                  value={range.description?.en || ''}
                                  onChange={e => {
                                    const c = [...formSubscales];
                                    const ranges = [...(c[i].score_ranges || [])];
                                    ranges[ri] = { ...ranges[ri], description: { ...ranges[ri].description, en: e.target.value } };
                                    c[i] = { ...c[i], score_ranges: ranges };
                                    updateFormSubscales(c);
                                  }}
                                  className="rounded-lg h-7 text-xs"
                                />
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive shrink-0 self-end sm:self-auto"
                                onClick={() => {
                                  const c = [...formSubscales];
                                  c[i] = {
                                    ...c[i],
                                    score_ranges: (c[i].score_ranges || []).filter((_, j) => j !== ri),
                                  };
                                  updateFormSubscales(c);
                                }}
                              >
                                <FTrash className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-xl text-[10px] h-6 px-2 py-0"
                            onClick={() => {
                              const c = [...formSubscales];
                              c[i] = {
                                ...c[i],
                                score_ranges: [...(c[i].score_ranges || []), { min: 0, max: 0, label: { hu: '', en: '' }, description: { hu: '', en: '' } }],
                              };
                              updateFormSubscales(c);
                            }}
                          >
                            <FPlus className="h-2.5 w-2.5 mr-1" /> {t.questionnaires_manage.addScoreRange}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-2xl text-xs h-7"
                    onClick={() => {
                      const c = [...formSubscales, { id: '', name: { hu: '', en: '' }, type: 'sum' }];
                      updateFormSubscales(c);
                    }}
                  >
                    <FPlus className="h-3 w-3 mr-1" /> {t.questionnaires_manage.addSubscale}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Textarea
                    value={rawSubscalesJson}
                    onChange={e => handleRawSubscalesJsonChange(e.target.value)}
                    rows={6}
                    className="font-mono text-xs rounded-2xl"
                    placeholder="[ { &quot;id&quot;: &quot;anx&quot;, &quot;name&quot;: { &quot;hu&quot;: &quot;SzorongĂˇs&quot;, &quot;en&quot;: &quot;Anxiety&quot; }, &quot;type&quot;: &quot;sum&quot; } ]"
                  />
                  {subscaleJsonError && (
                    <p className="text-[11px] text-destructive font-semibold">
                      {subscaleJsonError}
                    </p>
                  )}
                </div>
              )}

              {/* Visual Mapping Summary Panel */}
              {formSubscales.length > 0 && (
                <div className="mt-3 p-3 rounded-2xl bg-muted/20 border border-border/50 space-y-2 text-left">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                    Subscale Mapping Summary / KĂ©rdĂ©s hozzĂˇrendelĂ©sek
                  </Label>
                  <div className="space-y-1.5">
                    {formSubscales.map(sub => {
                      const name = lang === 'en' ? sub.name.en || sub.id : sub.name.hu || sub.id;
                      const mappedIndices = formQuestions
                        .map((q, idx) => q.subscaleIds?.includes(sub.id) ? idx + 1 : null)
                        .filter((val): val is number => val !== null);
                        
                      return (
                        <div key={sub.id} className="text-xs flex items-center justify-between gap-3 border-b border-border/10 pb-1.5 last:border-0 last:pb-0">
                          <span className="font-semibold text-foreground">
                            {name} ({sub.id})
                          </span>
                          {mappedIndices.length > 0 ? (
                            <span className="bg-primary/10 text-primary font-medium px-2 py-0.5 rounded-lg text-[10px]">
                              {lang === 'en' ? 'Questions' : 'KĂ©rdĂ©sek'}: {mappedIndices.map(i => `Q${i}`).join(', ')}
                            </span>
                          ) : (
                            <span className="bg-destructive/10 text-destructive font-semibold px-2 py-0.5 rounded-lg text-[10px]">
                              {lang === 'en' ? 'No questions mapped' : 'Nincs kĂ©rdĂ©s hozzĂˇrendelve'}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end border-t border-border/50 pt-3">
            <Button size="sm" className="rounded-2xl" onClick={handleSave} disabled={saving}>
              <FSave className="h-4 w-4 mr-1" /> {saving ? t.saving : editingId ? t.update : t.create}
            </Button>
          </div>
          <div className="space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.questionnaires_manage.questions}</Label>
            {formQuestions.map((nq, i) => (
              <div key={i} className="border border-border rounded-2xl p-3 space-y-2">
                <div className="flex gap-2 items-center">
                  <div className="flex flex-col items-center shrink-0 w-6">
                    <button type="button" disabled={i === 0} onClick={() => { const c = [...formQuestions]; [c[i - 1], c[i]] = [c[i], c[i - 1]]; setFormQuestions(c); }}
                      className="h-4 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:pointer-events-none transition-colors active:scale-90">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="m18 15-6-6-6 6"/></svg>
                    </button>
                    <span className="text-[10px] font-semibold text-muted-foreground leading-tight">{i + 1}.</span>
                    <button type="button" disabled={i === formQuestions.length - 1} onClick={() => { const c = [...formQuestions]; [c[i], c[i + 1]] = [c[i + 1], c[i]]; setFormQuestions(c); }}
                      className="h-4 w-6 flex items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-25 disabled:pointer-events-none transition-colors active:scale-90">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="m6 9 6 6 6-6"/></svg>
                    </button>
                  </div>
                  <Textarea value={nq.text} onChange={e => { const c = [...formQuestions]; c[i].text = e.target.value; setFormQuestions(c); }} placeholder={`${t.questionnaires_manage.questions} ${i + 1}`} rows={2} className="flex-1 rounded-2xl" />
                  <select value={nq.type} onChange={e => { const c = [...formQuestions]; c[i].type = e.target.value; setFormQuestions(c); }}
                    className="border border-input rounded-2xl px-3 text-sm bg-background">
                    <option value="text">{t.questionnaires_manage.typeText}</option>
                    <option value="scale">{t.questionnaires_manage.scaleType}</option>
                    <option value="yes_no">{t.yes}/{t.no}</option>
                    <option value="multiple_choice">{t.questionnaires_manage.typeMultipleChoice}</option>
                  </select>
                  {formQuestions.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => setFormQuestions(q => q.filter((_, j) => j !== i))}><FTrash className="h-4 w-4" /></Button>
                  )}
                </div>
                {formScoringEnabled && nq.type !== 'text' && (
                  <div className="flex items-center gap-2 pl-8">
                    <Switch
                      checked={nq.excludeFromScoring}
                      onCheckedChange={(checked) => {
                        const c = [...formQuestions];
                        c[i].excludeFromScoring = checked;
                        setFormQuestions(c);
                      }}
                    />
                    <div className="flex flex-col">
                      <Label className="text-xs text-foreground">{t.questionnaires_manage.excludeFromScoring}</Label>
                      <span className="text-[10px] text-muted-foreground">{t.questionnaires_manage.excludeFromScoringHint}</span>
                    </div>
                  </div>
                )}
                {nq.type === 'multiple_choice' && (
                  <Input value={nq.options} onChange={e => { const c = [...formQuestions]; c[i].options = e.target.value; setFormQuestions(c); }} placeholder={t.questionnaires_manage.optionsPlaceholder} className="text-xs rounded-2xl" />
                )}
                {nq.type === 'scale' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground shrink-0">{t.questionnaires_manage.scaleRange}</Label>
                      <Input type="number" value={nq.scaleMin} onChange={e => { const c = [...formQuestions]; c[i].scaleMin = Number(e.target.value); setFormQuestions(c); }} className="w-16 h-8 rounded-xl text-xs" />
                      <span className="text-xs text-muted-foreground">â€“</span>
                      <Input type="number" value={nq.scaleMax} onChange={e => { const c = [...formQuestions]; c[i].scaleMax = Number(e.target.value); setFormQuestions(c); }} className="w-16 h-8 rounded-xl text-xs" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.questionnaires_manage.scaleLabels}</Label>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: nq.scaleMax - nq.scaleMin + 1 }, (_, k) => nq.scaleMin + k).map(n => (
                          <div key={n} className="flex items-center gap-1">
                            <span className="text-[11px] text-muted-foreground font-semibold w-5 text-center">{n}</span>
                            <Input
                              value={nq.scaleLabels[String(n)] ?? ''}
                              onChange={e => { const c = [...formQuestions]; c[i].scaleLabels = { ...c[i].scaleLabels, [String(n)]: e.target.value }; setFormQuestions(c); }}
                              placeholder={t.questionnaires_manage.scaleLabelsPlaceholder}
                              className="w-28 h-7 rounded-xl text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    {formScoringEnabled && formScoringMode !== 'weighted' && (
                      <div className="flex items-center gap-3 pt-1">
                        <Switch checked={nq.reverseScored} onCheckedChange={(checked) => {
                          const c = [...formQuestions];
                          c[i].reverseScored = checked;
                          if (checked) {
                            // Auto-generate reversed scores
                            const scores: Record<string, number> = {};
                            for (let n = nq.scaleMin; n <= nq.scaleMax; n++) {
                              scores[String(n)] = (nq.scaleMin + nq.scaleMax) - n;
                            }
                            c[i].answerScores = scores;
                          } else {
                            c[i].answerScores = {};
                          }
                          setFormQuestions(c);
                        }} />
                        <Label className="text-xs text-muted-foreground">{t.questionnaires_manage.reverseScoring}</Label>
                        {nq.reverseScored && (
                          <span className="text-[10px] text-muted-foreground/70">
                            ({Array.from({ length: nq.scaleMax - nq.scaleMin + 1 }, (_, k) => {
                              const n = nq.scaleMin + k;
                              return `${n}â†’${(nq.scaleMin + nq.scaleMax) - n}`;
                            }).join(', ')})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {/* Weighted answer scores */}
                {formScoringEnabled && formScoringMode === 'weighted' && nq.type !== 'text' && (
                  <div className="space-y-1 pt-1 border-t border-border/50">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.questionnaires_manage.answerScores}</Label>
                    <div className="flex flex-wrap gap-2">
                      {(nq.type === 'scale' ? Array.from({ length: nq.scaleMax - nq.scaleMin + 1 }, (_, k) => String(nq.scaleMin + k)) : nq.type === 'yes_no' ? ['yes','no'] : nq.options.split(',').map(s => s.trim()).filter(Boolean)).map(opt => (
                        <div key={opt} className="flex items-center gap-1">
                          <span className="text-[11px] text-muted-foreground">{opt}:</span>
                          <Input type="number" value={nq.answerScores[opt] ?? ''} onChange={e => { const c = [...formQuestions]; c[i].answerScores = { ...c[i].answerScores, [opt]: Number(e.target.value) }; setFormQuestions(c); }} className="w-14 h-7 rounded-xl text-xs" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Logic Jump Rules */}
                {nq.type !== 'text' && (
                  <div className="space-y-2 pt-2 border-t border-border/50">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.questionnaires_manage.logicJumpSection}</Label>
                      {nq.logicRules.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {nq.logicRules.map((rule, ri) => (
                            <span key={ri} className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                              {rule.condition.answer_equals} â†’ {rule.action === 'skip_to_end' ? t.questionnaires_manage.endOfSurvey : `Q${(formQuestions.findIndex(fq => fq.id === rule.target_question_id) + 1) || '?'}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    {nq.logicRules.map((rule, ri) => {
                      const skippedQuestions = getSkippedQuestionsForRule(i, rule);
                      return (
                        <div key={ri} className="space-y-2 border-b border-border/20 pb-2 last:border-0 last:pb-0">
                          <div className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground shrink-0">{t.questionnaires_manage.whenAnswerIs}:</span>
                            <select
                              value={rule.condition.answer_equals}
                              onChange={e => {
                                const c = [...formQuestions];
                                c[i].logicRules = [...c[i].logicRules];
                                c[i].logicRules[ri] = { ...c[i].logicRules[ri], condition: { answer_equals: e.target.value } };
                                setFormQuestions(c);
                              }}
                              className="border border-input rounded-xl px-2 py-1 text-xs bg-background min-w-[80px]"
                            >
                              <option value="">â€”</option>
                              {(nq.type === 'yes_no' ? ['yes', 'no'] :
                                nq.type === 'scale' ? Array.from({ length: nq.scaleMax - nq.scaleMin + 1 }, (_, k) => String(nq.scaleMin + k)) :
                                nq.type === 'multiple_choice' ? nq.options.split(',').map(s => s.trim()).filter(Boolean) :
                                []).map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                              ))}
                            </select>
                            <span className="text-muted-foreground shrink-0">{t.questionnaires_manage.thenGoTo}:</span>
                            <select
                              value={rule.action === 'skip_to_end' ? '__END__' : (rule.target_question_id ?? '')}
                              onChange={e => {
                                if (e.target.value === '__END__') {
                                  handleRuleTargetChange(i, ri, 'skip_to_end', undefined);
                                } else {
                                  handleRuleTargetChange(i, ri, 'jump_to', e.target.value);
                                }
                              }}
                              className="border border-input rounded-xl px-2 py-1 text-xs bg-background min-w-[120px]"
                            >
                              <option value="">â€”</option>
                              {/* Forward-only: only show questions after the current one */}
                              {formQuestions.slice(i + 1).map((fq, fi) => (
                                <option key={fq.id ?? `new-${i + 1 + fi}`} value={fq.id ?? ''}>
                                  {t.questionnaires_manage.questionN.replace('{n}', String(i + 2 + fi))}: {fq.text.substring(0, 30) || '...'}
                                </option>
                              ))}
                              <option value="__END__">{t.questionnaires_manage.endOfSurvey}</option>
                            </select>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => {
                              const c = [...formQuestions];
                              c[i].logicRules = c[i].logicRules.filter((_, j) => j !== ri);
                              setFormQuestions(c);
                            }}>
                              <FTrash className="h-3 w-3" />
                            </Button>
                          </div>

                          {/* Synthetic Auto-Score for Skipped Questions */}
                          {skippedQuestions.length > 0 && (
                            <div className="pl-4 pt-1 space-y-1.5 border-l-2 border-primary/20">
                              <span className="text-[10px] font-semibold text-muted-foreground block uppercase tracking-wide">
                                Auto-score Skipped Questions / Kihagyott kĂ©rdĂ©sek pontozĂˇsa
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {skippedQuestions.map((q, idx) => {
                                  const qIndex = formQuestions.findIndex(fq => fq.id === q.id);
                                  const label = `Q${qIndex + 1}: ${q.text.substring(0, 20)}...`;
                                  const value = rule.synthetic_skipped_answers?.[q.id!] ?? "";
                                  
                                  return (
                                    <div key={q.id || idx} className="flex items-center justify-between gap-2 text-xs bg-accent/10 rounded-lg p-1.5">
                                      <span className="text-muted-foreground truncate max-w-[150px] font-medium" title={q.text}>
                                        {label}
                                      </span>
                                      {q.type === 'yes_no' && (
                                        <select
                                          value={value}
                                          onChange={e => handleSyntheticAnswerChange(i, ri, q.id!, e.target.value)}
                                          className="border border-input rounded-xl px-1.5 py-0.5 text-[11px] bg-background"
                                        >
                                          <option value="">â€” (Skip)</option>
                                          <option value="yes">yes</option>
                                          <option value="no">no</option>
                                        </select>
                                      )}
                                      {q.type === 'scale' && (
                                        <select
                                          value={value}
                                          onChange={e => handleSyntheticAnswerChange(i, ri, q.id!, e.target.value)}
                                          className="border border-input rounded-xl px-1.5 py-0.5 text-[11px] bg-background"
                                        >
                                          <option value="">â€” (Skip)</option>
                                          {Array.from({ length: q.scaleMax - q.scaleMin + 1 }, (_, k) => String(q.scaleMin + k)).map(pt => (
                                            <option key={pt} value={pt}>{pt}</option>
                                          ))}
                                        </select>
                                      )}
                                      {q.type === 'multiple_choice' && (
                                        <select
                                          value={value}
                                          onChange={e => handleSyntheticAnswerChange(i, ri, q.id!, e.target.value)}
                                          className="border border-input rounded-xl px-1.5 py-0.5 text-[11px] bg-background max-w-[100px]"
                                        >
                                          <option value="">â€” (Skip)</option>
                                          {q.options.split(',').map(s => s.trim()).filter(Boolean).map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                          ))}
                                        </select>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" onClick={() => {
                      const c = [...formQuestions];
                      c[i].logicRules = [...c[i].logicRules, { condition: { answer_equals: '' }, action: 'jump_to' as const }];
                      setFormQuestions(c);
                    }}>
                      <FPlus className="h-3 w-3 mr-1" /> {t.questionnaires_manage.addLogicRule}
                    </Button>
                  </div>
                )}
                {/* Question subscale mapping */}
                {formScoringEnabled && formSubscales.length > 0 && (
                  <div className="space-y-1.5 pl-8 pt-2 border-t border-border/30">
                    <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {t.questionnaires_manage.mapSubscales}
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {formSubscales.map(ss => {
                        const isSelected = nq.subscaleIds?.includes(ss.id);
                        const name = lang === 'en' ? ss.name.en || ss.id : ss.name.hu || ss.id;
                        return (
                          <button
                            key={ss.id}
                            type="button"
                            onClick={() => {
                              const c = [...formQuestions];
                              const currentIds = c[i].subscaleIds || [];
                              if (isSelected) {
                                c[i].subscaleIds = currentIds.filter(id => id !== ss.id);
                              } else {
                                c[i].subscaleIds = [...currentIds, ss.id];
                              }
                              setFormQuestions(c);
                            }}
                            className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-colors ${
                              isSelected
                                ? 'bg-primary/10 text-primary border-primary/30'
                                : 'bg-background text-muted-foreground border-border hover:border-muted-foreground/30'
                            }`}
                          >
                            {name} ({ss.id})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-1 border-t border-border/30">
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1" onClick={() => {
                    const clone = { ...nq, id: crypto.randomUUID(), text: nq.text ? `${nq.text} (copy)` : '', answerScores: { ...nq.answerScores }, scaleLabels: { ...nq.scaleLabels }, logicRules: [], subscaleIds: [...(nq.subscaleIds || [])] };
                    const c = [...formQuestions];
                    c.splice(i + 1, 0, clone);
                    setFormQuestions(c);
                  }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    {t.questionnaires_manage.duplicateQuestion}
                  </Button>
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="rounded-2xl" onClick={() => setFormQuestions(q => [...q, { id: crypto.randomUUID(), text: '', type: 'text', options: '', answerScores: {}, scaleMin: 1, scaleMax: 5, scaleLabels: {}, reverseScored: false, excludeFromScoring: false, logicRules: [], subscaleIds: [] }])}>{t.questionnaires_manage.addQuestion}</Button>
          </div>
          {/* Live Preview Scoring Calculator Block inside Editor */}
          {formScoringEnabled && (
            <div className="border border-border/80 rounded-2xl p-4 bg-muted/5 space-y-4 text-left">
              <div>
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Mock Answers / Teszt VĂˇlaszok
                </span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Select mock answers below to test scoring calculations.
                </p>
              </div>
              
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {formQuestions.map((q, idx) => {
                  if (q.type === 'text') return null;
                  const val = mockEditorAnswers[String(idx)] ?? '';
                  
                  let optionsList: string[] = [];
                  if (q.type === 'scale') {
                    const sMin = Number(q.scaleMin) || 1;
                    const sMax = Number(q.scaleMax) || 5;
                    optionsList = Array.from({ length: sMax - sMin + 1 }, (_, k) => String(sMin + k));
                  } else if (q.type === 'yes_no') {
                    optionsList = ['yes', 'no'];
                  } else if (q.type === 'multiple_choice') {
                    optionsList = q.options.split(',').map(s => s.trim()).filter(Boolean);
                  }

                  return (
                    <div key={idx} className="flex flex-wrap items-center justify-between gap-3 border-b border-border/20 pb-2 last:border-0 last:pb-0 text-xs">
                      <span className="font-medium text-foreground max-w-[200px] truncate">
                        {idx + 1}. {q.text || 'Question text...'}
                      </span>
                      <div className="flex gap-1.5 flex-wrap shrink-0">
                        {optionsList.map(opt => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setMockEditorAnswers(a => ({ ...a, [String(idx)]: opt }))}
                            className={`px-2 py-1 rounded-lg border text-[10px] font-medium transition-all ${
                              val === opt
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-border text-muted-foreground hover:border-primary/50'
                            }`}
                          >
                            {opt === 'yes' ? t.yes : opt === 'no' ? t.no : opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {(() => {
                const mockCalculated = getLivePreviewScores(
                  { scoring_mode: formScoringMode, subscales: formSubscales },
                  formQuestions.map((q, idx) => ({
                    id: String(idx),
                    question_type: q.type,
                    options: q.type === 'multiple_choice' ? q.options.split(',').map(s => s.trim()).filter(Boolean) : q.type === 'scale' ? [String(q.scaleMin), String(q.scaleMax)] : null,
                    answer_scores: q.answerScores,
                    subscale_ids: q.subscaleIds
                  })),
                  mockEditorAnswers
                );
                return renderLiveScoringPreviewPanel(mockCalculated, formScoreRanges, formSubscales);
              })()}
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" className="rounded-2xl" onClick={handleSave} disabled={saving}>
              <FSave className="h-4 w-4 mr-1" /> {saving ? t.saving : editingId ? t.update : t.create}
            </Button>
            <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => setShowForm(false)}>{t.cancel}</Button>
          </div>
        </div>
      )}

      {selectedQ ? (
        <div className="surface-card p-6 space-y-5 animate-fade-in">
          <h2 className="text-sm font-semibold text-foreground">{questionnaires.find(q => q.id === selectedQ)?.title}</h2>
          {questions.map((q, i) => (
            <div key={q.id} className="space-y-2">
              <div className="space-y-1">
                <span className="text-sm font-medium text-foreground">{i + 1}.</span>
                <div className="prose prose-sm max-w-none text-sm text-foreground [&_p]:my-0 [&_ul]:my-1 [&_ol]:my-1">
                  <ReactMarkdown>{q.question_text}</ReactMarkdown>
                </div>
              </div>
              {renderQuestionInput(q)}
            </div>
          ))}
          {/* Live Preview Scoring Calculator Block inside Preview Filler */}
          {(() => {
            const questionnaire = questionnaires.find(q => q.id === selectedQ);
            if (!questionnaire || !questionnaire.scoring_enabled) return null;
            const subscalesList = (questionnaire.subscales as unknown as Subscale[]) ?? [];
            const calculated = getLivePreviewScores(
              questionnaire,
              questions.map(q => ({
                id: q.id,
                question_type: q.question_type,
                options: q.options,
                answer_scores: q.answer_scores,
                subscale_ids: q.subscale_ids
              })),
              answers
            );
            return renderLiveScoringPreviewPanel(calculated, (questionnaire.score_ranges ?? []) as ScoreRange[], subscalesList);
          })()}

          <div className="flex gap-2">
            <Button size="sm" className="rounded-2xl" onClick={handleSubmitAnswers} disabled={submitting}>{submitting ? t.questionnaires_manage.submitting : t.submit}</Button>
            <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => setSelectedQ(null)}>{t.cancel}</Button>
          </div>
        </div>
      ) : (
        <section className="surface-card space-y-5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-border/50 pb-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <FClipboardCheck className="h-4 w-4" />
                </div>
                <h2 className="text-base font-semibold text-foreground">
                  {t.questionnaires_manage.adminOverviewTitle}
                </h2>
              </div>
              {isEditor && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => setShowCategoryEditor(true)}
                  >
                    <FList className="mr-2 h-4 w-4" />
                    {t.questionnaires_manage.manageCategoriesBtn}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => openCreate()}
                  >
                    <FPlus className="mr-2 h-4 w-4" />
                    {t.create}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {([
                  ['all', t.questionnaires_manage.filterAll],
                  ['published', t.published],
                  ['draft', t.draft],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAdminStatusFilter(value)}
                    className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                      adminStatusFilter === value
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {label}
                  </button>
                ))}

                {adminCategoryOptions.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setAdminCategoryFilter((current) => current === category.key ? 'all' : category.key)}
                    className={`rounded-full border px-4 py-2 text-xs font-medium transition-colors ${
                      adminCategoryFilter === category.key
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    }`}
                  >
                    {getLocalizedCategoryName(category)}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setAdminSortMode((current) => current === 'recent' ? 'alphabetical' : 'recent')}
                className="inline-flex items-center gap-2 self-start rounded-full border border-border bg-background px-4 py-2 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                <span>{t.questionnaires_manage.sortLabel}: {adminSortMode === 'recent' ? t.questionnaires_manage.adminSortRecent : t.questionnaires_manage.sortAlphabetical}</span>
                <FChevronDown className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {questionnaires.length === 0 ? (
            <div className="rounded-[1.75rem] border border-border/60 bg-card/50 p-6">
              <p className="text-sm text-muted-foreground">{t.questionnaires_manage.noAvailable}</p>
            </div>
          ) : filteredAdminQuestionnaires.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-border/60 bg-accent/20 p-6">
              <p className="text-sm text-muted-foreground">{t.questionnaires_manage.noMatchingQuestionnaires}</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredAdminQuestionnaires.map((q) => (
                <div
                  key={q.id}
                  className="flex h-full flex-col rounded-[2rem] border border-border/70 bg-card/70 p-5 shadow-[0_12px_36px_-24px_rgba(24,63,44,0.28)]"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <FClipboardCheck className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 space-y-2">
                        <button
                          type="button"
                          onClick={() => isEditor ? openEdit(q) : loadQuestions(q.id)}
                          className="text-left transition-opacity hover:opacity-80"
                        >
                          <h3 className="text-[1.05rem] font-semibold leading-snug text-foreground">
                            {q.title}
                          </h3>
                        </button>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-primary/10 bg-primary/5 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            {getRepeatIntervalLabel(q.repeat_interval)}
                          </span>
                          {!q.is_published && (
                            <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                              {t.draft}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isEditor && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => togglePublished(q)} title={q.is_published ? t.questionnaires_manage.unpublishedToast : t.questionnaires_manage.publishedToast}>
                          <Switch checked={q.is_published} className="pointer-events-none scale-75" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleClone(q)} title={t.questionnaires_manage.questionnaireCloned}>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <FTrash className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t.questionnaires_manage.deleteConfirmTitle}</AlertDialogTitle>
                              <AlertDialogDescription>{t.questionnaires_manage.deleteConfirmDesc.replace('{title}', q.title)}</AlertDialogDescription>
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

                  <p className="mb-5 line-clamp-4 min-h-[6.5rem] text-sm leading-8 text-muted-foreground">
                    {getQuestionnaireDescriptionPreview(q.description)}
                  </p>

                  <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-[1.6rem] border border-border/70 bg-background/70 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                        {t.questionnaires_manage.categoryLabel}
                      </p>
                      <p className="mt-1 truncate text-sm text-foreground">
                        {getLocalizedCategoryName(q.category)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                        {t.questionnaires_manage.adminMetaStatus}
                      </p>
                      <p className="mt-1 truncate text-sm text-foreground">
                        {q.is_published ? t.published : t.draft}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                        {t.questionnaires_manage.adminMetaUpdated}
                      </p>
                      <p className="mt-1 truncate text-sm text-foreground">
                        {formatAdminDate(q.updated_at ?? q.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mb-6 flex items-center gap-2 text-xs text-muted-foreground">
                    <FClock className="h-3.5 w-3.5" />
                    <span>
                      {t.questionnaires_manage.adminUpdatedHint.replace('{date}', formatAdminDate(q.updated_at ?? q.created_at))}
                    </span>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-3">
                    <Button type="button" className="rounded-full px-6" onClick={() => openEdit(q)}>
                      <FPencil className="mr-2 h-4 w-4" />
                      {t.questionnaires_manage.adminEditCta}
                    </Button>
                    <Button type="button" variant="outline" className="rounded-full px-6" onClick={() => loadQuestions(q.id)}>
                      {t.questionnaires_manage.adminOpenPreview}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );

  return (
    <DashboardLayout>
      <div className={`mx-auto w-full space-y-6 ${showForm || selectedQ ? 'max-w-2xl' : 'max-w-6xl'}`}>
        <div className={showForm || selectedQ ? '' : 'pb-3 border-b border-border/50'}>
          <h1 className="text-xl font-bold tracking-tight text-foreground">{t.questionnaires_manage.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.questionnaires_manage.subtitle}</p>
        </div>

        {questionnaireContent}
      </div>

      {showCategoryEditor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card w-full max-w-2xl rounded-3xl border border-border p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <h3 className="text-base font-bold text-foreground">
                {t.questionnaires_manage.categoriesManagementTitle}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowCategoryEditor(false);
                  setEditingCategory(null);
                  setCatKey('');
                  setCatNameHu('');
                  setCatNameEn('');
                  setCatDescHu('');
                  setCatDescEn('');
                  setCatSortOrder(0);
                  setCatIsActive(true);
                }}
              >
                <FClose className="h-4 w-4" />
              </Button>
            </div>

            {/* List of existing categories */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {t.questionnaires_manage.existingCategoriesLabel}
              </span>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No categories found.
                </p>
              ) : (
                <div className="divide-y divide-border/30 max-h-48 overflow-y-auto pr-1">
                  {categories.map((cat) => (
                    <div key={cat.id} className="py-2.5 flex items-center justify-between text-xs gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">
                            {cat.name_hu} / {cat.name_en}
                          </span>
                          <span className="text-[10px] font-mono text-muted-foreground">
                            ({cat.key})
                          </span>
                          {!cat.is_active && (
                            <span className="rounded bg-destructive/10 px-1 py-0.5 text-[9px] font-semibold text-destructive uppercase">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-primary"
                          onClick={() => {
                            setEditingCategory(cat);
                            setCatKey(cat.key);
                            setCatNameHu(cat.name_hu);
                            setCatNameEn(cat.name_en);
                            setCatDescHu(cat.description_hu || '');
                            setCatDescEn(cat.description_en || '');
                            setCatSortOrder(cat.sort_order);
                            setCatIsActive(cat.is_active);
                          }}
                        >
                          <FPencil className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <FTrash className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t.questionnaires_manage.deleteCategoryConfirmTitle}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t.questionnaires_manage.deleteCategoryConfirmDesc.replace('{name}', lang === 'en' ? cat.name_en : cat.name_hu)}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={async () => {
                                  try {
                                    const { error } = await supabase
                                      .from('questionnaire_categories')
                                      .delete()
                                      .eq('id', cat.id);
                                    if (error) throw error;
                                    toast.success(t.questionnaires_manage.categoryDeleted);
                                    await fetchCategories();
                                  } catch (err: any) {
                                    const isFkError = err.code === '23503' || (err.message && err.message.includes('foreign key'));
                                    toast.error(isFkError 
                                      ? t.questionnaires_manage.deleteCategoryInUseError
                                      : (err.message || 'Failed to delete category')
                                    );
                                  }
                                }}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {t.delete}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add / Edit Form */}
            <div className="border-t border-border/50 pt-4 space-y-3 bg-accent/5 p-4 rounded-2xl border border-border/40">
              <span className="text-xs font-bold text-foreground block">
                {editingCategory ? t.questionnaires_manage.editCategoryFormTitle : t.questionnaires_manage.newCategoryFormTitle}
              </span>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase">{t.questionnaires_manage.categoryKey}</Label>
                  <Input
                    value={catKey}
                    onChange={(e) => setCatKey(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="e.g. mood_state"
                    disabled={!!editingCategory}
                    className="rounded-xl h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase">{t.questionnaires_manage.categorySortOrder}</Label>
                  <Input
                    type="number"
                    value={catSortOrder}
                    onChange={(e) => setCatSortOrder(Number(e.target.value))}
                    className="rounded-xl h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase">{t.questionnaires_manage.categoryNameHu}</Label>
                  <Input
                    value={catNameHu}
                    onChange={(e) => setCatNameHu(e.target.value)}
                    placeholder="pl. Hangulat & Ă©rzelmi Ăˇllapot"
                    className="rounded-xl h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] text-muted-foreground uppercase">{t.questionnaires_manage.categoryNameEn}</Label>
                  <Input
                    value={catNameEn}
                    onChange={(e) => setCatNameEn(e.target.value)}
                    placeholder="e.g. Mood & emotional state"
                    className="rounded-xl h-9 text-xs"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[10px] text-muted-foreground uppercase">{t.questionnaires_manage.categoryDescHu}</Label>
                  <Textarea
                    value={catDescHu}
                    onChange={(e) => setCatDescHu(e.target.value)}
                    placeholder="pl. KĂ©rdĹ‘Ă­vek a levert hangulatrĂłl..."
                    className="rounded-xl min-h-[60px] text-xs resize-none"
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-[10px] text-muted-foreground uppercase">{t.questionnaires_manage.categoryDescEn}</Label>
                  <Textarea
                    value={catDescEn}
                    onChange={(e) => setCatDescEn(e.target.value)}
                    placeholder="e.g. Questionnaires about low mood..."
                    className="rounded-xl min-h-[60px] text-xs resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Switch checked={catIsActive} onCheckedChange={setCatIsActive} />
                <Label className="text-xs font-semibold text-foreground uppercase">{t.questionnaires_manage.categoryIsActive}</Label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border/10">
                {editingCategory && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-xs"
                    onClick={() => {
                      setEditingCategory(null);
                      setCatKey('');
                      setCatNameHu('');
                      setCatNameEn('');
                      setCatDescHu('');
                      setCatDescEn('');
                      setCatSortOrder(0);
                      setCatIsActive(true);
                    }}
                  >
                    {t.cancel}
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  disabled={savingCategory || !catKey || !catNameHu || !catNameEn}
                  className="rounded-xl text-xs bg-primary text-primary-foreground hover:bg-primary/95 px-4"
                  onClick={async () => {
                    setSavingCategory(true);
                    try {
                      if (editingCategory) {
                        const { error } = await supabase
                          .from('questionnaire_categories')
                          .update({
                            name_hu: catNameHu,
                            name_en: catNameEn,
                            description_hu: catDescHu || null,
                            description_en: catDescEn || null,
                            sort_order: catSortOrder,
                            is_active: catIsActive,
                          })
                          .eq('id', editingCategory.id);
                        if (error) throw error;
                        toast.success(t.questionnaires_manage.categoryUpdated);
                      } else {
                        const { error } = await supabase
                          .from('questionnaire_categories')
                          .insert({
                            key: catKey,
                            name_hu: catNameHu,
                            name_en: catNameEn,
                            description_hu: catDescHu || null,
                            description_en: catDescEn || null,
                            sort_order: catSortOrder,
                            is_active: catIsActive,
                          });
                        if (error) throw error;
                        toast.success(t.questionnaires_manage.categoryCreated);
                      }
                      setEditingCategory(null);
                      setCatKey('');
                      setCatNameHu('');
                      setCatNameEn('');
                      setCatDescHu('');
                      setCatDescEn('');
                      setCatSortOrder(0);
                      setCatIsActive(true);
                      await fetchCategories();
                    } catch (err: any) {
                      toast.error(err.message || 'Failed to save category');
                    } finally {
                      setSavingCategory(false);
                    }
                  }}
                >
                  {savingCategory ? '...' : editingCategory ? t.save : t.create}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default SelfChecks;

