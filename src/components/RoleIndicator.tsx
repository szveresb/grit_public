import { Badge } from '@/components/ui/badge';
import { Eye, Heart } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

const RoleIndicator = () => {
  const { currentRole, loading } = useUserRole();

  if (loading) return null;

  const isObserver = currentRole === 'observer';

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <Badge
        variant="outline"
        className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-mono uppercase tracking-widest bg-background border-border text-muted-foreground"
      >
        {isObserver ? <Eye className="h-3 w-3" /> : <Heart className="h-3 w-3" />}
        Mode: {isObserver ? 'Observer' : 'Affected Person'}
      </Badge>
    </div>
  );
};

export default RoleIndicator;
