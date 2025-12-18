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
    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders,
      });
    }    
    const { brandIndustries,masterIndustries  } = await req.json();
    console.log("brand --->", brandIndustries, masterIndustries)
//     const prompt = `INDUSTRY CLASSIFICATION SYSTEM - PROCESS ALL ITEMS

// TASK: Match each brand industry entry to the best master industry category.

// INPUT DATA:
// 1. MASTER CATEGORIES (Choose from these):
// ${JSON.stringify(masterIndustries, null, 2)}

// 2. BRAND INDUSTRY ENTRIES (Process ALL of these):
// ${JSON.stringify(brandIndustries, null, 2)}

// IMPORTANT: You MUST process ${brandIndustries.length} item(s). Output array MUST have ${brandIndustries.length} object(s).

// CRITICAL RULES:
// 1. RETURN EXACTLY ${brandIndustries.length} OBJECT(S) IN THE ARRAY
// 2. DO NOT return empty array []
// 3. DO NOT return text outside JSON
// 4. EACH object MUST contain all 5 fields
// 5. USE semantic matching (similar meaning, not exact words)

// SEMANTIC MATCHING EXAMPLES - USE THESE AS GUIDES:
// • "Retail & E-commerce" → "Retail & Consumer Goods" 
// • "Sports" or "Sports Venues" → "Sports & Fitness"
// • "Software" or "AI" → "Technology & Software"
// • "Healthcare" or "Medical" → "Healthcare & Medical"
// • "Manufacturing" → "Manufacturing & Industrial"
// • "Food & Beverage" or "Grocery" → "Food & Beverage"
// • "Construction" → "Construction & Real Estate"
// • "Energy" → "Energy & Utilities"
// • "Media" → "Media & Entertainment"
// • "Education" → "Education & Training"
// • "Travel" → "Travel & Hospitality"
// • "Finance" → "Finance & Insurance"
// • "Professional Services" → "Professional Services"
// • "Agriculture" → "Agriculture"
// • "Government" → "Non-Profit & Government"

// PROCESSING STEPS:
// 1. Look at FIRST brand entry: "${brandIndustries[0]?.industry}: ${brandIndustries[0]?.subindustry}"
// 2. Find most similar master category
// 3. Create output object with reasoning
// 4. Repeat for ALL ${brandIndustries.length} item(s)

// CONFIDENCE GUIDANCE:
// • "high": Clear semantic match (e.g., "Retail" → "Retail & Consumer Goods")
// • "medium": Related category (e.g., "E-commerce" → "Retail & Consumer Goods")
// • "low": Inferred match when no clear connection

