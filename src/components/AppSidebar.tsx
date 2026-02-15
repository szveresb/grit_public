import { useLocation } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useUserRole } from '@/hooks/useUserRole';
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  Clock,
  Download,
  User,
  Library,
  Users,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarHeader,
} from '@/components/ui/sidebar';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Journal', url: '/journal', icon: BookOpen },
  { title: 'Self-Checks', url: '/self-checks', icon: ClipboardCheck },
  { title: 'History', url: '/timeline', icon: Clock },
  { title: 'Data Export', url: '/export', icon: Download },
  { title: 'Account', url: '/profile', icon: User },
];

const AppSidebar = () => {
  const location = useLocation();
  const { hasAnyRole, hasRole } = useUserRole();
  const canManageLibrary = hasAnyRole('admin', 'editor', 'guest_editor');
  const isAdmin = hasRole('admin');

  const editorItems = [
    ...(canManageLibrary ? [{ title: 'Manage Library', url: '/manage-library', icon: Library }] : []),
    ...(isAdmin ? [{ title: 'Manage Users', url: '/manage-users', icon: Users }] : []),
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-5 py-5">
        <span className="text-sm font-semibold tracking-tight text-foreground">
          🌿 Grit.hu
        </span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Navigate
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === item.url}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      end
                      className="hover:bg-accent rounded-xl"
                      activeClassName="bg-accent text-foreground font-semibold rounded-xl"
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {editorItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Management
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {editorItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={location.pathname === item.url}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={item.url}
                        end
                        className="hover:bg-accent rounded-xl"
                        activeClassName="bg-accent text-foreground font-semibold rounded-xl"
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
