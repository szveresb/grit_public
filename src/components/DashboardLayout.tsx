import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Fragment, useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useStance } from '@/hooks/useStance';
import AppSidebar from '@/components/AppSidebar';
import EmergencyExit from '@/components/EmergencyExit';
import LanguageToggle from '@/components/LanguageToggle';
import ContextAwareToolPanel from '@/components/ContextAwareToolPanel';
import SubjectCardRegistry from '@/components/SubjectCardRegistry';
import FeedbackSheet from '@/components/FeedbackSheet';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage, stripLangPrefix } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { FLogOut, FUser } from '@/components/icons/FreudIcons';
import bambooBg from '@/assets/bamboo-bg.jpg';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface DashboardLayoutProps {
  children: React.ReactNode;
  showSubjectRegistry?: boolean;
  showContextToolPanel?: boolean;
}

const DashboardShell = ({
  children,
  showSubjectRegistry = false,
  showContextToolPanel = true,
}: DashboardLayoutProps) => {
  const { activeSubject } = useStance();
  const { user, signOut, displayName } = useAuth();
  const { t, localePath } = useLanguage();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  
  const currentPath = stripLangPrefix(pathname);
  const segments = currentPath.split('/').filter(Boolean);
  const isActive = (path: string) =>
    currentPath === path || currentPath.startsWith(`${path}/`);

  // Admin/manage routes never render the context tool panel (journal/questionnaire
  // shortcut cards). This stays route-driven so new /admin/* pages are covered
  // automatically, even if callers forget to opt out via props.
  const HIDE_TOOL_PANEL_ROUTES = ['/analyst-export'];
  const isAdminRoute = currentPath === '/admin' || currentPath.startsWith('/admin/');
  const toolPanelHiddenByRoute = isAdminRoute || HIDE_TOOL_PANEL_ROUTES.some(
    (r) => currentPath === r || currentPath.startsWith(`${r}/`),
  );
  const shouldRenderToolPanel = showContextToolPanel && !toolPanelHiddenByRoute;

  const getBreadcrumbLabel = (segment: string) => {
    switch (segment) {
      case 'admin': return t.nav.management;
      case 'library': return t.nav.manageLibrary;
      case 'questionnaires': return t.nav.manageQuestionnaires;
      case 'landing': return t.nav.manageLanding;
      case 'users': return t.nav.manageUsers || 'Manage Users';
      case 'feedback': return t.nav.manageFeedback;
      case 'monitoring': return t.nav.monitoring;
      case 'manage-questionnaires': return t.nav.manageQuestionnaires;
      case 'manage-users': return t.nav.manageUsers || 'Manage Users';
      case 'surveys': return t.nav.surveys;
      case 'journal': return t.nav.checkIn;
      case 'profile': return t.nav.account;
      case 'timeline': return t.timeline?.pageTitle || 'Timeline';
      case 'export': return t.nav.dataExport || 'Export';
      default: return segment.replace(/-/g, ' ');
    }
  };
  const themeClass = activeSubject.type === 'relative' ? 'theme-observer' : 'theme-self';

  const handleGatedClick = (path: string) => {
    navigate(user ? localePath(path) : localePath('/auth'));
  };

  return (
    <SidebarProvider>
      <EmergencyExit />
      <div
        className="fixed inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bambooBg})`, opacity: 0.08 }}
      />
      <div className="fixed inset-0 z-0 bg-background/85" />

      <div className={`min-h-screen flex w-full relative z-10 overflow-x-hidden ${themeClass}`}>
        {user && <AppSidebar onOpenFeedback={() => setFeedbackOpen(true)} />}
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-context-border/70 px-3 sm:px-4 md:px-6 bg-context-surface gap-2 sm:gap-3 overflow-x-auto">
            <SidebarTrigger />
            <Link to={localePath('/')} className="md:hidden text-sm font-bold tracking-tight text-foreground">
              Grit.hu
            </Link>
            <nav className="flex items-center justify-center flex-1 gap-4 md:gap-8">
              <Link
                to={localePath('/library')}
                aria-current={isActive('/library') ? 'page' : undefined}
                className={`hidden lg:inline-flex text-sm font-medium transition-colors hover:text-foreground ${isActive('/library') ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
              >
                {t.nav.library}
              </Link>
              <Link
                to={localePath('/surveys')}
                aria-current={isActive('/surveys') ? 'page' : undefined}
                className={`hidden lg:inline-flex text-sm font-medium transition-colors hover:text-foreground items-center gap-1.5 ${isActive('/surveys') ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
              >
                {t.nav.surveys}
              </Link>
              <button
                onClick={() => handleGatedClick('/journal')}
                aria-current={isActive('/journal') ? 'page' : undefined}
                className={`hidden lg:inline-flex text-sm font-medium transition-colors hover:text-foreground items-center gap-1.5 ${isActive('/journal') ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}
              >
                {t.nav.checkIn}
              </button>
              <a href={`${localePath('/')}#about`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t.nav.about}</a>
            </nav>
            <div className="ml-auto md:ml-4 flex items-center gap-1 sm:gap-2 shrink-0">
              <LanguageToggle />
              {user && (
                <>
                  <Button variant="ghost" size="sm" className="rounded-full gap-1.5" onClick={() => navigate(localePath('/profile'))}>
                    <FUser className="h-4 w-4" />
                    <span className="hidden sm:inline">{displayName || user.email || t.nav.account}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-full gap-1.5 text-muted-foreground" onClick={async () => { await signOut(); navigate(localePath('/')); }}>
                    <FLogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">{t.signOut}</span>
                  </Button>
                </>
              )}
            </div>
          </header>
          <div className="flex-1 px-4 md:px-8 pt-5 md:pt-6 pb-16">
            <div className="max-w-7xl mx-auto w-full">
              {segments.length > 0 && (
                <Breadcrumb className="mb-5 pb-3 border-b border-border/40">
                  <BreadcrumbList>
                    <BreadcrumbItem>
                      <BreadcrumbLink asChild>
                        <Link to={localePath('/')} className="text-muted-foreground hover:text-foreground transition-colors">
                          {t.nav.home}
                        </Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    {segments.map((segment, index) => {
                      const isLast = index === segments.length - 1;
                      const path = `/${segments.slice(0, index + 1).join('/')}`;
                      return (
                        <Fragment key={path}>
                          <BreadcrumbSeparator />
                          <BreadcrumbItem>
                            {isLast ? (
                              <BreadcrumbPage>{getBreadcrumbLabel(segment)}</BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink asChild>
                                <Link to={localePath(path)} className="text-muted-foreground hover:text-foreground transition-colors">
                                  {getBreadcrumbLabel(segment)}
                                </Link>
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>
                        </Fragment>
                      );
                    })}
                  </BreadcrumbList>
                </Breadcrumb>
              )}
              {user && showSubjectRegistry && <SubjectCardRegistry />}
              {user && shouldRenderToolPanel && <ContextAwareToolPanel />}
              {children}
            </div>
          </div>
        </main>
        <FeedbackSheet open={feedbackOpen} onOpenChange={setFeedbackOpen} />
      </div>
    </SidebarProvider>
  );
};

const DashboardLayout = ({ children, showSubjectRegistry, showContextToolPanel }: DashboardLayoutProps) => {
  return (
    <DashboardShell showSubjectRegistry={showSubjectRegistry} showContextToolPanel={showContextToolPanel}>
      {children}
    </DashboardShell>
  );
};

export default DashboardLayout;
