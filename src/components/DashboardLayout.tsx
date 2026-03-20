import { useNavigate, Link } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { StanceProvider } from '@/hooks/useStance';
import AppSidebar from '@/components/AppSidebar';
import EmergencyExit from '@/components/EmergencyExit';
import RoleIndicator from '@/components/RoleIndicator';
import LanguageToggle from '@/components/LanguageToggle';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import { FLogOut, FUser } from '@/components/icons/FreudIcons';
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
    <StanceProvider>
    <SidebarProvider>
      <EmergencyExit />
      <RoleIndicator />
      <div
        className="fixed inset-0 z-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${bambooBg})`, opacity: 0.08 }}
      />
      <div className="fixed inset-0 z-0 bg-background/85" />

      <div className="min-h-screen flex w-full relative z-10 overflow-x-hidden">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border/60 px-4 md:px-6 bg-card/40 backdrop-blur-sm gap-3">
            <SidebarTrigger />
            <Link to={localePath('/')} className="lg:hidden text-sm font-bold tracking-tight text-foreground">
              🌿 {t.brand}
            </Link>
            <nav className="hidden lg:flex items-center justify-center flex-1 gap-8">
              <a href={`${localePath('/')}#library`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t.nav.library}</a>
              
              <button onClick={() => handleGatedClick('/journal')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                {t.nav.checkIn}
              </button>
              <a href={`${localePath('/')}#about`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">{t.nav.about}</a>
            </nav>
            <div className="ml-auto lg:ml-4 flex items-center gap-2">
              <LanguageToggle />
              {user && (
                <>
                  <Button variant="ghost" size="sm" className="rounded-full gap-1.5" onClick={() => navigate(localePath('/profile'))}>
                    <FUser className="h-4 w-4" />
                    <span className="hidden sm:inline">{t.nav.account}</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="rounded-full gap-1.5 text-muted-foreground" onClick={async () => { await signOut(); navigate(localePath('/')); }}>
                    <FLogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">{t.signOut}</span>
                  </Button>
                </>
              )}
            </div>
          </header>
          <div className="flex-1 px-4 md:px-8 py-6 md:py-8">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
