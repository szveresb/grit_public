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

interface FhirObservation {
  resourceType: 'Observation';
  status: string;
  subject: { reference: string };
  effectiveDateTime: string;
  code: {
    coding: { system: string; code: string; display: string }[];
  };
  valueInteger: number;
  component?: { code: { text: string }; valueString: string }[];
}

const Export = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewType, setPreviewType] = useState<'all' | 'therapist'>('all');
  const [filterFrom, setFilterFrom] = useState<string>('');
  const [filterTo, setFilterTo] = useState<string>('');

  const handleExport = async () => {
    if (!user) return;

    const [entriesRes, responsesRes, logsRes, conceptsRes, pulsesRes] = await Promise.all([
      supabase.from('journal_entries').select('*').eq('user_id', user.id).order('entry_date'),
      supabase.from('questionnaire_responses')
        .select('*, questionnaires(title, snomed_code), questionnaire_answers(question_id, answer, questionnaire_questions(question_text))')
        .eq('user_id', user.id),
      supabase.from('observation_logs').select('*').eq('user_id', user.id).order('logged_at'),
      supabase.from('observation_concepts').select('id, concept_code, name_en, bno_code'),
      supabase.from('mood_pulses').select('*').eq('user_id', user.id).order('entry_date'),
    ]);

    const conceptMap: Record<string, { concept_code: string; name_en: string; bno_code?: string }> = {};
    (conceptsRes.data ?? []).forEach((c: any) => {
      conceptMap[c.id] = { concept_code: c.concept_code, name_en: c.name_en, bno_code: c.bno_code };
    });

    // Build FHIR Observations with localized BNO displays
    const fhirObservations = (logsRes.data ?? []).map((log) => {
      const concept = conceptMap[log.concept_id];
      const coding: { system: string; code: string; display: string }[] = [
        {
          system: 'http://snomed.info/sct',
          code: concept?.concept_code ?? 'unknown',
          display: concept?.name_en ?? 'Unknown',
        },
      ];
      if (concept?.bno_code) {
        coding.push({
          system: 'http://hl7.org/fhir/sid/icd-10',
          code: concept.bno_code,
          display: t.export.bnoLabels[concept.bno_code] ?? concept.bno_code,
        });
      }
      const obs: FhirObservation = {
        resourceType: 'Observation',
        status: log.status ?? 'final',
        subject: { reference: 'Patient/anonymous' },
        effectiveDateTime: log.logged_at,
        code: { coding },
        valueInteger: log.intensity,
      };
      const components: { code: { text: string }; valueString: string }[] = [];
      if (log.frequency) components.push({ code: { text: 'frequency' }, valueString: log.frequency });
      if (log.context_modifier) components.push({ code: { text: 'context' }, valueString: log.context_modifier });
      if (components.length > 0) obs.component = components;
      return obs;
    });

    const exportData = {
      disclaimer: t.export.disclaimer,
      exported_at: new Date().toISOString(),
      journal_entries: entriesRes.data ?? [],
      questionnaire_responses: responsesRes.data ?? [],
      observation_logs_fhir: fhirObservations,
      mood_pulses: pulsesRes.data ?? [],
    };

    setPreviewData(exportData);
    setPreviewType('all');
    setFilterFrom('');
    setFilterTo('');
    setShowPreview(true);
  };

  const handleTherapistExport = async () => {
    if (!user) return;

    const [logsRes, conceptsRes, subjectsRes] = await Promise.all([
      supabase.from('observation_logs').select('*').eq('user_id', user.id).order('logged_at'),
      supabase.from('observation_concepts').select('id, concept_code, name_hu, name_en, bno_code'),
      (supabase.from('subjects') as any).select('id, name, relationship_type').eq('user_id', user.id),
    ]);

    const logs = logsRes.data ?? [];
    const concepts = conceptsRes.data ?? [];
    const subjects = subjectsRes.data ?? [];

    if (logs.length === 0) {
      toast.error(t.export.noObservations);
      return;
    }

    const conceptMap: Record<string, any> = {};
    concepts.forEach((c: any) => { conceptMap[c.id] = c; });

    const subjectMap: Record<string, any> = {};
    subjects.forEach((s: any) => { subjectMap[s.id] = s; });

    const subjectGroups: Record<string, any> = {};

    for (const log of logs) {
      const subjectType = (log as any).subject_type ?? 'self';
      const subjectId = (log as any).subject_id;
      const subjectKey = subjectType === 'self' ? 'self' : (subjectId ?? 'unknown');
      
      if (!subjectGroups[subjectKey]) {
        let label = t.subjects.selfLabel;
        if (subjectType === 'relative' && subjectId && subjectMap[subjectId]) {
          const s = subjectMap[subjectId];
          const relLabel = t.subjects.relationshipTypes[s.relationship_type as keyof typeof t.subjects.relationshipTypes] ?? s.relationship_type;
          label = `${s.name} (${relLabel})`;
        } else if (subjectType === 'relative') {
          label = t.subjects.otherLabel;
        }
        subjectGroups[subjectKey] = { subject_label: label, subject_type: subjectType, bno_groups: {} };
      }

      const concept = conceptMap[log.concept_id];
      const bno = concept?.bno_code ?? 'unknown';
      if (!subjectGroups[subjectKey].bno_groups[bno]) {
        subjectGroups[subjectKey].bno_groups[bno] = { bno_code: bno, observations: [] };
      }
      subjectGroups[subjectKey].bno_groups[bno].observations.push({
        concept_localized: lang === 'hu' ? (concept?.name_hu ?? concept?.name_en) : concept?.name_en,
        intensity: log.intensity,
        logged_at: log.logged_at,
        context: log.context_modifier,
      });
    }

    const subjectSummaries = Object.values(subjectGroups).map((sg: any) => ({
      subject_label: sg.subject_label,
      subject_type: sg.subject_type,
      bno_summary: Object.values(sg.bno_groups).map((group: any) => {
        const intensities = group.observations.map((o: any) => o.intensity);
        const dates = group.observations.map((o: any) => o.logged_at).sort();
        return {
          bno_code: group.bno_code,
          bno_label_localized: t.export.bnoLabels[group.bno_code] ?? group.bno_code,
          observation_count: group.observations.length,
          avg_intensity: Math.round((intensities.reduce((a: any, b: any) => a + b, 0) / intensities.length) * 100) / 100,
          date_range: { from: dates[0], to: dates[dates.length - 1] },
          observations: group.observations,
        };
      }),
    }));

    const exportData = {
      disclaimer: t.export.disclaimer,
      export_type: 'therapist_summary',
      exported_at: new Date().toISOString(),
      subjects: subjectSummaries,
    };

    setPreviewData(exportData);
    setPreviewType('therapist');
    setShowPreview(true);
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
    let csvContent = '';
    
    if (previewType === 'therapist') {
      csvContent = 'Subject,BNO Code,BNO Label,Date,Intensity,Concept,Context\n';
      previewData.subjects.forEach((subject: any) => {
        subject.bno_summary.forEach((bno: any) => {
          bno.observations.filter((o: any) => inRange(o.logged_at)).forEach((obs: any) => {
            const row = [
              `"${subject.subject_label}"`,
              `"${bno.bno_code}"`,
              `"${bno.bno_label_localized}"`,
              `"${new Date(obs.logged_at).toISOString()}"`,
              obs.intensity,
              `"${obs.concept_localized}"`,
              `"${obs.context || ''}"`
            ].join(',');
            csvContent += row + '\n';
          });
        });
      });
    } else {
      csvContent = 'Source,Date,Code,Display,Value,Extra\n';
      previewData.observation_logs_fhir.filter((o: any) => inRange(o.effectiveDateTime)).forEach((obs: any) => {
        const row = [
          'observation',
          `"${obs.effectiveDateTime}"`,
          `"${obs.code.coding[0]?.code || ''}"`,
          `"${obs.code.coding[0]?.display || ''}"`,
          obs.valueInteger,
          ''
        ].join(',');
        csvContent += row + '\n';
      });
      (previewData.mood_pulses ?? []).filter((p: any) => inRange(p.entry_date)).forEach((p: any) => {
        const row = ['mood_pulse', `"${p.entry_date}"`, '', `"${p.label || ''}"`, p.level, `"${p.subject_type || ''}"`].join(',');
        csvContent += row + '\n';
      });
      (previewData.journal_entries ?? []).filter((e: any) => inRange(e.entry_date)).forEach((e: any) => {
        const row = ['journal', `"${e.entry_date}"`, '', `"${(e.title || '').replace(/"/g, "'")}"`, e.impact_level ?? '', `"${(e.emotional_state || e.event_description || '').replace(/"/g, "'")}"`].join(',');
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
  const pulsesF = (previewData?.mood_pulses ?? []).filter((p: any) => inRange(p.entry_date));
  const journalF = (previewData?.journal_entries ?? []).filter((e: any) => inRange(e.entry_date));
  const obsF = (previewData?.observation_logs_fhir ?? []).filter((o: any) => inRange(o.effectiveDateTime));

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
                {t.export.exportedAt}: {new Date(previewData.exported_at).toLocaleString()}
              </p>
              {(filterFrom || filterTo) && (
                <p className="text-xs text-gray-500 mt-1">
                  {lang === 'hu' ? 'Időszak' : 'Range'}: {filterFrom || '…'} – {filterTo || '…'}
                </p>
              )}
            </div>

            <div className="text-sm text-gray-600 italic">
              {previewData.disclaimer}
            </div>

            {previewType === 'therapist' ? (
              <div className="space-y-6">
                {previewData.subjects.map((subject: any, si: number) => (
                  <div key={si} className="space-y-4">
                    <h2 className="text-lg font-semibold border-b pb-1">{subject.subject_label}</h2>
                    {subject.bno_summary.map((bno: any, bi: number) => {
                      const obsRows = bno.observations.filter((o: any) => inRange(o.logged_at));
                      if (obsRows.length === 0) return null;
                      const avg = Math.round((obsRows.reduce((a: number, b: any) => a + b.intensity, 0) / obsRows.length) * 100) / 100;
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
                            {obsRows.map((obs: any, oi: number) => (
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
                  <p>{t.export.questionnaireResponses}: {previewData.questionnaire_responses?.length || 0}</p>
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
                        {pulsesF.map((p: any, i: number) => (
                          <tr key={i}>
                            <td className="border p-1">{p.entry_date}</td>
                            <td className="border p-1 text-center">{p.level}</td>
                            <td className="border p-1">{p.label}</td>
                            <td className="border p-1">{p.subject_type}</td>
                          </tr>
                        ))}
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
                        {journalF.map((e: any, i: number) => (
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
                        {obsF.map((obs: any, i: number) => (
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
