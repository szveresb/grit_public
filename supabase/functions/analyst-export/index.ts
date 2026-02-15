import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    // User client to verify identity
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

    // Service client for privileged queries
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Check analyst or admin role
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

    // Check 10+ active users threshold
    const { count: activeUserCount } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true });

    if ((activeUserCount ?? 0) < 10) {
      return new Response(
        JSON.stringify({
          error: "Threshold not met",
          message: `Anonymised data export requires at least 10 active users. Currently ${activeUserCount ?? 0} registered.`,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Build anonymised, aggregated dataset ---

    // 1. Journal aggregates per date
    const { data: journalAgg } = await admin.rpc("analyst_journal_aggregates").select("*");

    // 2. Questionnaire response aggregates
    const { data: questionnaireAgg } = await admin.rpc("analyst_questionnaire_aggregates").select("*");

    // 3. Role distribution
    const { data: roleDist } = await admin.rpc("analyst_role_distribution").select("*");

    const exportPayload = {
      exported_at: new Date().toISOString(),
      active_user_count: activeUserCount,
      journal_aggregates: journalAgg ?? [],
      questionnaire_aggregates: questionnaireAgg ?? [],
      role_distribution: roleDist ?? [],
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
