import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { ChatOpenAI } from "npm:@langchain/openai";

//  Retry-safe OpenAI invocation
async function generateCategoryWithRetry(llm: ChatOpenAI, prompt: string, retries = 2 ): Promise<any> {
  // variable used to check the retry after thrid time it will stop
  let lastError: any;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await llm.invoke(prompt);
      const raw = response.content as string;

      // Strip markdown / fences
      const cleaned = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      return JSON.parse(cleaned);
    } catch (error) {
      lastError = error;
    };
  };

  throw new Error("Failed to infer brand category after retries");
};

// Brand → Exact Category inference
async function fetchBrandCategory(brandDetails: any) {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0,
    apiKey: Deno.env.get("OPENAI_API_KEY")
  });

  const prompt = `
You are a business classification engine.

CONTEXT:
- You receive structured brand metadata
- Broad industries may be present (e.g., Healthcare)
- Your job is to infer the MOST SPECIFIC real-world business category

RULES (NON-NEGOTIABLE):
- DO NOT return broad industries
- DO NOT explain
- DO NOT add multiple categories
- Return ONE exact business category only

EXAMPLES:
Healthcare → Dental Clinic
Healthcare → Eye Care Center
Healthcare → Physiotherapy Clinic
Food → Restaurant
Retail → Clothing Store

BRAND DETAILS:
${JSON.stringify(brandDetails, null, 2)}

OUTPUT FORMAT (EXACT — JSON ONLY):
{
  "brand_category": "<exact category>",
  "confidence": <number between 0 and 1>
}`;

  return generateCategoryWithRetry(llm, prompt);
};

Deno.serve(async (req: any) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type"
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  };

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: corsHeaders }
      );
    };

    const payload = await req.json();

    if (!payload.brandDetails) {
      return new Response(
        JSON.stringify({ error: "Missing brandDetails payload" }),
        { status: 400, headers: corsHeaders }
      );
    };

    const categoryResult = await fetchBrandCategory(payload.brandDetails);

    return new Response(
      JSON.stringify({
        status: "success",
        category: categoryResult
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        status: "error",
        message: error.message
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});
