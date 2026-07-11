import { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { FDownload } from '@/components/icons/FreudIcons';
import { buildUserDataExport, buildTherapistExportData, deriveTherapistSummary } from '@/lib/user-data-export';
import type { UserDataExport, TherapistExportSummary, FhirObservation } from '@/lib/user-data-export';

const Export = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<UserDataExport | TherapistExportSummary | null>(null);
  const [previewType, setPreviewType] = useState<'all' | 'therapist'>('all');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');

  const handleExport = async () => {
    if (!user) return;

    try {
      const data = await buildUserDataExport(user.id, t.export.bnoLabels);
      setPreviewData(data);
      setPreviewType('all');
      setFilterFrom('');
      setFilterTo('');
      setShowPreview(true);
    } catch (err) {
      console.error('Export failed:', err);
      toast.error(t.export.exportFailed);
    }
  };

  const handleTherapistExport = async () => {
    if (!user) return;

    try {
      const data = await buildTherapistExportData(user.id);
      const logs = data.observation_logs;
      const subjects = data.subjects;

      if (logs.length === 0) {
        toast.error(t.export.noObservations);
        return;
      }

      const summary = deriveTherapistSummary(
        logs,
        subjects,
        t.export.bnoLabels,
        t.subjects.relationshipTypes,
        t.subjects.selfLabel,
        t.subjects.otherLabel,
        lang
      );
      summary.disclaimer = t.export.disclaimer;

      setPreviewData(summary);
      setPreviewType('therapist');
      setShowPreview(true);
    } catch (err) {
      console.error('Export failed:', err);
      toast.error(t.export.exportFailed);
    }
  };

  const handleJsonDownload = () => {
    if (!previewData || previewType !== 'all') return;
    const blob = new Blob([JSON.stringify(previewData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grithu-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.profile.dataExported);
  };

  const handleCsvExport = () => {
    if (!previewData) return;
    const inRange = (iso?: string | null) => {
      if (!iso) return true;
      const d = iso.slice(0, 10);
      if (filterFrom && d < filterFrom) return false;
      if (filterTo && d > filterTo) return false;
      return true;
    };
    // Neutralize CSV formula injection: prefix risky leading chars with a single quote
    // so spreadsheet apps treat the cell as text rather than a formula.
    const csvSafe = (v: unknown): string => {
      const s = v == null ? '' : String(v);
      const sanitized = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return sanitized.replace(/"/g, '""');
    };
    const q = (v: unknown) => `"${csvSafe(v)}"`;
    let csvContent = '';
    
    if (previewType === 'therapist' && therapistData) {
      csvContent = 'Subject,BNO Code,BNO Label,Date,Intensity,Concept,Context\n';
      therapistData.subjects.forEach((subject) => {
        subject.bno_summary.forEach((bno) => {
          bno.observations.filter((o) => inRange(o.logged_at)).forEach((obs) => {
            const row = [
              q(subject.subject_label),
              q(bno.bno_code),
              q(bno.bno_label_localized),
              q(new Date(obs.logged_at).toISOString()),
              obs.intensity,
              q(obs.concept_localized),
              q(obs.context || '')
            ].join(',');
            csvContent += row + '\n';
          });
        });
      });
    } else if (previewType === 'all' && allData) {
      csvContent = 'Source,Date,Code,Display,Value,Extra\n';
      (allData.observation_logs_fhir ?? []).filter((o) => inRange(o.effectiveDateTime)).forEach((obs) => {
        const row = [
          'observation',
          q(obs.effectiveDateTime),
          q(obs.code.coding[0]?.code || ''),
          q(obs.code.coding[0]?.display || ''),
          obs.valueInteger,
          ''
        ].join(',');
        csvContent += row + '\n';
      });
      (allData.mood_pulses ?? []).filter((p) => inRange(p.entry_date)).forEach((p) => {
        const extra = p.reconciled_from_n_rows
          ? `${p.subject_type || ''} (${t.export.reconciledLabel.replace('{count}', String(p.reconciled_from_n_rows))})`
          : (p.subject_type || '');
        const row = ['mood_pulse', q(p.entry_date), '', q(p.label || ''), p.level, q(extra)].join(',');
        csvContent += row + '\n';
      });
      (allData.journal_entries ?? []).filter((e) => inRange(e.entry_date)).forEach((e) => {
        const row = ['journal', q(e.entry_date), '', q(e.title || ''), e.impact_level ?? '', q(e.emotional_state || e.event_description || '')].join(',');
        csvContent += row + '\n';
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grithu-export-${previewType}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const inRange = (iso?: string | null) => {
    if (!iso) return true;
    const d = iso.slice(0, 10);
    if (filterFrom && d < filterFrom) return false;
    if (filterTo && d > filterTo) return false;
    return true;
  };

  const allData = previewType === 'all' && previewData ? (previewData as UserDataExport) : null;
  const therapistData = previewType === 'therapist' && previewData ? (previewData as TherapistExportSummary) : null;

  const pulsesF = (allData?.mood_pulses ?? []).filter((p) => inRange(p.entry_date));
  const journalF = (allData?.journal_entries ?? []).filter((e) => inRange(e.entry_date));
  const obsF = (allData?.observation_logs_fhir ?? []).filter((o) => inRange(o.effectiveDateTime));

  return (
    <DashboardLayout showContextToolPanel={false}>
      <div className="max-w-lg mx-auto w-full space-y-5">
        {!showPreview ? (
          <>
            <div className="pb-3 border-b border-border/50">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{t.export.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{t.export.subtitle}</p>
            </div>
            <div className="surface-card p-5 sm:p-6 space-y-5">
              <p className="text-sm text-muted-foreground leading-relaxed">{t.export.desc}</p>
              <Button onClick={handleExport} size="sm" className="rounded-2xl">
                <FDownload className="h-4 w-4 mr-1.5" /> {t.export.exportAll}
              </Button>
            </div>
            <div className="surface-card p-5 sm:p-6 space-y-5">
              <h2 className="text-sm md:text-base font-semibold text-foreground pb-3 border-b border-border/50">{t.export.therapistTitle}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{t.export.therapistDesc}</p>
              <Button onClick={handleTherapistExport} size="sm" variant="secondary" className="rounded-2xl">
                <FDownload className="h-4 w-4 mr-1.5" /> {t.export.therapistExport}
              </Button>
            </div>
          </>
        ) : (
          <div id="print-area" className="surface-card p-6 space-y-6 bg-white text-black print:p-0 print:shadow-none">
            <div className="flex justify-between items-center print:hidden">
              <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => setShowPreview(false)}>
                {t.export.back}
              </Button>
              <div className="flex gap-2">
                <Button size="sm" className="rounded-2xl" onClick={() => window.print()}>
                  {t.export.printPdf}
                </Button>
                <Button size="sm" variant="secondary" className="rounded-2xl" onClick={handleCsvExport}>
                  {t.export.downloadCsv}
                </Button>
                {previewType === 'all' && (
                  <Button size="sm" variant="secondary" className="rounded-2xl" onClick={handleJsonDownload}>
                    {t.export.downloadJson}
                  </Button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-3 print:hidden border rounded-xl p-3 bg-gray-50">
              <div className="flex flex-col gap-1">
                <Label htmlFor="filter-from" className="text-xs">{lang === 'hu' ? 'Kezdő dátum' : 'From date'}</Label>
                <Input id="filter-from" type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} className="h-8 w-40" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="filter-to" className="text-xs">{lang === 'hu' ? 'Záró dátum' : 'To date'}</Label>
                <Input id="filter-to" type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} className="h-8 w-40" />
              </div>
              {(filterFrom || filterTo) && (
                <Button size="sm" variant="ghost" onClick={() => { setFilterFrom(''); setFilterTo(''); }}>
                  {lang === 'hu' ? 'Szűrő törlése' : 'Clear filter'}
                </Button>
              )}
            </div>

            <div className="border-b pb-4">
              <h1 className="text-xl font-bold">
                {previewType === 'therapist' ? t.export.therapistTitle : t.export.title}
              </h1>
              <p className="text-xs text-gray-500">
                {t.export.exportedAt}: {new Date(previewType === 'therapist' ? (previewData as TherapistExportSummary).exported_at : (previewData as UserDataExport).metadata.exported_at).toLocaleString()}
              </p>
              {(filterFrom || filterTo) && (
                <p className="text-xs text-gray-500 mt-1">
                  {lang === 'hu' ? 'Időszak' : 'Range'}: {filterFrom || '…'} – {filterTo || '…'}
                </p>
              )}
            </div>

            <div className="text-sm text-gray-600 italic">
              {t.export.disclaimer}
            </div>

            {previewType === 'therapist' && therapistData ? (
              <div className="space-y-6">
                {therapistData.subjects.map((subject, si: number) => (
                  <div key={si} className="space-y-4">
                    <h2 className="text-lg font-semibold border-b pb-1">{subject.subject_label}</h2>
                    {subject.bno_summary.map((bno, bi: number) => {
                      const obsRows = bno.observations.filter((o) => inRange(o.logged_at));
                      if (obsRows.length === 0) return null;
                      const avg = Math.round((obsRows.reduce((a: number, b) => a + b.intensity, 0) / obsRows.length) * 100) / 100;
                      return (
                      <div key={bi} className="space-y-2">
                        <h3 className="text-sm font-medium">
                          {bno.bno_code} - {bno.bno_label_localized}
                        </h3>
                        <div className="text-xs text-gray-500">
                          {t.export.countLabel}: {obsRows.length} | {t.export.avgIntensityLabel}: {avg}
                        </div>
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="border p-1 text-left">{t.export.headerDate}</th>
                              <th className="border p-1 text-left">{t.export.headerConcept}</th>
                              <th className="border p-1 text-center">{t.export.headerIntensity}</th>
                              <th className="border p-1 text-left">{t.export.headerContext}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {obsRows.map((obs, oi: number) => (
                              <tr key={oi}>
                                <td className="border p-1">{new Date(obs.logged_at).toLocaleString()}</td>
                                <td className="border p-1">{obs.concept_localized}</td>
                                <td className="border p-1 text-center">{obs.intensity}</td>
                                <td className="border p-1">{obs.context || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <p className="text-sm">{t.export.summaryNote}</p>
                <div className="text-xs">
                  <p>{t.export.journalEntries}: {journalF.length}</p>
                  <p>{t.export.questionnaireResponses}: {allData?.questionnaire_responses?.length || 0}</p>
                  <p>{t.export.observationsFhir}: {obsF.length}</p>
                  <p>{t.export.moodPulses}: {pulsesF.length}</p>
                </div>

                {pulsesF.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">{t.export.moodPulses}</h3>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border p-1 text-left">{t.export.headerDate}</th>
                          <th className="border p-1 text-center">{t.export.headerIntensity}</th>
                          <th className="border p-1 text-left">{t.export.headerConcept}</th>
                          <th className="border p-1 text-left">{t.export.headerContext}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pulsesF.map((p, i: number) => {
                          const contextText = p.reconciled_from_n_rows
                            ? `${p.subject_type || ''} (${t.export.reconciledLabel.replace('{count}', String(p.reconciled_from_n_rows))})`
                            : (p.subject_type || '');
                          return (
                            <tr key={i}>
                              <td className="border p-1">{p.entry_date}</td>
                              <td className="border p-1 text-center">{p.level}</td>
                              <td className="border p-1">{p.label}</td>
                              <td className="border p-1">{contextText}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {journalF.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">{t.export.journalEntries}</h3>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border p-1 text-left">{t.export.headerDate}</th>
                          <th className="border p-1 text-left">Title</th>
                          <th className="border p-1 text-center">{t.export.headerIntensity}</th>
                          <th className="border p-1 text-left">{t.export.headerContext}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {journalF.map((e, i: number) => (
                          <tr key={i}>
                            <td className="border p-1">{e.entry_date}</td>
                            <td className="border p-1">{e.title}</td>
                            <td className="border p-1 text-center">{e.impact_level ?? '-'}</td>
                            <td className="border p-1">{e.emotional_state || e.event_description || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {obsF.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">{t.export.observationsFhir}</h3>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border p-1 text-left">{t.export.headerDate}</th>
                          <th className="border p-1 text-left">{t.export.headerConcept}</th>
                          <th className="border p-1 text-center">{t.export.headerIntensity}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {obsF.map((obs, i: number) => (
                          <tr key={i}>
                            <td className="border p-1">{obs.effectiveDateTime}</td>
                            <td className="border p-1">{obs.code.coding[0]?.display}</td>
                            <td className="border p-1 text-center">{obs.valueInteger}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            <style>{`
              @media print {
                body * { visibility: hidden; }
                #print-area, #print-area * { visibility: visible; }
                #print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; background: white; color: black; }
                .print\\:hidden { display: none !important; }
                table { page-break-inside: avoid; }
                tr { page-break-inside: avoid; page-break-after: auto; }
              }
            `}</style>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Export;
