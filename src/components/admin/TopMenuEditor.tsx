import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { FPlus, FTrash, FChevronUp, FChevronDown } from '@/components/icons/FreudIcons';

export interface TopMenuItem {
  label_hu: string;
  label_en: string;
  url: string;
  gated?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

interface Props {
  items: TopMenuItem[];
  onChange: (items: TopMenuItem[]) => void;
}

const blank = (n: number): TopMenuItem => ({
  label_hu: '', label_en: '', url: '/', gated: false, is_active: true, sort_order: n,
});

const TopMenuEditor = ({ items, onChange }: Props) => {
  const update = (i: number, patch: Partial<TopMenuItem>) =>
    onChange(items.map((it, idx) => idx === i ? { ...it, ...patch } : it));
  const remove = (i: number) => onChange(items.filter((_, idx) => idx !== i));
  const add = () => onChange([...items, blank(items.length)]);
  const move = (i: number, delta: number) => {
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next.map((it, idx) => ({ ...it, sort_order: idx })));
  };

  return (
    <div className="space-y-3">
      {items.map((it, i) => (
        <div key={i} className="rounded-2xl border border-border p-4 space-y-3 bg-background/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0} className="rounded-full h-7 w-7 p-0">
                <FChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === items.length - 1} className="rounded-full h-7 w-7 p-0">
                <FChevronDown className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs text-muted-foreground ml-2">#{i + 1}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Auth-gated</Label>
                <Switch checked={!!it.gated} onCheckedChange={(v) => update(i, { gated: v })} />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Active</Label>
                <Switch checked={it.is_active !== false} onCheckedChange={(v) => update(i, { is_active: v })} />
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove(i)} className="rounded-full h-8 w-8 p-0">
                <FTrash className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Label (HU)</Label>
              <Input value={it.label_hu} onChange={(e) => update(i, { label_hu: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Label (EN)</Label>
              <Input value={it.label_en} onChange={(e) => update(i, { label_en: e.target.value })} className="rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">URL (/path or https://)</Label>
              <Input value={it.url} onChange={(e) => update(i, { url: e.target.value })} className="rounded-xl" placeholder="/library or /category/my-topic" />
            </div>
          </div>
        </div>
      ))}
      <Button size="sm" variant="outline" onClick={add} className="rounded-2xl gap-1.5">
        <FPlus className="h-4 w-4" /> Add menu item
      </Button>
    </div>
  );
};

export default TopMenuEditor;