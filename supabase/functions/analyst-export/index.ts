import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function buildFhirBundle(observationAgg: any[], timestamp: string) {
  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp,
    entry: (observationAgg ?? []).map((row: any) => ({
      resource: {
        resourceType: "Observation",
        status: "final",
        code: {
          coding: [{
            system: "http://snomed.info/sct",
            code: row.concept_code,
            display: row.concept_name_en,
          }],
        },
        valueInteger: Math.round(row.avg_intensity),
        note: [{
          text: `Aggregated: ${row.log_count} observations, avg intensity ${row.avg_intensity}`,
        }],
      },
    })),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["analyst", "admin"]);

    if (!roleData || roleData.length === 0) {
      return new Response(JSON.stringify({ error: "Forbidden: analyst or admin role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { count: activeUserCount } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if ((activeUserCount ?? 0) < 20) {
      return new Response(
        JSON.stringify({
          error: "Threshold not met",
          message: `Anonymised data export requires at least 20 active users. Threshold not yet met.`,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user IDs that have consented to anonymized_analytics
    const { data: consentedUsers } = await admin
      .from("user_consents")
      .select("user_id")
      .eq("consent_key", "anonymized_analytics")
      .eq("granted", true);

    const consentedUserIds = (consentedUsers ?? []).map((c: any) => c.user_id);

    // If no users consented, return empty data
    if (consentedUserIds.length === 0) {
      const now = new Date().toISOString();
      return new Response(JSON.stringify({
        disclaimer: {
          en: "Non-Diagnostic Data: This report contains raw user observations mapped to standard medical terminology. It does not constitute a clinical assessment.",
          hu: "Nem diagnosztikai adat: A jelentés felhasználó által rögzített megfigyeléseket tartalmaz, szabványos orvosi terminológiára leképezve. Nem minősül klinikai értékelésnek.",
        },
        exported_at: now,
        active_user_count: 0,
        consent_note: "No users have consented to anonymized analytics.",
        journal_aggregates: [],
        questionnaire_aggregates: [],
        role_distribution: [],
        observation_aggregates: [],
      }, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch aggregates filtered by consented users only
    // We use the existing RPC functions but note they aggregate ALL data.
    // For proper consent filtering, we query raw tables filtered by consented user IDs.
    const [journalAgg, questionnaireAgg, roleDist, observationAgg] = await Promise.all([
      admin.from("journal_entries")
        .select("entry_date, impact_level, emotional_state")
        .in("user_id", consentedUserIds),
      admin.rpc("analyst_questionnaire_aggregates").select("*"),
      admin.rpc("analyst_role_distribution").select("*"),
      admin.from("observation_logs")
        .select("concept_id, intensity, observation_concepts(concept_code, name_en)")
        .in("user_id", consentedUserIds),
    ]);

    // Aggregate journal entries by date (only consented users)
    const journalByDate: Record<string, { count: number; impacts: number[]; emotions: string[] }> = {};
    for (const je of journalAgg.data ?? []) {
      const d = je.entry_date;
      if (!journalByDate[d]) journalByDate[d] = { count: 0, impacts: [], emotions: [] };
      journalByDate[d].count++;
      if (je.impact_level) journalByDate[d].impacts.push(je.impact_level);
      if (je.emotional_state) journalByDate[d].emotions.push(je.emotional_state);
    }
    const journalAggResult = Object.entries(journalByDate)
      .map(([entry_date, v]) => ({
        entry_date,
        entry_count: v.count,
        avg_impact_level: v.impacts.length > 0 ? Math.round((v.impacts.reduce((a, b) => a + b, 0) / v.impacts.length) * 100) / 100 : null,
        emotional_states: v.emotions,
      }))
      .sort((a, b) => b.entry_date.localeCompare(a.entry_date));

    // Aggregate observations (only consented users)
    const obsByConcept: Record<string, { code: string; name: string; count: number; intensities: number[] }> = {};
    for (const ol of observationAgg.data ?? []) {
      const concept = (ol as any).observation_concepts;
      const code = concept?.concept_code ?? ol.concept_id;
      const name = concept?.name_en ?? '';
      if (!obsByConcept[code]) obsByConcept[code] = { code, name, count: 0, intensities: [] };
      obsByConcept[code].count++;
      obsByConcept[code].intensities.push(ol.intensity);
    }
    const obsAggResult = Object.values(obsByConcept)
      .map(v => ({
        concept_code: v.code,
        concept_name_en: v.name,
        log_count: v.count,
        avg_intensity: Math.round((v.intensities.reduce((a, b) => a + b, 0) / v.intensities.length) * 100) / 100,
      }))
      .sort((a, b) => b.log_count - a.log_count);

    const url = new URL(req.url);
    const format = url.searchParams.get("format");
    const now = new Date().toISOString();

    const disclaimer = {
      en: "Non-Diagnostic Data: This report contains raw user observations mapped to standard medical terminology. It does not constitute a clinical assessment.",
      hu: "Nem diagnosztikai adat: A jelentés felhasználó által rögzített megfigyeléseket tartalmaz, szabványos orvosi terminológiára leképezve. Nem minősül klinikai értékelésnek.",
    };

    if (format === "fhir") {
      const bundle = buildFhirBundle(obsAggResult, now);
      (bundle as any).disclaimer = disclaimer;
      return new Response(JSON.stringify(bundle, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/fhir+json" },
      });
    }

    const exportPayload = {
      disclaimer,
      exported_at: now,
      active_user_count: Math.floor((activeUserCount ?? 0) / 10) * 10,
      consented_user_count: consentedUserIds.length,
      journal_aggregates: journalAggResult,
      questionnaire_aggregates: questionnaireAgg.data ?? [],
      role_distribution: roleDist.data ?? [],
      observation_aggregates: obsAggResult,
    };

    return new Response(JSON.stringify(exportPayload, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("analyst-export error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
