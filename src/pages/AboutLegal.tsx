import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';
import LanguageToggle from '@/components/LanguageToggle';

const HuContent = () => (
  <>
    <h1 className="text-2xl font-bold text-foreground">Rólunk – Grit.hu</h1>

    <p>A Grit.hu egy szemantikus dokumentációs eszköz, amelynek célja, hogy a felhasználók saját egészségügyi megfigyeléseiket strukturált, szabványosított és interoperábilis formában rögzíthessék.</p>
    <p>A platform Személyes Információkezelő Rendszerként (PIMS) és strukturált archívumként működik. A felhasználók által rögzített megfigyelések nemzetközileg elfogadott orvosi terminológiák – például SNOMED CT és BNO-10 (ICD-10) – segítségével kerülnek strukturálásra. E terminológiák kizárólag szabványos nevezéktanként szolgálnak az adat-hordozhatóság és a szakmai olvashatóság biztosítására.</p>

    <h2 className="text-lg font-bold text-foreground pt-4">Cél</h2>
    <p>A Grit.hu lehetővé teszi:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>személyes egészségügyi megfigyelések digitalizálását és rendszerezését</li>
      <li>élmények és események szabványos orvosi terminológiával történő címkézését</li>
      <li>orvos számára értelmezhető összefoglalók exportálását (pl. FHIR-kompatibilis formátumban)</li>
      <li>a beteg által szolgáltatott anamnézis minőségének javítását</li>
    </ul>
    <p>A rendszer adminisztratív híd a felhasználó és az egészségügyi szakember között. A klinikai értelmezés, diagnózis és terápiás döntés kizárólag engedéllyel rendelkező egészségügyi szakember felelőssége.</p>

    <h2 className="text-lg font-bold text-foreground pt-4">Szabályozási besorolás és hatókör</h2>

    <h3 className="text-base font-semibold text-foreground">1. Funkcionális besorolás</h3>
    <p>A Grit.hu:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Személyes Információkezelő Rendszer (PIMS)</li>
      <li>Strukturált szemantikus archívum</li>
    </ul>
    <p>A rendszer:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>szabványos terminológiát biztosít a felhasználó által végzett címkézéshez</li>
      <li>statikus, szakmailag elfogadott orvosi definíciókat jelenít meg</li>
    </ul>
    <p>A rendszer <strong>nem</strong>:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>értelmezi a klinikai jelentőséget</li>
      <li>elemez mentális vagy fizikai állapotot</li>
      <li>ad orvosi tanácsot</li>
      <li>állít fel diagnózist</li>
    </ul>
    <p>Minden kategorizálás a felhasználó kifejezett megerősítésével történik.</p>

    <h3 className="text-base font-semibold text-foreground">2. EU AI Act megfelelés</h3>
    <p>A Grit.hu kialakítása biztosítja, hogy ne tartozzon az EU AI Act III. mellékletében meghatározott „magas kockázatú AI-rendszerek" körébe.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>Nincs automatizált klinikai döntéshozatal:</strong> A rendszer nem értékeli a felhasználó egészségi állapotát és nem javasol kezelési irányt.</li>
      <li><strong>Statikus küszöbérték-alapú értesítések:</strong> Az értesítések kizárólag a felhasználó által előre meghatározott feltételek alapján aktiválódnak (pl. „Értesíts, ha háromszor rögzítem X tünetet").</li>
      <li><strong>Információ-visszakeresés:</strong> A könyvtárfunkció meglévő, szakirodalmi definíciókat jelenít meg. Nem generál személyre szabott orvosi értelmezést.</li>
    </ul>

    <h3 className="text-base font-semibold text-foreground">3. MDR (Orvostechnikai Eszköz Rendelet) szerinti státusz</h3>
    <p>Az EU Orvostechnikai Eszköz Rendelet (MDR) 2. cikk (1) bekezdése alapján a Grit.hu <strong>nem</strong> minősül orvostechnikai eszköznek, mivel rendeltetése sem diagnosztikai, sem terápiás célú.</p>
    <p>A platform:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>passzív dokumentációs logika szerint működik</li>
      <li>a felhasználói megjegyzéseket szabványos terminológiába rendezi</li>
      <li>az interoperabilitást és a szakmai kommunikációt támogatja</li>
    </ul>
    <p>A platform <strong>nem</strong>:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>végez automatizált klinikai elemzést</li>
      <li>végez triázst</li>
      <li>állít fel diagnosztikai következtetést</li>
      <li>befolyásol klinikai döntést</li>
    </ul>
    <p>A klinikai felelősség teljes mértékben az adatokat értelmező egészségügyi szakemberé.</p>

    <h2 className="text-lg font-bold text-foreground pt-4">Biztonsági és átláthatósági protokoll</h2>

    <h3 className="text-base font-semibold text-foreground">Nulla-diagnózis elv</h3>
    <p>Minden generált összefoglaló (PDF, dashboard, exportált jelentés) az alábbi figyelmeztetést tartalmazza:</p>
    <blockquote className="border-l-4 border-primary/40 pl-4 italic">
      „Nem diagnosztikai adat: A jelentés felhasználó által rögzített megfigyeléseket tartalmaz, szabványos orvosi terminológiára leképezve. Nem minősül klinikai értékelésnek."
    </blockquote>

    <h3 className="text-base font-semibold text-foreground">Human-in-the-Loop működés</h3>
    <ul className="list-disc pl-5 space-y-1">
      <li>Nincs automatikus címkézés felhasználói jóváhagyás nélkül</li>
      <li>A felhasználó teljes kontrollt gyakorol a kategorizálás felett</li>
      <li>A rendszer dokumentációs segédeszközként működik</li>
    </ul>

    <h2 className="text-lg font-bold text-foreground pt-4">Felelősségkorlátozás</h2>
    <p>A Grit.hu adminisztratív adatkezelő és rendszerező eszköz. Nem helyettesíti az orvosi konzultációt, diagnózist vagy kezelést.</p>
    <p>A felhasználó felel:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>az általa rögzített adatok pontosságáért</li>
      <li>a szükséges orvosi tanács igénybevételéért</li>
    </ul>
    <p>Az egészségügyi szakember tartozik kizárólagos felelősséggel a klinikai értelmezésért és döntéshozatalért.</p>

    <p className="pt-4 text-xs text-muted-foreground">A szabályozási besorolással és a rendszer felépítésével kapcsolatos kérdésekben forduljon a Grit.hu üzemeltetőjéhez.</p>
  </>
);

const EnContent = () => (
  <>
    <h1 className="text-2xl font-bold text-foreground">About Grit.hu</h1>

    <p>Grit.hu is a semantic documentation utility designed to help individuals structure and organize their personal health observations in a standardized, interoperable format.</p>
    <p>The platform functions as a Personal Information Management System (PIMS) and structured archive. Users record their own observations, which can then be mapped to internationally recognized medical terminologies such as SNOMED CT and ICD-10 (BNO-10). These terminologies are used exclusively as standardized vocabularies to support data portability and professional readability.</p>

    <h2 className="text-lg font-bold text-foreground pt-4">Purpose</h2>
    <p>Grit.hu enables users to:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Digitize and structure personal health observations</li>
      <li>Tag experiences using standardized medical terminology</li>
      <li>Export information in a clinician-readable format (e.g., FHIR-compatible resources)</li>
      <li>Improve the clarity and quality of patient-provided medical history</li>
    </ul>
    <p>The system acts as an administrative bridge between individuals and licensed healthcare professionals. Clinical interpretation, diagnosis, and treatment decisions remain entirely the responsibility of qualified practitioners.</p>

    <h2 className="text-lg font-bold text-foreground pt-4">Regulatory Position &amp; Scope</h2>

    <h3 className="text-base font-semibold text-foreground">1. Functional Classification</h3>
    <p>Grit.hu operates as:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>A Personal Information Management System (PIMS)</li>
      <li>A Structured Semantic Archive</li>
    </ul>
    <p>The system:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Provides standardized terminology for user-directed tagging</li>
      <li>Retrieves static, peer-reviewed medical definitions from established sources</li>
    </ul>
    <p>The system does <strong>not</strong>:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Interpret clinical significance</li>
      <li>Analyze mental or physical health states</li>
      <li>Generate medical advice</li>
      <li>Infer diagnoses</li>
    </ul>
    <p>All categorization of events is initiated and explicitly confirmed by the user.</p>

    <h3 className="text-base font-semibold text-foreground">2. EU AI Act Alignment</h3>
    <p>Grit.hu is designed to remain outside the scope of "High-Risk AI Systems" under Annex III of the EU AI Act.</p>
    <ul className="list-disc pl-5 space-y-1">
      <li><strong>No automated clinical decision-making:</strong> The platform does not evaluate a user's medical condition or suggest treatment pathways.</li>
      <li><strong>Static threshold alerts only:</strong> Any reminders or alerts are triggered solely by user-defined conditions (e.g., "Notify me if I log X three times"). These function as passive notifications.</li>
      <li><strong>Information retrieval only:</strong> The library component retrieves existing medical definitions. It does not generate personalized medical interpretations.</li>
    </ul>

    <h3 className="text-base font-semibold text-foreground">3. Medical Device Regulation (MDR) Position</h3>
    <p>Under Article 2(1) of the EU Medical Device Regulation (MDR), Grit.hu is <strong>not</strong> intended for diagnostic or therapeutic purposes.</p>
    <p>The platform:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Performs passive documentation</li>
      <li>Translates user-provided notes into structured, standardized terminology</li>
      <li>Supports interoperability and communication</li>
    </ul>
    <p>It does <strong>not</strong>:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>Conduct automated clinical analysis</li>
      <li>Perform triage</li>
      <li>Provide diagnostic inference</li>
      <li>Influence medical decision-making</li>
    </ul>
    <p>All clinical responsibility remains fully with the licensed healthcare professional reviewing the exported information.</p>

    <h2 className="text-lg font-bold text-foreground pt-4">Safety &amp; Transparency Protocol</h2>

    <h3 className="text-base font-semibold text-foreground">Zero-Diagnosis Policy</h3>
    <p>All generated summaries (PDF reports, dashboards, exports) are clearly labeled:</p>
    <blockquote className="border-l-4 border-primary/40 pl-4 italic">
      "Non-Diagnostic Data: This report contains raw user observations mapped to standard medical terminology. It does not constitute a clinical assessment."
    </blockquote>

    <h3 className="text-base font-semibold text-foreground">Human-in-the-Loop Confirmation</h3>
    <ul className="list-disc pl-5 space-y-1">
      <li>No observation is auto-tagged without explicit user verification</li>
      <li>Users remain in full control of categorization</li>
      <li>The system functions as a utility tool for structured documentation</li>
    </ul>

    <h2 className="text-lg font-bold text-foreground pt-4">Limitation of Liability</h2>
    <p>Grit.hu is an administrative data organization tool. It does not replace professional medical consultation, diagnosis, or treatment.</p>
    <p>Users are responsible for:</p>
    <ul className="list-disc pl-5 space-y-1">
      <li>The accuracy of the information they provide</li>
      <li>Seeking professional medical advice where appropriate</li>
    </ul>
    <p>Healthcare professionals remain solely responsible for interpreting clinical information and making medical decisions.</p>

    <p className="pt-4 text-xs text-muted-foreground">For further information regarding regulatory classification or system architecture, contact Grit.hu.</p>
  </>
);

const AboutLegal = () => {
  const { lang, t, localePath } = useLanguage();

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

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-12 space-y-8 text-sm text-muted-foreground leading-relaxed">
        {lang === 'hu' ? <HuContent /> : <EnContent />}
      </main>
    </div>
  );
};

export default AboutLegal;
