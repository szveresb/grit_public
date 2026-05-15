import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { FPlus, FTrash } from '@/components/icons/FreudIcons';

export interface CategoryItem {
  slug: string;
  label_hu: string;
  label_en: string;
  description_hu?: string;
  description_en?: string;
  article_category: string;
  is_active?: boolean;
}

interface Props {
  items: CategoryItem[];
  onChange: (items: CategoryItem[]) => void;
  availableCategories: string[];
}

const blank = (): CategoryItem => ({
  slug: '', label_hu: '', label_en: '', article_category: '', is_active: true,
});

const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const ContentCategoriesEditor = ({ items, onChange, availableCategories }: Props) => {
  const update = (i: number, patch: Partial<CategoryItem>) =>
    onChange(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, blank()]);

  return (
    <div className="space-y-4">
      {items.map((it, i) => (
        <div key={i} className="rounded-2xl border border-border p-4 space-y-3 bg-background/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              /category/{it.slug || '...'}
            </span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Active</Label>
                <Switch checked={it.is_active !== false} onCheckedChange={(v) => update(i, { is_active: v })} />
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove(i)} className="rounded-full h-8 w-8 p-0">
                <FTrash className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Label (HU)</Label>
              <Input value={it.label_hu} onChange={(e) => update(i, { label_hu: e.target.value, slug: it.slug || slugify(e.target.value) })} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Label (EN)</Label>
              <Input value={it.label_en} onChange={(e) => update(i, { label_en: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Slug (URL)</Label>
              <Input value={it.slug} onChange={(e) => update(i, { slug: slugify(e.target.value) })} className="rounded-xl" placeholder="my-topic" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Library category filter</Label>
              <Input
                value={it.article_category}
                onChange={(e) => update(i, { article_category: e.target.value })}
                className="rounded-xl"
                list={`cat-options-${i}`}
                placeholder="Article"
              />
              <datalist id={`cat-options-${i}`}>
                {availableCategories.map((c) => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs text-muted-foreground">Description (HU)</Label>
              <Textarea value={it.description_hu ?? ''} onChange={(e) => update(i, { description_hu: e.target.value })} className="rounded-xl min-h-[60px]" />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-xs text-muted-foreground">Description (EN)</Label>
              <Textarea value={it.description_en ?? ''} onChange={(e) => update(i, { description_en: e.target.value })} className="rounded-xl min-h-[60px]" />
            </div>
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add} className="rounded-2xl gap-1.5">
        <FPlus className="h-4 w-4" /> Add category
      </Button>
    </div>
  );
};

export default ContentCategoriesEditor;