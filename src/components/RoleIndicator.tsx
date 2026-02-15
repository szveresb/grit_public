import { Badge } from '@/components/ui/badge';
import { Eye, Heart, Shield, Pencil, BarChart3, FileEdit } from 'lucide-react';
import { useUserRole, ROLE_LABELS, AppRole } from '@/hooks/useUserRole';

const roleIcons: Record<AppRole, React.ElementType> = {
  admin: Shield,
  editor: Pencil,
  analyst: BarChart3,
  guest_editor: FileEdit,
  observer: Eye,
  affected_person: Heart,
};

const RoleIndicator = () => {
  const { roles, loading } = useUserRole();

  if (loading || roles.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 z-40 flex flex-wrap gap-1.5">
      {roles.map(role => {
        const Icon = roleIcons[role];
        return (
          <Badge
            key={role}
            variant="outline"
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium uppercase tracking-widest bg-card/80 backdrop-blur border-border text-muted-foreground rounded-full"
          >
            <Icon className="h-3 w-3" />
            {ROLE_LABELS[role]}
          </Badge>
        );
      })}
    </div>
  );
};

export default RoleIndicator;
