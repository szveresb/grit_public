import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import EmergencyExit from '@/components/EmergencyExit';
import RoleIndicator from '@/components/RoleIndicator';
import LanguageToggle from '@/components/LanguageToggle';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import bambooBg from '@/assets/bamboo-bg.jpg';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user } = useAuth();
  const { t, localePath } = useLanguage();
  const navigate = useNavigate();

  const handleGatedClick = (path: string) => {
    navigate(user ? localePath(path) : localePath('/auth'));
  };

  return (
    <SidebarProvider>
      <EmergencyExit />
      <RoleIndicator />
      <div
        className="fixed inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bambooBg})`, opacity: 0.08 }}
      />
      <div className="fixed inset-0 z-0 bg-background/85" />

      <div className="min-h-screen flex w-full relative z-10">
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border/60 px-5 bg-card/40 backdrop-blur-sm gap-3">
            <SidebarTrigger />
            <nav className="hidden lg:flex items-center gap-8 ml-auto">
              <a href={`${localePath('/')}#library`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t.nav.library}</a>
              <a href={`${localePath('/')}#research`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t.nav.researchSummaries}</a>
              <button onClick={() => handleGatedClick('/self-checks')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                {t.nav.selfChecks}
              </button>
              <a href={`${localePath('/')}#about`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t.nav.about}</a>
            </nav>
            <div className="ml-auto lg:ml-4">
              <LanguageToggle />
            </div>
          </header>
          <div className="flex-1 p-6 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
