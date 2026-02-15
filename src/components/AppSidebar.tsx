import { useLocation, Link } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { stripLangPrefix } from '@/hooks/useLanguage';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Home, LayoutDashboard, BookOpen, ClipboardCheck, Clock, Download, User,
  Library, Users, BarChart3, FileText, Info, Lock,
} from 'lucide-react';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader,
} from '@/components/ui/sidebar';

const AppSidebar = () => {
  const location = useLocation();
  const { user } = useAuth();
  const { t, localePath } = useLanguage();
  const isMobile = useIsMobile();
  const { hasAnyRole, hasRole } = useUserRole();
  const canManageLibrary = hasAnyRole('admin', 'editor', 'guest_editor');
  const canAnalyse = hasAnyRole('admin', 'analyst');
  const isAdmin = hasRole('admin');

  const currentPath = stripLangPrefix(location.pathname);

  const navItems = [
    { title: t.nav.home, url: '/', icon: Home },
    { title: t.dashboard, url: '/dashboard', icon: LayoutDashboard },
    { title: t.nav.journal, url: '/journal', icon: BookOpen },
    { title: t.nav.selfChecks, url: '/self-checks', icon: ClipboardCheck },
    { title: t.nav.history, url: '/timeline', icon: Clock },
    { title: t.nav.dataExport, url: '/export', icon: Download },
    { title: t.nav.account, url: '/profile', icon: User },
  ];

  const topMenuItems = [
    { title: t.nav.library, url: '/#library', icon: Library },
    { title: t.nav.researchSummaries, url: '/#research', icon: FileText },
    { title: t.nav.about, url: '/#about', icon: Info },
  ];

  const editorItems = [
    ...(canManageLibrary ? [{ title: t.nav.manageLibrary, url: '/manage-library', icon: Library }] : []),
    ...(isAdmin ? [{ title: t.nav.manageUsers, url: '/manage-users', icon: Users }] : []),
    ...(canAnalyse ? [{ title: t.nav.analystExport, url: '/analyst-export', icon: BarChart3 }] : []),
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-5 py-5">
        <Link to={localePath('/')} className="text-sm font-semibold tracking-tight text-foreground hover:text-primary transition-colors">
          🌿 {t.brand}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t.nav.navigate}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === item.url}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={localePath(item.url)}
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

        {isMobile && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t.nav.explore}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {topMenuItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <a href={localePath('/') + item.url.slice(1)} className="hover:bg-accent rounded-xl">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={currentPath === '/self-checks'}
                    tooltip={t.nav.selfChecks}
                  >
                    <NavLink
                      to={user ? localePath('/self-checks') : localePath('/auth')}
                      end
                      className="hover:bg-accent rounded-xl"
                      activeClassName="bg-accent text-foreground font-semibold rounded-xl"
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      <span>{t.nav.selfChecks}</span>
                      {!user && <Lock className="h-3 w-3 ml-auto" />}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {editorItems.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {t.nav.management}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {editorItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      isActive={currentPath === item.url}
                      tooltip={item.title}
                    >
                      <NavLink
                        to={localePath(item.url)}
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