// REQUIRED OUTPUT FORMAT - JSON ARRAY ONLY:
// [
//   {
//     "matched_category": "Category Name from Master Categories",
//     "confidence": "high|medium|low",
//     "reasoning": "Brief explanation (10-15 words)",
//     "original_industry": "Original industry name",
//     "original_subindustry": "Original subindustry name"
//   }
// ]
// `;
     
    const prompt = `## INDUSTRY SEMANTIC MAPPING ENGINE
        ## MISSION
        You are an industry ontology expert. Your task is to find the most accurate semantic match between specific brand industries and general master categories.

        ## INPUT DATA
        ### MASTER CATEGORIES (FIXED LIST - choose ONLY from these):
        ${JSON.stringify(masterIndustries, null, 2)}

        ### BRAND INDUSTRIES TO MAP (match each to ONE master category):
        ${JSON.stringify(brandIndustries, null, 2)}

        ## ABSOLUTE RULES
        1. **OUTPUT FORMAT**: Must return JSON array with exactly ${brandIndustries.length} object(s)
        2. **NO EMPTY RESULTS**: Every item gets a match, even if imperfect
        3. **VALID CATEGORIES**: matched_category MUST be from the MASTER CATEGORIES list above
        4. **COMPLETE FIELDS**: Each object requires: matched_category, confidence, reasoning, original_industry, original_subindustry

        ## UNIVERSAL MATCHING METHODOLOGY
        For EACH brand industry, execute this 4-step semantic analysis:

        ### STEP 1: DEEP SEMANTIC UNDERSTANDING
        Analyze "industry + subindustry" as a SINGLE business description:
        - What is the PRIMARY economic activity?
        - Who are the PRIMARY customers/beneficiaries?
        - What VALUE is being created/delivered?
        - What is the BUSINESS MODEL essence?

        ### STEP 2: CONCEPTUAL CATEGORIZATION
        Without looking at keywords, answer:
        - Is this about PRODUCTS or SERVICES?
        - Is this B2B, B2C, or B2G?
        - Is this PHYSICAL or DIGITAL?
        - Is this PRODUCTION, DISTRIBUTION, or SERVICE?

        ### STEP 3: MASTER CATEGORY EVALUATION
        For each master category, assess:
        1. **Semantic Scope**: Does this master category LOGICALLY contain this business activity?
        2. **Business Alignment**: Are the core activities conceptually similar?
        3. **Industry Standards**: Would industry experts agree with this classification?
        4. **Hierarchical Fit**: Is this a parent-child relationship in business taxonomy?

        ### STEP 4: CONFIDENCE ASSESSMENT
        - **HIGH (90-100% match)**: Direct logical containment (e.g., "Football Club" → "Sports & Fitness")
        - **MEDIUM (60-89% match)**: Related domain with strong conceptual overlap
        - **LOW (30-59% match)**: Best available match with reasonable connection

        ## UNIVERSAL MATCHING PRINCIPLES
        Apply these principles to ALL industries:

        1. **SCALE PRINCIPLE**: Match specific to general (specific business → broader category)
        2. **ESSENCE PRINCIPLE**: Focus on core business activity, not delivery method
        3. **CONTEXT PRINCIPLE**: Consider the entire business ecosystem
        4. **PRECEDENCE PRINCIPLE**: If multiple matches exist, choose the most precise

        ## THINKING PROCESS TEMPLATE
        For each item, think through:

        1. "The business [industry + subindustry] primarily does [core activity] for [target audience]"
        2. "This aligns with master category [X] because [semantic reason]"
        3. "Alternative categories considered: [Y, Z] but rejected because [reasons]"

        ## CRITICAL THINKING CHECKPOINTS
        Before finalizing each match, verify:
        ✓ Does this master category LOGICALLY contain this type of business?
        ✓ Would this classification make sense to a business analyst?
        ✓ Is there a closer semantic match available?
        ✓ Am I avoiding keyword matching and focusing on meaning?

        ## OUTPUT FORMAT (STRICT)
        Return ONLY this JSON array:

        [
          {
            "matched_category": "ExactMasterCategoryName",
            "confidence": "high|medium|low",
            "reasoning": "Clear explanation of the logical/semantic relationship (e.g., 'A cricket club is fundamentally a sports organization, which fits within Sports & Fitness as it involves athletic activities, fan engagement, and sports entertainment.')",
            "original_industry": "Exactly as provided",
            "original_subindustry": "Exactly as provided"
          }
        ]

        ## YOUR ANALYSIS TASK
        Now analyze ${brandIndustries.length} item(s) using DEEP SEMANTIC ANALYSIS:

        ${brandIndustries.map((item:any, index:any) => 
        `### ITEM ${index + 1} ANALYSIS
        **Complete Business Description**: "${item.industry}: ${item.subindustry}"

        **Your Semantic Analysis Required**:
        1. Primary economic activity: [Analyze what they actually DO]
        2. Core business model: [Analyze how they operate]
        3. Target audience: [Analyze who they serve]
        4. Value proposition: [Analyze what value they provide]

        **Master Category Evaluation**:
        - Compare with all ${masterIndustries.length} master categories
        - Identify which category LOGICALLY contains this business type
        - Explain why it's the BEST semantic fit`
        ).join('\n\n')}

        ## FINAL INSTRUCTION
        Perform DEEP SEMANTIC ANALYSIS, not keyword matching.
        Return the JSON array with 100% accurate matches.
        Begin with '[' and end with ']'.`

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    console.log("response ---->", response)

    const reply = response.choices?.[0]?.message?.content ?? "No response from OpenAI";
    console.log("reply ---->", reply)
    return jsonResponse({data:reply})
  } catch (error) {
    console.log("errror ---->", error)
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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/open-ai-industry-mapping' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
