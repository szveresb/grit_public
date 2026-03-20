import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a supportive, warm companion helping someone understand patterns across their journal entries and observations over time. You are NOT a therapist, counselor, or clinician.

CRITICAL RULES:
- NEVER use clinical or diagnostic language. No labels like "BPD," "NPD," "narcissist," "abuse," "trauma bond," "codependency," or any DSM terminology.
- Use descriptive, human language instead: "high-conflict dynamics," "relational patterns," "difficult interactions," "boundary challenges."
- NEVER diagnose or label other people mentioned in the entries.
- Keep your tone gentle, validating, and grounded.

YOUR TASK:
- Identify recurring emotional themes across the entries (e.g., repeated feelings, situations, or relational dynamics).
- Highlight strengths and self-awareness the person is demonstrating over time.
- Note any shifts or growth you observe between earlier and later entries.
- If self-anchor statements are present, note consistency or evolution in the person's grounding.
- If observations about others (relatives) are present alongside self-reports, look for correlations between the user's emotional state (impact_level) and the observed intensity of the other person's behavior. Highlight these relational patterns gently.
- When dual-perspective data is present, frame it as "what you noticed in yourself" vs. "what you noticed in others" — never as blame or accusation.
- Offer 1-2 gentle observations about patterns, not prescriptions or assignments.
- Keep the summary concise (4-6 short paragraphs max).
- Use markdown formatting with **bold** for key themes and bullet points where helpful.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { entries, observations } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if ((!entries || !Array.isArray(entries) || entries.length < 2) && (!observations || !Array.isArray(observations) || observations.length === 0)) {
      return new Response(JSON.stringify({ error: "At least 2 journal entries or some observations are needed for pattern analysis." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a structured summary of all entries
    const entrySummaries = (entries ?? []).map((e: any, i: number) => {
      const parts: string[] = [];
      parts.push(`Entry ${i + 1} — ${e.entry_date}`);
      if (e.title) parts.push(`  Title: ${e.title}`);
      if (e.event_description) parts.push(`  What happened: ${e.event_description}`);
      if (e.impact_level) parts.push(`  Impact: ${e.impact_level}/5`);
      if (e.emotional_state) parts.push(`  Feeling: ${e.emotional_state}`);
      if (e.self_anchor) parts.push(`  Self-anchor: ${e.self_anchor}`);
      if (e.free_text) parts.push(`  Notes: ${e.free_text}`);
      return parts.join('\n');
    }).join('\n\n');

    // Build observation summaries grouped by perspective
    let observationSummary = '';
    if (observations && observations.length > 0) {
      const selfObs = observations.filter((o: any) => o.subject_type === 'self' || !o.subject_type);
      const relativeObs = observations.filter((o: any) => o.subject_type === 'relative');
      
      if (selfObs.length > 0) {
        observationSummary += '\n\n--- Self-observations ---\n';
        observationSummary += selfObs.map((o: any, i: number) => {
          const parts = [`Observation ${i + 1} — ${o.logged_at}`];
          if (o.concept_name) parts.push(`  What: ${o.concept_name}`);
          parts.push(`  Intensity: ${o.intensity}/5`);
          if (o.context_modifier) parts.push(`  Context: ${o.context_modifier}`);
          if (o.user_narrative) parts.push(`  Notes: ${o.user_narrative}`);
          return parts.join('\n');
        }).join('\n\n');
      }

      if (relativeObs.length > 0) {
        observationSummary += '\n\n--- Observations about others ---\n';
        observationSummary += relativeObs.map((o: any, i: number) => {
          const parts = [`Observation ${i + 1} — ${o.logged_at}`];
          if (o.subject_name) parts.push(`  About: ${o.subject_name}`);
          if (o.concept_name) parts.push(`  What: ${o.concept_name}`);
          parts.push(`  Intensity: ${o.intensity}/5`);
          if (o.context_modifier) parts.push(`  Context: ${o.context_modifier}`);
          if (o.user_narrative) parts.push(`  Notes: ${o.user_narrative}`);
          return parts.join('\n');
        }).join('\n\n');
      }
    }

    const entryCount = (entries ?? []).length;
    const userMessage = `Please analyze the patterns across these ${entryCount} journal entries${observations?.length ? ` and ${observations.length} observations` : ''} (oldest to newest):\n\n${entrySummaries}${observationSummary}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI usage limit reached. Please add credits to continue." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Pattern analysis unavailable right now." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("journal-patterns error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
