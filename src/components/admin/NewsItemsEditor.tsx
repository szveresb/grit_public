import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { friendlyDbError } from '@/lib/db-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FPlus, FPencil, FTrash, FClose, FSave, FSearch, FLoader } from '@/components/icons/FreudIcons';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type NewsCategory = 'feature' | 'upgrade' | 'fix';

interface NewsItem {
  id: string;
  title: string;
  title_localized: Record<string, string> | null;
  body: string;
  body_localized: Record<string, string> | null;
  category: NewsCategory;
  is_published: boolean;
  sort_order: number;
  published_at: string;
}

const categories: NewsCategory[] = ['feature', 'upgrade', 'fix'];

const emptyForm = {
  title_hu: '',
  title_en: '',
  body_hu: '',
  body_en: '',
  category: 'feature' as NewsCategory,
  is_published: true,
  sort_order: 0,
};

const NewsItemsEditor = () => {
  const { t } = useLanguage();
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'All' | NewsCategory>('All');
  const formRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const { data } = await supabase
      .from('news_items')
      .select('*')
      .order('sort_order', { ascending: false })
      .order('published_at', { ascending: false });
    setItems((data ?? []) as unknown as NewsItem[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return items.filter(it => {
      const q = searchQuery.toLowerCase();
      const titleHu = (it.title_localized?.hu ?? it.title ?? '').toLowerCase();
      const titleEn = (it.title_localized?.en ?? '').toLowerCase();
      const bodyHu = (it.body_localized?.hu ?? it.body ?? '').toLowerCase();
      const matchesSearch = !q || titleHu.includes(q) || titleEn.includes(q) || bodyHu.includes(q);
      const matchesCategory = filterCategory === 'All' || it.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, filterCategory]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const openEdit = (it: NewsItem) => {
    setEditingId(it.id);
    setForm({
      title_hu: it.title_localized?.hu ?? it.title ?? '',
      title_en: it.title_localized?.en ?? '',
      body_hu: it.body_localized?.hu ?? it.body ?? '',
      body_en: it.body_localized?.en ?? '',
      category: it.category,
      is_published: it.is_published,
      sort_order: it.sort_order,
    });
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleSave = async () => {
    if (!form.title_hu.trim()) {
      toast.error(t.errors.titleRequired);
      return;
    }
    setSaving(true);
    const payload = {
      title: form.title_hu.trim(),
      title_localized: {
        hu: form.title_hu.trim(),
        ...(form.title_en.trim() ? { en: form.title_en.trim() } : {}),
      },
      body: form.body_hu.trim(),
      body_localized: {
        hu: form.body_hu.trim(),
        ...(form.body_en.trim() ? { en: form.body_en.trim() } : {}),
      },
      category: form.category,
      is_published: form.is_published,
      sort_order: form.sort_order,
    };
    if (editingId) {
      const { error } = await supabase.from('news_items').update(payload).eq('id', editingId);
      if (error) { toast.error(friendlyDbError(error)); setSaving(false); return; }
      toast.success(t.admin.manageNews.saved);
    } else {
      const { error } = await supabase.from('news_items').insert(payload);
      if (error) { toast.error(friendlyDbError(error)); setSaving(false); return; }
      toast.success(t.admin.manageNews.created);
    }
    setSaving(false);
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('news_items').delete().eq('id', id);
    if (error) { toast.error(friendlyDbError(error)); return; }
    toast.success(t.admin.manageNews.deleted);
    setItems(prev => prev.filter(it => it.id !== id));
  };

  const categoryLabel = (c: NewsCategory) =>
    c === 'feature' ? t.admin.manageNews.categoryFeature
      : c === 'upgrade' ? t.admin.manageNews.categoryUpgrade
      : t.admin.manageNews.categoryFix;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {items.length === 0 && !loading ? t.admin.manageNews.empty : null}
        </p>
        <Button size="sm" className="rounded-2xl gap-1.5" onClick={openCreate}>
          <FPlus className="h-4 w-4" />
          {t.admin.manageNews.newItem}
        </Button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <FSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t.admin.manageNews.searchPlaceholder}
            className="pl-9 rounded-2xl"
          />
        </div>
        <select
          value={filterCategory}
          onChange={e => setFilterCategory(e.target.value as 'All' | NewsCategory)}
          className="border border-input rounded-2xl px-3 h-10 text-sm bg-background"
        >
          <option value="All">{t.admin.manageNews.allCategories}</option>
          {categories.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
        </select>
      </div>

      {showForm && (
        <div ref={formRef} className="surface-card p-6 space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {editingId ? t.admin.manageNews.editItem : t.admin.manageNews.newItem}
            </h3>
            <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}>
              <FClose className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-6">
            {/* Hungarian */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.admin.manageNews.titleHu}</Label>
                <Input
                  value={form.title_hu}
                  onChange={e => setForm(f => ({ ...f, title_hu: e.target.value }))}
                  placeholder={t.admin.manageNews.titleHu}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.admin.manageNews.bodyHu}</Label>
                <Textarea
                  value={form.body_hu}
                  onChange={e => setForm(f => ({ ...f, body_hu: e.target.value }))}
                  rows={4}
                  className="rounded-2xl"
                />
              </div>
            </div>

            <div className="border-t border-border/40" />

            {/* English */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.admin.manageNews.titleEn}</Label>
                <Input
                  value={form.title_en}
                  onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))}
                  placeholder={t.admin.manageNews.titleEn}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.admin.manageNews.bodyEn}</Label>
                <Textarea
                  value={form.body_en}
                  onChange={e => setForm(f => ({ ...f, body_en: e.target.value }))}
                  rows={4}
                  className="rounded-2xl"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.admin.manageNews.category}</Label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value as NewsCategory }))}
                className="w-full border border-input rounded-2xl px-3 h-10 text-sm bg-background"
              >
                {categories.map(c => <option key={c} value={c}>{categoryLabel(c)}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.admin.manageNews.sortOrder}</Label>
              <Input
                type="number"
                value={form.sort_order}
                onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))}
                className="rounded-2xl"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Switch
              checked={form.is_published}
              onCheckedChange={v => setForm(f => ({ ...f, is_published: v }))}
            />
            <Label className="text-sm">{t.published}</Label>
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="rounded-2xl" onClick={handleSave} disabled={saving}>
              <FSave className="h-4 w-4 mr-1" />
              {saving ? t.saving : editingId ? t.update : t.create}
            </Button>
            <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => setShowForm(false)}>
              {t.cancel}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <FLoader className="h-4 w-4 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="surface-card p-6">
            <p className="text-sm text-muted-foreground">
              {items.length === 0 ? t.admin.manageNews.empty : t.admin.manageNews.noMatch}
            </p>
          </div>
        ) : (
          filtered.map(it => {
            const displayTitle = it.title_localized?.hu ?? it.title;
            const displayBody = it.body_localized?.hu ?? it.body;
            return (
              <div key={it.id} className="surface-card p-5 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="rounded-full text-[10px] font-semibold uppercase tracking-wider">
                      {categoryLabel(it.category)}
                    </Badge>
                    {!it.is_published && (
                      <Badge variant="outline" className="rounded-full text-[10px]">{t.draft}</Badge>
                    )}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground truncate">{displayTitle || '—'}</h3>
                  {displayBody && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{displayBody}</p>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(it)}>
                    <FPencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                        <FTrash className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.admin.manageNews.delete}</AlertDialogTitle>
                        <AlertDialogDescription>{t.admin.manageNews.deleteConfirm}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(it.id)}>{t.admin.manageNews.delete}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NewsItemsEditor;