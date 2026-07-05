import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!; // service role key to perform db writes as system
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user details
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin or editor
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "editor"])
      .maybeSingle();

    if (roleError || !roleData) {
      return new Response(JSON.stringify({ error: "Forbidden: Admin or Editor role required." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { surveyId } = await req.json();
    if (!surveyId) {
      return new Response(JSON.stringify({ error: "surveyId is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch Questionnaire details
    const { data: survey, error: surveyErr } = await supabase
      .from("questionnaires")
      .select("title, score_ranges")
      .eq("id", surveyId)
      .single();

    if (surveyErr || !survey) {
      return new Response(JSON.stringify({ error: "Survey not found." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch attached studies
    const { data: studies, error: studiesErr } = await supabase
      .from("survey_studies")
      .select("id, title, authors, year, citation_string, key_findings")
      .eq("survey_id", surveyId);

    if (studiesErr) {
      return new Response(JSON.stringify({ error: "Failed to fetch studies." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!studies || studies.length === 0) {
      return new Response(JSON.stringify({ error: "No studies found for this survey. Please add studies first." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Format studies text for LLM context
    const studiesFormatted = studies.map(s => {
      return `Study ID: ${s.id}
Title: ${s.title}
Authors: ${s.authors || "Unknown"}
Year: ${s.year || "Unknown"}
Citation: ${s.citation_string || "Unknown"}
Key Findings: ${s.key_findings || "No key findings provided."}
---`;
    }).join("\n\n");

    const ranges = (survey.score_ranges as any[]) || [];
    const rangesFormatted = ranges.length > 0
      ? ranges.map(r => `- Score range ${r.min} to ${r.max}: "${r.label}" (Description: ${r.description || "None"})`).join("\n")
      : "- General note (interpret regardless of score)";

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    console.log("--- generate-interpretations v2 (Hybrid Edge Function) ---");
    console.log("GEMINI_API_KEY present:", !!GEMINI_API_KEY);
    console.log("LOVABLE_API_KEY present:", !!LOVABLE_API_KEY);

    if (!GEMINI_API_KEY && !LOVABLE_API_KEY) {
      throw new Error("Neither GEMINI_API_KEY nor LOVABLE_API_KEY is configured.");
    }


    const SYSTEM_PROMPT = `You are a professional clinical research analyst and expert psychologist.
You are generating score-specific questionnaire interpretations for the survey titled: "${survey.title}".
Your output must be strictly grounded in the attached studies provided in the user message.

CRITICAL RULES:
- Output MUST be client-facing, warm, supportive, but professional.
- Do NOT use diagnostic or clinical labels (BPD, NPD, narcissist, abuse, trauma bond, codependency, etc.) in the interpretations.
- Use descriptive language: "high-conflict dynamics", "relational patterns", "difficult interactions", "boundary challenges".
- Ground your analysis scientifically based ON the attached studies, but explain it in a warm, understandable way.
- For each score range, write one interpretation in English and one in Hungarian.
- Output MUST contain a "citations" array which matches the UUIDs of the studies that support the findings for that range.

You must output a JSON object exactly conforming to this structure:
{
  "interpretations": [
    {
      "score_min": number or null,
      "score_max": number or null,
      "body_en": "Grounding interpretation paragraph in English...",
      "body_hu": "Grounding interpretation paragraph in Hungarian...",
      "citations": ["uuid-of-study-1", "uuid-of-study-2"]
    }
  ]
}`;

    const userMessage = `Attached studies to use as validation context:
${studiesFormatted}

Questionnaire Score Bands to generate interpretations for:
${rangesFormatted}

Please generate the pre-generated interpretations.`;

    let parsedJson;

    if (GEMINI_API_KEY) {
      // Call Google AI Studio directly to utilize personal Google AI Pro subscription
      const aiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: userMessage }]
            }
          ],
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }]
          },
          generationConfig: {
            responseMimeType: "application/json"
          }
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        throw new Error(`Gemini API error: ${errText}`);
      }

      const aiResult = await aiResponse.json();
      const parsedText = aiResult.candidates?.[0]?.content?.parts?.[0]?.text || "";
      parsedJson = JSON.parse(parsedText);
    } else {
      // Fallback to Lovable AI Gateway if GEMINI_API_KEY is not set
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userMessage },
          ],
          response_format: { type: "json_object" }
        }),
      });

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        throw new Error(`AI Gateway error: ${errText}`);
      }

      const aiResult = await aiResponse.json();
      const parsedText = aiResult.choices?.[0]?.message?.content || "";
      parsedJson = JSON.parse(parsedText);
    }

    if (!parsedJson.interpretations || !Array.isArray(parsedJson.interpretations)) {
      throw new Error("Invalid AI output structure.");
    }

    // Start a transaction: delete old AI-generated interpretations for this survey
    await supabase
      .from("survey_interpretations")
      .delete()
      .eq("survey_id", surveyId)
      .eq("generated_by", "ai");

    // Insert the new interpretations
    const insertData = parsedJson.interpretations.map((item: any) => ({
      survey_id: surveyId,
      score_min: item.score_min !== undefined ? item.score_min : null,
      score_max: item.score_max !== undefined ? item.score_max : null,
      body_en: item.body_en || "",
      body_hu: item.body_hu || "",
      citations: Array.isArray(item.citations) ? item.citations : [],
      generated_by: "ai"
    }));

    if (insertData.length > 0) {
      const { error: insertErr } = await supabase
        .from("survey_interpretations")
        .insert(insertData);

      if (insertErr) throw insertErr;
    }

    return new Response(JSON.stringify({ success: true, count: insertData.length }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Error in generate-interpretations:", err);
    return new Response(JSON.stringify({ error: err.message || "Failed to generate interpretations." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
