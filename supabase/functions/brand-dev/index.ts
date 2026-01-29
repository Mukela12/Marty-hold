// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { ChatOpenAI } from "npm:@langchain/openai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/* OPENAI INVOCATION */
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

TASK:
- Analyze the provided brand metadata
- Infer a SPECIFIC, descriptive business category
- Map that category to ONE exact database category from the list below

RULES (NON-NEGOTIABLE):
- "brand_category" MUST be a specific real-world business type (e.g., dental care, car dealership, fitness center)
- "exact_category" MUST be chosen ONLY from the allowed categories list
- "exact_category" MUST match the category EXACTLY (character-for-character)
- DO NOT create or modify database category names
- DO NOT return multiple categories
- DO NOT explain
- ALWAYS return one result

ALLOWED DATABASE CATEGORIES (CHOOSE ONE ONLY):
- Technology & Software
- Non-Profit & Government
- Agriculture
- Construction & Real Estate
- Media & Entertainment
- Education & Training
- Professional Services
- Travel & Hospitality
- Energy & Utilities
- Healthcare & Medical
- Finance & Insurance
- Manufacturing & Industrial
- Retail & Consumer Goods
- Food & Beverage
- Sports & Fitness
- Automotive
- Logistics & Supply Chain

BRAND DETAILS:
${JSON.stringify(brandDetails, null, 2)}

OUTPUT FORMAT (EXACT — JSON ONLY):
{
  "brand_category": "<specific business type inferred from the brand>",
  "exact_category": "<must be exactly one of the allowed database categories>",
  "confidence": <number between 0 and 1>
}
`;



  return generateCategoryWithRetry(llm, prompt);
};

Deno.serve(async (req: any) => {
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: { ...corsHeaders },
      });
    }

  try {
    const BRANDDEV_URL = Deno.env.get("BRANDDEV_URL");
    const BRANDDEV_KEY = Deno.env.get("BRANDDEV_KEY");

    if (!BRANDDEV_URL || !BRANDDEV_KEY) {
      console.error("[Config Error] Missing BRANDDEV_URL or BRANDDEV_KEY");
      return jsonResponse(
        { error: "Server configuration error. Contact support." },
        500
      );
    }

    
    const { companyUrl } = await req.json();
    
    if (!companyUrl) {
      return jsonResponse({ error: "companyUrl is required" }, 400);
    }

  
    const apiResponse = await fetch(`${BRANDDEV_URL}?domain=${companyUrl}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${BRANDDEV_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

    const isJson = apiResponse.headers.get("content-type")?.includes("application/json");
    const result = isJson ? await apiResponse.json() : await apiResponse.text();

    if (!apiResponse.ok) {
      console.error("Brand.dev Error:", result);
      return jsonResponse(
        { error: "Brand.dev API error", details: result },
        apiResponse.status
      );
    };
    
    /* get category */
    const categoryResult = await fetchBrandCategory(result?.brand);
    const { brand } = result;
    brand['category'] = categoryResult.brand_category;
    brand['masterCategory'] = categoryResult?.exact_category;
    
    // returning the response
    return jsonResponse({ data: result }, 200);

  } catch (err: any) {
    console.error("Unexpected Server Error:", err);
    return jsonResponse({ error: "Internal Server Error" }, 500);
  }
});


function jsonResponse(data: any, status = 200) {
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/brand-dev' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
