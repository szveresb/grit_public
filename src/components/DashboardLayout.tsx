import { useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import EmergencyExit from '@/components/EmergencyExit';
import RoleIndicator from '@/components/RoleIndicator';
import LanguageToggle from '@/components/LanguageToggle';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';
import bambooBg from '@/assets/bamboo-bg.jpg';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, signOut } = useAuth();
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
              <button onClick={() => handleGatedClick('/check-in')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                {t.nav.checkIn}
              </button>
              <a href={`${localePath('/')}#about`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t.nav.about}</a>
            </nav>
            <div className="ml-auto lg:ml-4 flex items-center gap-2">
              <LanguageToggle />
              {user && (
                <>
                  <Button variant="ghost" size="sm" className="rounded-full gap-1.5" onClick={() => navigate(localePath('/profile'))}>
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{t.nav.account}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-full gap-1.5 text-muted-foreground" onClick={async () => { await signOut(); navigate(localePath('/')); }}>
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">{t.signOut}</span>
                  </Button>
                </>
              )}
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
