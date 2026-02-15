import { Link, useNavigate } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import EmergencyExit from '@/components/EmergencyExit';
import RoleIndicator from '@/components/RoleIndicator';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { Lock } from 'lucide-react';
import bambooBg from '@/assets/bamboo-bg.jpg';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const handleGatedClick = (path: string) => {
    navigate(user ? path : '/auth');
  };

  return (
    <SidebarProvider>
      <EmergencyExit />
      <RoleIndicator />
      {/* Fixed bamboo background */}
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
            <Link to="/" className="text-sm font-bold text-foreground tracking-tight hover:text-primary transition-colors">
              Grit.hu
            </Link>
            {/* Top nav links — hidden on mobile (they're inside the sidebar hamburger) */}
            {!isMobile && (
              <nav className="hidden md:flex items-center gap-8 ml-auto">
                <a href="/#library" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Library</a>
                <a href="/#research" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Research Summaries</a>
                <button onClick={() => handleGatedClick('/self-checks')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                  Self-Checks
                </button>
                <a href="/#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</a>
              </nav>
            )}
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
