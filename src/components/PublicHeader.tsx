import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { FLock, FMenu } from '@/components/icons/FreudIcons';
import LanguageToggle from '@/components/LanguageToggle';

const PublicHeader = () => {
  const { user } = useAuth();
  const { t, localePath } = useLanguage();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleGatedClick = (path: string) => {
    navigate(user ? localePath(path) : localePath('/auth'));
  };

  return (
    <header className="relative z-10 border-b border-border bg-card/60 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 py-4">
        <Link to={localePath('/')} className="text-lg font-bold tracking-tight text-foreground">
          {t.brand}
        </Link>
        <nav className="hidden lg:flex items-center justify-center flex-1 gap-8">
          <Link to={localePath('/library')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t.nav.library}
          </Link>
          <button
            onClick={() => handleGatedClick('/journal')}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5"
          >
            {t.nav.checkIn}
            {!user && <FLock className="h-3 w-3" />}
          </button>
          <Link to={localePath('/about-legal')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t.nav.about}
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          {user ? (
            <Button variant="outline" size="sm" className="rounded-full px-4" onClick={() => navigate(localePath('/dashboard'))}>
              {t.dashboard}
            </Button>
          ) : (
            <Button size="sm" className="rounded-full px-4" onClick={() => navigate(localePath('/auth'))}>
              {t.getStarted}
            </Button>
          )}
          <button
            className="lg:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Menu"
          >
            <FMenu className="h-5 w-5" />
          </button>
        </div>
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="px-5 py-5 border-b border-border">
            <SheetTitle className="text-lg font-bold tracking-tight text-foreground text-left">
              🌿 {t.brand}
            </SheetTitle>
          </SheetHeader>
          <nav className="px-4 py-4 space-y-1">
            <Link to={localePath('/library')} onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-3 rounded-2xl text-sm font-medium text-foreground hover:bg-accent/50 transition-colors">
              {t.nav.library}
            </Link>
            <button
              onClick={() => { handleGatedClick('/journal'); setMobileMenuOpen(false); }}
              className="w-full text-left py-2.5 px-3 rounded-2xl text-sm font-medium text-foreground hover:bg-accent/50 transition-colors flex items-center gap-1.5"
            >
              {t.nav.checkIn}
              {!user && <FLock className="h-3 w-3" />}
            </button>
            <Link to={localePath('/about-legal')} onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-3 rounded-2xl text-sm font-medium text-foreground hover:bg-accent/50 transition-colors">
              {t.nav.about}
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default PublicHeader;
