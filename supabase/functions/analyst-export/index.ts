import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    return new Response("ok", { headers: corsHeaders });
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
          message: `Anonymised data export requires at least 10 active users. Currently ${activeUserCount ?? 0} registered.`,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all aggregates
    const [journalAgg, questionnaireAgg, roleDist, observationAgg] = await Promise.all([
      admin.rpc("analyst_journal_aggregates").select("*"),
      admin.rpc("analyst_questionnaire_aggregates").select("*"),
      admin.rpc("analyst_role_distribution").select("*"),
      admin.rpc("analyst_observation_aggregates").select("*"),
    ]);

    const url = new URL(req.url);
    const format = url.searchParams.get("format");
    const now = new Date().toISOString();

    const disclaimer = {
      en: "Non-Diagnostic Data: This report contains raw user observations mapped to standard medical terminology. It does not constitute a clinical assessment.",
      hu: "Nem diagnosztikai adat: A jelentés felhasználó által rögzített megfigyeléseket tartalmaz, szabványos orvosi terminológiára leképezve. Nem minősül klinikai értékelésnek.",
    };

    if (format === "fhir") {
      const bundle = buildFhirBundle(observationAgg.data, now);
      (bundle as any).disclaimer = disclaimer;
      return new Response(JSON.stringify(bundle, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/fhir+json" },
      });
    }

    const exportPayload = {
      disclaimer,
      exported_at: now,
      active_user_count: activeUserCount,
      journal_aggregates: journalAgg.data ?? [],
      questionnaire_aggregates: questionnaireAgg.data ?? [],
      role_distribution: roleDist.data ?? [],
      observation_aggregates: observationAgg.data ?? [],
    };

    return new Response(JSON.stringify(exportPayload, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Internal server error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
