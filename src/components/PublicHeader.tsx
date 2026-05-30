import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { FLock, FMenu } from '@/components/icons/FreudIcons';
import LanguageToggle from '@/components/LanguageToggle';
import { useTopMenu } from '@/hooks/useTopMenu';

const PublicHeader = () => {
  const { user } = useAuth();
  const { t, lang, localePath } = useLanguage();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const customMenu = useTopMenu();

  const handleGatedClick = (path: string) => {
    navigate(user ? localePath(path) : localePath('/auth'));
  };

  const labelOf = (item: { label_hu: string; label_en: string }) =>
    (lang === 'en' ? item.label_en : item.label_hu) || item.label_hu || item.label_en;

  const renderItem = (item: { label_hu: string; label_en: string; url: string; gated?: boolean }, mobile = false) => {
    const text = labelOf(item);
    const isExternal = /^https?:\/\//.test(item.url);
    const baseCls = mobile
      ? 'w-full text-left py-2.5 px-3 rounded-2xl text-sm font-medium text-foreground hover:bg-accent/50 transition-colors flex items-center gap-1.5'
      : 'text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5';
    if (item.gated) {
      return (
        <button
          key={item.url}
          onClick={() => { handleGatedClick(item.url); if (mobile) setMobileMenuOpen(false); }}
          className={baseCls}
        >
          {text}
          {!user && <FLock className="h-3 w-3" />}
        </button>
      );
    }
    if (isExternal) {
      return (
        <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className={baseCls} onClick={() => mobile && setMobileMenuOpen(false)}>
          {text}
        </a>
      );
    }
    return (
      <Link key={item.url} to={localePath(item.url)} onClick={() => mobile && setMobileMenuOpen(false)} className={baseCls}>
        {text}
      </Link>
    );
  };

  const useCustom = customMenu && customMenu.length > 0;

  return (
    <header className="relative z-10 border-b border-border bg-card">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 md:px-8 py-4">
        <Link to={localePath('/')} className="text-lg font-bold tracking-tight text-foreground">
          {t.brand}
        </Link>
        <nav className="hidden lg:flex items-center justify-center flex-1 gap-8">
          {useCustom ? (
            customMenu!.map((item) => renderItem(item))
          ) : (
            <>
              <Link to={localePath('/library')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.library}
              </Link>
              <Link to={localePath('/surveys')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.surveys}
              </Link>
              <button onClick={() => handleGatedClick('/journal')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
                {t.nav.checkIn}
                {!user && <FLock className="h-3 w-3" />}
              </button>
              <Link to={localePath('/about-legal')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.about}
              </Link>
            </>
          )}
        </nav>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          {user ? (
            <Button variant="outline" size="sm" className="rounded-full px-4" onClick={() => navigate(localePath('/journal'))}>
              {t.nav.checkIn}
            </Button>
          ) : (
            <Button size="sm" className="rounded-full px-4" onClick={() => navigate(localePath('/auth'))}>
              {t.auth.signIn}
            </Button>
          )}
          <button
            className="lg:hidden p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileMenuOpen(true)}
            aria-label={t.ui.menu}
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
            {useCustom ? (
              customMenu!.map((item) => renderItem(item, true))
            ) : (
              <>
                <Link to={localePath('/library')} onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-3 rounded-2xl text-sm font-medium text-foreground hover:bg-accent/50 transition-colors">
                  {t.nav.library}
                </Link>
                <Link to={localePath('/surveys')} onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-3 rounded-2xl text-sm font-medium text-foreground hover:bg-accent/50 transition-colors">
                  {t.nav.surveys}
                </Link>
                <button onClick={() => { handleGatedClick('/journal'); setMobileMenuOpen(false); }} className="w-full text-left py-2.5 px-3 rounded-2xl text-sm font-medium text-foreground hover:bg-accent/50 transition-colors flex items-center gap-1.5">
                  {t.nav.checkIn}
                  {!user && <FLock className="h-3 w-3" />}
                </button>
                <Link to={localePath('/about-legal')} onClick={() => setMobileMenuOpen(false)} className="block py-2.5 px-3 rounded-2xl text-sm font-medium text-foreground hover:bg-accent/50 transition-colors">
                  {t.nav.about}
                </Link>
              </>
            )}
          </nav>
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default PublicHeader;
