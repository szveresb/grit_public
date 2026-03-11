import { useLanguage } from '@/hooks/useLanguage';
import PublicHeader from '@/components/PublicHeader';

const Terms = () => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <PublicHeader />

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-12 space-y-8">
        <h1 className="text-2xl font-bold text-foreground">Felhasználási feltételek</h1>
        <p className="text-xs text-muted-foreground">Utolsó frissítés: 2026. március 1.</p>

        <section className="space-y-3 text-sm text-muted-foreground leading-relaxed">
          <h2 className="text-base font-semibold text-foreground">1. Általános rendelkezések</h2>
          <p>A Grit.hu (a továbbiakban: „Szolgáltatás") egy önreflexiós és megismerési portál, amely strukturált naplózást, megfigyelés-rögzítést és pszichoedukációs anyagokat nyújt. A Szolgáltatás használatával Ön elfogadja az alábbi feltételeket.</p>

          <h2 className="text-base font-semibold text-foreground">2. A Szolgáltatás jellege</h2>
          <p>A Grit.hu nem nyújt orvosi, pszichológiai vagy terápiás tanácsadást. A platformon elérhető tartalmak kizárólag tájékoztató és edukációs célokat szolgálnak. Krízishelyzetben forduljon szakemberhez vagy hívja a 116 123-as lelkisegély vonalat.</p>

          <h2 className="text-base font-semibold text-foreground">3. Regisztráció és fiók</h2>
          <p>A Szolgáltatás egyes funkcióihoz regisztráció szükséges. Ön felelős a fiókjához tartozó bejelentkezési adatok biztonságos kezeléséért. Fiókját bármikor törölheti, mellyel minden tárolt adata véglegesen eltávolításra kerül.</p>

          <h2 className="text-base font-semibold text-foreground">4. Szellemi tulajdon</h2>
          <p>A Szolgáltatás összes tartalma, dizájnja és szoftvere a Grit.hu tulajdonát képezi, és szerzői jogi védelem alatt áll. A tartalmak másolása, terjesztése vagy kereskedelmi célú felhasználása kizárólag írásbeli engedéllyel lehetséges.</p>

          <h2 className="text-base font-semibold text-foreground">5. Felelősségkorlátozás</h2>
          <p>A Szolgáltatás „ahogy van" alapon érhető el. Nem vállalunk felelősséget a Szolgáltatás használatából eredő közvetlen vagy közvetett károkért, adatvesztésért vagy a Szolgáltatás ideiglenes elérhetetlenségéért.</p>

          <h2 className="text-base font-semibold text-foreground">6. Módosítások</h2>
          <p>Fenntartjuk a jogot a jelen feltételek bármikori módosítására. A módosításokról a Szolgáltatáson keresztül tájékoztatjuk felhasználóinkat.</p>
        </section>
      </main>
    </div>
  );
};

export default Terms;
