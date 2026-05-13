import { useEffect, useState, useMemo, useRef } from 'react';
import { friendlyDbError } from '@/lib/db-error';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { FPlus, FPencil, FTrash, FClose, FSave, FSearch } from '@/components/icons/FreudIcons';
import { Navigate } from 'react-router-dom';
import { stripMarkdown } from '@/lib/simple-markdown';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Article {
  id: string; title: string; excerpt: string | null; source: string | null;
  url: string | null; image_url: string | null; category: string; published: boolean; featured: boolean; author: string; created_at: string;
  title_localized: Record<string, string> | null; excerpt_localized: Record<string, string> | null;
}

const categories = ['Article', 'Research', 'Book', 'Study Summary'];

const ManageLibrary = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { hasRole, loading: roleLoading } = useUserRole();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const emptyForm = { title: '', excerpt: '', source: '', url: '', category: 'Article', published: true, image_url: '', featured: false, author: '', title_en: '', excerpt_en: '' };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const formRef = useRef<HTMLDivElement>(null);
  const excerptHuRef = useRef<HTMLTextAreaElement>(null);
  const excerptEnRef = useRef<HTMLTextAreaElement>(null);
  const [filterCategory, setFilterCategory] = useState('All');

  const isEditor = hasRole('admin') || hasRole('editor') || hasRole('guest_editor');

  type ExcerptField = 'excerpt' | 'excerpt_en';
  const applyFormat = (field: ExcerptField, kind: 'bold' | 'italic' | 'heading' | 'list' | 'link') => {
    const ref = field === 'excerpt' ? excerptHuRef.current : excerptEnRef.current;
    if (!ref) return;
    const start = ref.selectionStart ?? 0;
    const end = ref.selectionEnd ?? 0;
    const value = ref.value;
    const selected = value.slice(start, end);
    let before = value.slice(0, start);
    let after = value.slice(end);
    let inserted = '';
    let cursorOffset = 0;
    if (kind === 'bold') {
      inserted = `**${selected || 'bold'}**`;
      cursorOffset = selected ? inserted.length : 2 + 4;
    } else if (kind === 'italic') {
      inserted = `*${selected || 'italic'}*`;
      cursorOffset = selected ? inserted.length : 1 + 6;
    } else if (kind === 'heading') {
      // Heading must start its own line
      if (before.length > 0 && !before.endsWith('\n')) before += '\n';
      inserted = `## ${selected || 'Heading'}`;
      cursorOffset = inserted.length;
      if (!after.startsWith('\n')) after = '\n' + after;
    } else if (kind === 'list') {
      if (before.length > 0 && !before.endsWith('\n')) before += '\n';
      inserted = `- ${selected || 'item'}`;
      cursorOffset = inserted.length;
      if (!after.startsWith('\n')) after = '\n' + after;
    } else if (kind === 'link') {
      const url = window.prompt(t.manageLibrary.linkPromptUrl, 'https://');
      if (!url) return;
      const label = selected || window.prompt(t.manageLibrary.linkPromptText, '') || url;
      inserted = `[${label}](${url})`;
      cursorOffset = inserted.length;
    }
    const next = before + inserted + after;
    setForm(f => ({ ...f, [field]: next } as typeof f));
    requestAnimationFrame(() => {
      ref.focus();
      const pos = before.length + cursorOffset;
      ref.setSelectionRange(pos, pos);
    });
  };

  const FormatToolbar = ({ field }: { field: ExcerptField }) => (
    <div className="flex flex-wrap items-center gap-1">
      <Button type="button" variant="outline" size="sm" className="h-7 px-2 rounded-xl text-xs font-bold" onClick={() => applyFormat(field, 'bold')} title={t.manageLibrary.formatBold}>B</Button>
      <Button type="button" variant="outline" size="sm" className="h-7 px-2 rounded-xl text-xs italic" onClick={() => applyFormat(field, 'italic')} title={t.manageLibrary.formatItalic}>I</Button>
      <Button type="button" variant="outline" size="sm" className="h-7 px-2 rounded-xl text-xs" onClick={() => applyFormat(field, 'heading')} title={t.manageLibrary.formatHeading}>H</Button>
      <Button type="button" variant="outline" size="sm" className="h-7 px-2 rounded-xl text-xs" onClick={() => applyFormat(field, 'list')} title={t.manageLibrary.formatList}>•</Button>
      <Button type="button" variant="outline" size="sm" className="h-7 px-2 rounded-xl text-xs" onClick={() => applyFormat(field, 'link')} title={t.manageLibrary.formatLink}>🔗</Button>
    </div>
  );

  const fetchArticles = async () => {
    const { data } = await supabase.from('library_articles').select('*').order('created_at', { ascending: false });
    setArticles((data as Article[]) ?? []); setLoading(false);
  };

  useEffect(() => { if (user && isEditor) fetchArticles(); }, [user, isEditor]);

  const filteredArticles = useMemo(() => {
    return articles.filter(a => {
      const matchesSearch = !searchQuery || a.title.toLowerCase().includes(searchQuery.toLowerCase()) || (a.excerpt?.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = filterCategory === 'All' || a.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [articles, searchQuery, filterCategory]);

  if (roleLoading) return <DashboardLayout><p className="text-sm text-muted-foreground">{t.loading}</p></DashboardLayout>;
  if (!isEditor) return <Navigate to="/journal" replace />;

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100); };
  const openEdit = (a: Article) => {
    setEditingId(a.id);
    setForm({ title: a.title, excerpt: a.excerpt ?? '', source: a.source ?? '', url: a.url ?? '', category: a.category, published: a.published, image_url: a.image_url ?? '', featured: a.featured, author: a.author === 'Grit.hu' ? '' : a.author, title_en: a.title_localized?.en ?? '', excerpt_en: a.excerpt_localized?.en ?? '' });
    setShowForm(true);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error(t.errors.titleRequired); return; }
    setSaving(true);
    const titleLocalized = form.title_en.trim() ? { en: form.title_en.trim() } : {};
    const excerptLocalized = form.excerpt_en.trim() ? { en: form.excerpt_en.trim() } : {};
    const payload = { title: form.title.trim(), excerpt: form.excerpt.trim() || null, source: form.source.trim() || null, url: form.url.trim() || null, image_url: form.image_url.trim() || null, category: form.category.trim() || 'Article', published: form.published, featured: form.featured, author: form.author.trim() || 'Grit.hu', title_localized: titleLocalized, excerpt_localized: excerptLocalized };
    if (editingId) {
      const { error } = await supabase.from('library_articles').update(payload).eq('id', editingId);
      if (error) { toast.error(friendlyDbError(error)); setSaving(false); return; }
      toast.success(t.manageLibrary.articleUpdated);
    } else {
      const { error } = await supabase.from('library_articles').insert(payload);
      if (error) { toast.error(friendlyDbError(error)); setSaving(false); return; }
      toast.success(t.manageLibrary.articleCreated);
    }
    setSaving(false); setShowForm(false); setForm(emptyForm); setEditingId(null); fetchArticles();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('library_articles').delete().eq('id', id);
    if (error) { toast.error(friendlyDbError(error)); return; }
    toast.success(t.manageLibrary.articleDeleted); fetchArticles();
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">{t.manageLibrary.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.manageLibrary.subtitle}</p>
          </div>
          <Button size="sm" className="rounded-2xl" onClick={openCreate}>
            <FPlus className="h-4 w-4 mr-1" /> {t.manageLibrary.newArticle}
          </Button>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <FSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder={t.manageLibrary.searchArticles} className="pl-9 rounded-2xl" />
          </div>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="border border-input rounded-2xl px-3 h-10 text-sm bg-background">
            <option value="All">{t.manageLibrary.allCategories}</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {showForm && (
          <div ref={formRef} className="surface-card p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {editingId ? t.manageLibrary.editArticle : t.manageLibrary.newArticle}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><FClose className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.manageLibrary.titleHu}</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t.manageLibrary.titleHu} className="rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.manageLibrary.titleEn}</Label>
                <Input value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} placeholder={t.manageLibrary.titleEn} className="rounded-2xl" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.manageLibrary.excerptHu}</Label>
                <FormatToolbar field="excerpt" />
                <Textarea ref={excerptHuRef} value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} rows={5} className="rounded-2xl font-mono text-xs" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.manageLibrary.excerptEn}</Label>
                <FormatToolbar field="excerpt_en" />
                <Textarea ref={excerptEnRef} value={form.excerpt_en} onChange={e => setForm(f => ({ ...f, excerpt_en: e.target.value }))} rows={5} className="rounded-2xl font-mono text-xs" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground -mt-2">{t.manageLibrary.markdownHint}</p>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.manageLibrary.url}</Label>
              <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.manageLibrary.imageUrl}</Label>
              <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} placeholder="https://images.unsplash.com/..." className="rounded-2xl" />
              {form.image_url && (
                <img src={form.image_url} alt={t.ui.previewAlt} className="mt-2 h-24 w-full object-cover rounded-2xl border border-border" onError={e => (e.currentTarget.style.display = 'none')} />
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.manageLibrary.author}</Label>
                <Input value={form.author} onChange={e => setForm(f => ({ ...f, author: e.target.value }))} placeholder="Grit.hu" className="rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.manageLibrary.source}</Label>
                <Input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} className="rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.manageLibrary.category}</Label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-input rounded-2xl px-3 h-10 text-sm bg-background">
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <Switch checked={form.published} onCheckedChange={v => setForm(f => ({ ...f, published: v }))} />
                <Label className="text-sm">{t.published}</Label>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={form.featured} onCheckedChange={v => setForm(f => ({ ...f, featured: v }))} />
                <Label className="text-sm">⭐ {t.featured}</Label>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="rounded-2xl" onClick={handleSave} disabled={saving}>
                <FSave className="h-4 w-4 mr-1" /> {saving ? t.saving : editingId ? t.update : t.create}
              </Button>
              <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => setShowForm(false)}>{t.cancel}</Button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">{t.manageLibrary.loadingArticles}</p>
          ) : filteredArticles.length === 0 ? (
            <div className="surface-card p-6">
              <p className="text-sm text-muted-foreground">{articles.length === 0 ? t.manageLibrary.noArticles : t.manageLibrary.noMatch}</p>
            </div>
          ) : (
            filteredArticles.map(a => (
              <div key={a.id} className="surface-card p-5 flex items-start gap-4">
                {a.image_url && (
                  <img src={a.image_url} alt="" className="h-16 w-16 rounded-2xl object-cover shrink-0 border border-border" onError={e => (e.currentTarget.style.display = 'none')} />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="rounded-full text-[10px] font-semibold uppercase tracking-wider">{a.category}</Badge>
                    {!a.published && <Badge variant="outline" className="rounded-full text-[10px]">{t.draft}</Badge>}
                    {a.featured && <Badge variant="default" className="rounded-full text-[10px]">⭐ {t.featured}</Badge>}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground truncate">{a.title}</h3>
                  {a.excerpt && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{stripMarkdown(a.excerpt)}</p>}
                  {a.source && <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-2">{a.author} · {a.source}</p>}
                  {!a.source && <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-2">{a.author}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(a)}><FPencil className="h-3.5 w-3.5" /></Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><FTrash className="h-3.5 w-3.5" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.manageLibrary.deleteConfirmTitle}</AlertDialogTitle>
                        <AlertDialogDescription>{t.manageLibrary.deleteConfirmDesc.replace('{title}', a.title)}</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(a.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t.delete}</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ManageLibrary;
