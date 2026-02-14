import { Badge } from '@/components/ui/badge';
import { Eye } from 'lucide-react';

const RoleIndicator = () => {
  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Badge
        variant="outline"
        className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono uppercase tracking-widest bg-background border-border text-muted-foreground"
      >
        <Eye className="h-3 w-3" />
        Mode: Observer
      </Badge>
    </div>
  );
};

export default RoleIndicator;
