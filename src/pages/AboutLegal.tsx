import { Link } from 'react-router-dom';
import { useLanguage } from '@/hooks/useLanguage';
import { Button } from '@/components/ui/button';

const About = () => {
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

      <main className="max-w-3xl mx-auto px-4 md:px-8 py-12 space-y-8 text-sm text-muted-foreground leading-relaxed">
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
      </main>
    </div>
  );
};

export default About;
