import * as React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { NavLink } from '@/components/NavLink';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { stripLangPrefix } from '@/hooks/useLanguage';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  FHome, FDashboard, FHeartPulse, FClock, FDownload, FUser,
  FLibrary, FUsers, FBarChart, FFileText, FInfo, FLock, FTimeline, FMessageCircle, FChevronDown,
} from '@/components/icons/FreudIcons';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarHeader,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AppSidebarProps {
  onOpenFeedback: () => void;
}

const AppSidebar = ({ onOpenFeedback }: AppSidebarProps) => {
  const location = useLocation();
  const { user, displayName } = useAuth();
  const { t, localePath } = useLanguage();
  const isMobile = useIsMobile();
  const { hasAnyRole, hasRole } = useUserRole();

  const canManageLibrary = hasAnyRole('admin', 'editor', 'guest_editor');
  const canAnalyse = hasAnyRole('admin', 'analyst');
  const isAdmin = hasRole('admin');

  const currentPath = stripLangPrefix(location.pathname);
  const accountTitle = displayName || user?.email || t.nav.account;

  const navItems = [
    { title: t.nav.home, url: '/', icon: FHome },
    { title: t.nav.checkIn, url: '/journal', icon: FHeartPulse },
    { title: t.timeline.pageTitle, url: '/timeline', icon: FTimeline },
    { title: t.nav.surveys, url: '/surveys', icon: FFileText },
    { title: t.nav.library, url: '/library', icon: FLibrary },
    { title: t.nav.dataExport, url: '/export', icon: FDownload },
    { title: accountTitle, url: '/profile', icon: FUser },
  ];

  const topMenuItems = [
    { title: t.nav.library, url: '/library', icon: FLibrary },
    { title: t.nav.surveys, url: '/surveys', icon: FFileText },
    { title: t.nav.about, url: '/#about', icon: FInfo },
  ];

  const canManageQuestionnaires = hasAnyRole('admin', 'editor');

  const canManageLanding = hasAnyRole('admin', 'editor');
  const [isMySpaceOpen, setIsMySpaceOpen] = React.useState(true);
  const [isManagementOpen, setIsManagementOpen] = React.useState(true);

  const editorItems = [
    ...(canManageLibrary ? [{ title: t.nav.manageLibrary, url: '/manage-library', icon: FLibrary }] : []),
    ...(canManageQuestionnaires ? [{ title: t.nav.manageQuestionnaires, url: '/manage-questionnaires', icon: FFileText }] : []),
    ...(canManageLanding ? [{ title: t.nav.manageLanding, url: '/manage-landing', icon: FHome }] : []),
    ...(isAdmin ? [{ title: t.nav.manageUsers, url: '/manage-users', icon: FUsers }] : []),
    ...(isAdmin ? [{ title: t.nav.manageFeedback, url: '/manage-feedback', icon: FMessageCircle }] : []),
    ...(canAnalyse ? [{ title: t.nav.analystExport, url: '/analyst-export', icon: FBarChart }] : []),
  ];

  const renderMenuItem = (item: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }) => (
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
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-5 py-5">
        <Link to={localePath('/')} className="text-sm font-semibold tracking-tight text-foreground hover:text-primary transition-colors">
          🌿 {t.brand}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <Collapsible open={isMySpaceOpen} onOpenChange={setIsMySpaceOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
              <span>{t.nav.mySpace}</span>
              <FChevronDown className={`h-3.5 w-3.5 transition-transform ${isMySpaceOpen ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navItems.map(renderMenuItem)}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
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
                    isActive={currentPath === '/journal'}
                    tooltip={t.nav.checkIn}
                  >
                    <NavLink
                      to={user ? localePath('/journal') : localePath('/auth')}
                      end
                      className="hover:bg-accent rounded-xl"
                      activeClassName="bg-accent text-foreground font-semibold rounded-xl"
                    >
                      <FHeartPulse className="h-4 w-4" />
                      <span>{t.nav.checkIn}</span>
                      {!user && <FLock className="h-3 w-3 ml-auto" />}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {editorItems.length > 0 && (
          <SidebarGroup>
            <Collapsible open={isManagementOpen} onOpenChange={setIsManagementOpen}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground">
                <span>{t.nav.management}</span>
                <FChevronDown className={`h-3.5 w-3.5 transition-transform ${isManagementOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {editorItems.map(renderMenuItem)}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        )}

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t.nav.explore}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={t.nav.feedback}
                  onClick={onOpenFeedback}
                  className="hover:bg-accent rounded-xl"
                >
                  <FMessageCircle className="h-4 w-4" />
                  <span>{t.nav.feedback}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSidebar;
