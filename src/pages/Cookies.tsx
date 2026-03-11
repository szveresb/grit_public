import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import LanguageToggle from '@/components/LanguageToggle';

const Cookies = () => {
  const { t, localePath } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-8 py-4">
          <Link to={localePath('/')} className="text-lg font-bold tracking-tight text-foreground">
            {t.brand}
          </Link>
          <Button variant="outline" size="sm" className="rounded-full" asChild>
            <Link to={localePath('/')}>← {t.nav.home}</Link>
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-12 space-y-8">
        <h1 className="text-2xl font-bold text-foreground">Cookie szabályzat</h1>
        <p className="text-xs text-muted-foreground">Utolsó frissítés: 2026. március 1.</p>

        <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <h2 className="text-base font-semibold text-foreground">1. Mik azok a cookie-k?</h2>
          <p>A cookie-k kis szöveges fájlok, amelyeket a böngészője tárol az eszközén, amikor meglátogat egy weboldalt. Segítenek a webhely működésében, biztonságosabbá teszik azt, és jobb felhasználói élményt nyújtanak.</p>

          <h2 className="text-base font-semibold text-foreground">2. Milyen cookie-kat használunk?</h2>
          <p><strong>Feltétlenül szükséges cookie-k:</strong> Ezek a Szolgáltatás működéséhez elengedhetetlenek, beleértve a bejelentkezési munkamenet fenntartását és a biztonsági funkciókat.</p>
          <p><strong>Funkcionális cookie-k:</strong> Megjegyzik az Ön nyelvi beállításait és egyéb preferenciáit a jobb felhasználói élmény érdekében.</p>
          <p>A Grit.hu <strong>nem</strong> használ marketing vagy nyomkövető cookie-kat, és nem oszt meg adatokat hirdetési hálózatokkal.</p>

          <h2 className="text-base font-semibold text-foreground">3. Cookie-k kezelése</h2>
          <p>A legtöbb böngésző lehetővé teszi a cookie-k kezelését a beállításokon keresztül. A cookie-k törlése vagy letiltása esetén a Szolgáltatás egyes funkciói korlátozottan működhetnek.</p>

          <h2 className="text-base font-semibold text-foreground">4. Kapcsolat</h2>
          <p>Ha kérdése van a cookie szabályzattal kapcsolatban, kérjük vegye fel velünk a kapcsolatot az oldalon elérhető elérhetőségeken.</p>
        </section>
      </main>
    </div>
  );
};

export default Cookies;
