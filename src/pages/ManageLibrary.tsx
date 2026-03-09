import { useEffect, useState, useMemo } from 'react';
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Article {
  id: string; title: string; excerpt: string | null; source: string | null;
  url: string | null; category: string; published: boolean; created_at: string;
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
  const emptyForm = { title: '', excerpt: '', source: '', url: '', category: 'Article', published: true };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');

  const isEditor = hasRole('admin') || hasRole('editor') || hasRole('guest_editor');

  const fetchArticles = async () => {
    const { data } = await supabase.from('library_articles').select('*').order('created_at', { ascending: false });
    setArticles(data ?? []); setLoading(false);
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
  if (!isEditor) return <Navigate to="/dashboard" replace />;

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (a: Article) => {
    setEditingId(a.id);
    setForm({ title: a.title, excerpt: a.excerpt ?? '', source: a.source ?? '', url: (a as any).url ?? '', category: a.category, published: a.published });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    const payload = { title: form.title.trim(), excerpt: form.excerpt.trim() || null, source: form.source.trim() || null, url: form.url.trim() || null, category: form.category.trim() || 'Article', published: form.published };
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
      <div className="max-w-3xl space-y-6">
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
          <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {editingId ? t.manageLibrary.editArticle : t.manageLibrary.newArticle}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowForm(false)}><FClose className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.manageLibrary.articleTitle}</Label>
              <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={t.manageLibrary.articleTitle} className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.manageLibrary.excerpt}</Label>
              <Textarea value={form.excerpt} onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))} rows={3} className="rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{t.manageLibrary.url}</Label>
              <Input value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://..." className="rounded-2xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
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
            <div className="flex items-center gap-3">
              <Switch checked={form.published} onCheckedChange={v => setForm(f => ({ ...f, published: v }))} />
              <Label className="text-sm">{t.published}</Label>
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
            <div className="bg-card/60 backdrop-blur border border-border rounded-3xl p-6">
              <p className="text-sm text-muted-foreground">{articles.length === 0 ? t.manageLibrary.noArticles : t.manageLibrary.noMatch}</p>
            </div>
          ) : (
            filteredArticles.map(a => (
              <div key={a.id} className="bg-card/60 backdrop-blur border border-border rounded-3xl p-5 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="rounded-full text-[10px] font-semibold uppercase tracking-wider">{a.category}</Badge>
                    {!a.published && <Badge variant="outline" className="rounded-full text-[10px]">{t.draft}</Badge>}
                  </div>
                  <h3 className="text-sm font-semibold text-foreground truncate">{a.title}</h3>
                  {a.excerpt && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.excerpt}</p>}
                  {a.source && <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mt-2">{a.source}</p>}
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
