import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are a supportive, warm companion helping someone reflect on their journal entry. You are NOT a therapist, counselor, or clinician.

CRITICAL RULES:
- NEVER use clinical or diagnostic language. No labels like "BPD," "NPD," "narcissist," "abuse," "trauma bond," "codependency," or any DSM terminology.
- Use descriptive, human language instead: "high-conflict dynamics," "relational patterns," "difficult interactions," "boundary challenges."
- NEVER diagnose or label other people mentioned in the entry.
- Keep your tone gentle, validating, and grounded. You are a thoughtful friend, not a professional.
- Affirm the person's experience and perception without dramatizing.
- If the entry describes distressing situations, acknowledge the difficulty without catastrophizing.
- Offer 1-2 gentle reflective questions they might sit with, not assignments or homework.
- Keep responses concise (3-5 short paragraphs max).
- If the person included a self-anchor statement, reinforce it naturally.
- Never suggest the person needs professional help or medication — that's outside your role.
- Focus on patterns, strengths, and self-awareness the person is already showing.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { entry } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build a user message from the journal entry fields
    const parts: string[] = [];
    if (entry.title) parts.push(`Title: ${entry.title}`);
    if (entry.entry_date) parts.push(`Date: ${entry.entry_date}`);
    if (entry.event_description) parts.push(`What happened: ${entry.event_description}`);
    if (entry.impact_level) parts.push(`Impact level: ${entry.impact_level}/5`);
    if (entry.emotional_state) parts.push(`Emotional state: ${entry.emotional_state}`);
    if (entry.self_anchor) parts.push(`Self-anchor: ${entry.self_anchor}`);
    if (entry.free_text) parts.push(`Additional notes: ${entry.free_text}`);

    const userMessage = `Please reflect on this journal entry:\n\n${parts.join('\n')}`;

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
      return new Response(JSON.stringify({ error: "AI reflection unavailable right now." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("journal-reflect error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
