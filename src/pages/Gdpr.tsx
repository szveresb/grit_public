import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import LanguageToggle from '@/components/LanguageToggle';

const Gdpr = () => {
  const { t, localePath } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/60 backdrop-blur-xl">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 md:px-8 py-4">
          <Link to={localePath('/')} className="text-lg font-bold tracking-tight text-foreground">
            {t.brand}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Button variant="outline" size="sm" className="rounded-full" asChild>
              <Link to={localePath('/')}>← {t.nav.home}</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-12 space-y-8">
        <h1 className="text-2xl font-bold text-foreground">GDPR megfelelőség</h1>
        <p className="text-xs text-muted-foreground">Utolsó frissítés: 2026. március 1.</p>

        <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <h2 className="text-base font-semibold text-foreground">1. Adatkezelő</h2>
          <p>A Grit.hu üzemeltetője az adatkezelő, aki felel az Ön személyes adatainak védelméért az Európai Unió Általános Adatvédelmi Rendelete (GDPR, EU 2016/679) és a magyar adatvédelmi törvények (Info tv.) szerint.</p>

          <h2 className="text-base font-semibold text-foreground">2. Milyen adatokat gyűjtünk?</h2>
          <p><strong>Fiókadatok:</strong> E-mail cím, megjelenítési név, regisztráció dátuma.</p>
          <p><strong>Szolgáltatás által generált adatok:</strong> Naplóbejegyzések, megfigyelési feljegyzések, önellenőrzési válaszok, hangulatjelentések.</p>
          <p>Nem gyűjtünk érzékeny egészségügyi adatokat. Az Ön által önkéntesen megadott reflexiók nem minősülnek orvosi dokumentációnak.</p>

          <h2 className="text-base font-semibold text-foreground">3. Az adatkezelés jogalapja</h2>
          <p>Az adatkezelés jogalapja az Ön hozzájárulása (GDPR 6. cikk (1) bekezdés a) pont), amelyet a regisztrációkor ad meg. Hozzájárulását bármikor visszavonhatja fiókjának törlésével.</p>

          <h2 className="text-base font-semibold text-foreground">4. Az Ön jogai</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Hozzáférés joga:</strong> Bármikor letöltheti összes adatát az Exportálás menüponton keresztül.</li>
            <li><strong>Törlés joga:</strong> Fiókja törlésével minden adatát véglegesen eltávolítjuk.</li>
            <li><strong>Helyesbítés joga:</strong> Profilját és bejegyzéseit bármikor módosíthatja.</li>
            <li><strong>Adathordozhatóság:</strong> Adatait strukturált, géppel olvasható formátumban exportálhatja.</li>
            <li><strong>Tiltakozás joga:</strong> Tiltakozhat az adatkezelés ellen a fiókja törlésével.</li>
          </ul>

          <h2 className="text-base font-semibold text-foreground">5. Adatbiztonság</h2>
          <p>Adatait titkosított kapcsolaton (TLS/SSL) keresztül továbbítjuk és tároljuk. A hozzáférés-szabályozás (RLS) biztosítja, hogy kizárólag Ön férjen hozzá saját adataihoz.</p>

          <h2 className="text-base font-semibold text-foreground">6. Adatmegőrzés</h2>
          <p>Adatait addig őrizzük, amíg fiókja aktív. A fiók törlésével minden személyes adat véglegesen eltávolításra kerül a rendszerből.</p>

          <h2 className="text-base font-semibold text-foreground">7. Kapcsolat és panasz</h2>
          <p>Adatvédelmi kérdéseivel és panaszaival fordulhat hozzánk, vagy a Nemzeti Adatvédelmi és Információszabadság Hatósághoz (NAIH, <a href="https://www.naih.hu" target="_blank" rel="noopener noreferrer" className="text-primary underline">naih.hu</a>).</p>
        </section>
      </main>
    </div>
  );
};

export default Gdpr;
