// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import OpenAI from "https://esm.sh/openai@4.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

Deno.serve(async (req) => {
  try {
    console.log("inside open ai--->")
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }    
    const { brand, templates } = await req.json();
    console.log("brand details--->", brand, templates)
    const prompt = `
      Brand-to-Template Matching Analysis

      You are an advanced brand identity matching engine with dynamic industry analysis capabilities

      BRAND: ${JSON.stringify(brand, null, 2)}

      TEMPLATES: ${JSON.stringify(templates, null, 2)}

      TASK: Find the most suitable template for this brand.

      IMPORTANT RULES (must follow):
      1. You MUST use the exact template_master_id provided inside the templates input.
      2. NEVER invent or hallucinate any template IDs or names.
      3. Only choose from the templates passed in the "templates" array.
      4. If you reference a template, you MUST use its actual "template_master_id".

      ANALYSIS APPROACH:
      1. Understand what the brand DOES (from industries/description)
      2. For each template, understand what it's DESIGNED FOR (from content)
      3. Apply logical matching: Would this brand realistically use this template?
      4. Score based on relevance, tone fit, and customization potential

      SCORING (0-100):
      - 80-100: Excellent match (template perfectly aligns with brand's business)
      - 60-79: Good match (template can work well with minor adjustments)
      - 40-59: Acceptable match (significant adaptation needed but possible)
      - 20-39: Poor match (major content/business model mismatch)
      - 0-19: Very poor match (completely unrelated purposes)

      KEY QUESTIONS TO ASK:
      1. Does this template's primary purpose align with what this brand does?
      2. Would this template's tone be appropriate for this brand's industry?
      3. Can this template's content be adapted to fit this brand's messaging?
      4. Is there a logical connection between template use case and brand activities?

      COMMON SENSE EXAMPLES (not rules, just thinking patterns):
      - Professional services brands need professional-looking templates
      - Retail brands can use promotional/sales templates
      - B2B companies usually avoid casual/consumer-focused designs
      - Highly specific templates only work for matching industries
      - Generic templates work better across different industries

      OUTPUT REQUIREMENTS:
      - Include ALL templates in ranking
      - No duplicate template IDs
      - Scores between 0-100
      - Reasons must reference ACTUAL analysis

      REQUIRED JSON FORMAT:
      {
        "bestTemplateId": "template_master_id_from_list",
        "score": number_between_0_and_100,
        "reasons": [
          "Reason based on content-business alignment",
          "Reason based on tone/professionalism fit",
          "Reason based on practical adaptability"
        ],
        "ranking": [
          {"templateId": "template_master_id_from_list", "score": number},
          {"templateId": "template_master_id_from_list", "score": number},
          {"templateId": "template_master_id_from_list", "score": number},
          {"templateId": "template_master_id_from_list", "score": number}
        ]
      }

      GUIDING PRINCIPLE: 
      1) Use logical reasoning.
      2) not hardcoded rules. 
      3)If a template's content doesn't make sense for a brand's business, score it low.
      4)Output format must and should follow the REQUIRED JSON FORMAT no comparmize in that.
      `;
     
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    console.log("response ---->", response)

    const reply = response.choices?.[0]?.message?.content ?? "No response from OpenAI";

    return jsonResponse({data:reply})
  } catch (error) {
    return jsonResponse({ error: "Internal Server Error" }, 500);
  }
})


function jsonResponse(data:any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/open-ai-templates-suggestion' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
