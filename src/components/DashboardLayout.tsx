import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import EmergencyExit from '@/components/EmergencyExit';
import RoleIndicator from '@/components/RoleIndicator';
import bambooBg from '@/assets/bamboo-bg.jpg';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
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
          <header className="h-14 flex items-center border-b border-border/60 px-5 bg-card/40 backdrop-blur-sm">
            <SidebarTrigger />
            <span className="ml-3 text-sm font-semibold text-foreground tracking-tight">Liftoff</span>
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
