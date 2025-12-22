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
    // const prompt = `
    //   Brand-to-Template Matching Analysis

    //   You are an advanced brand identity matching engine with dynamic industry analysis capabilities

    //   BRAND: ${JSON.stringify(brand, null, 2)}

    //   TEMPLATES: ${JSON.stringify(templates, null, 2)}

    //   TASK: Find the most suitable template for this brand.

    //   IMPORTANT RULES (must follow):
    //   1. You MUST use the exact template_master_id provided inside the templates input.
    //   2. NEVER invent or hallucinate any template IDs or names.
    //   3. Only choose from the templates passed in the "templates" array.
    //   4. If you reference a template, you MUST use its actual "template_master_id".

    //   ANALYSIS APPROACH:
    //   1. Understand what the brand DOES (from industries/description)
    //   2. For each template, understand what it's DESIGNED FOR (from content)
    //   3. Apply logical matching: Would this brand realistically use this template?
    //   4. Score based on relevance, tone fit, and customization potential

    //   SCORING (0-100):
    //   - 80-100: Excellent match (template perfectly aligns with brand's business)
    //   - 60-79: Good match (template can work well with minor adjustments)
    //   - 40-59: Acceptable match (significant adaptation needed but possible)
    //   - 20-39: Poor match (major content/business model mismatch)
    //   - 0-19: Very poor match (completely unrelated purposes)

    //   KEY QUESTIONS TO ASK:
    //   1. Does this template's primary purpose align with what this brand does?
    //   2. Would this template's tone be appropriate for this brand's industry?
    //   3. Can this template's content be adapted to fit this brand's messaging?
    //   4. Is there a logical connection between template use case and brand activities?

    //   COMMON SENSE EXAMPLES (not rules, just thinking patterns):
    //   - Professional services brands need professional-looking templates
    //   - Retail brands can use promotional/sales templates
    //   - B2B companies usually avoid casual/consumer-focused designs
    //   - Highly specific templates only work for matching industries
    //   - Generic templates work better across different industries

    //   OUTPUT REQUIREMENTS:
    //   - Include ALL templates in ranking
    //   - No duplicate template IDs
    //   - Scores between 0-100
    //   - Reasons must reference ACTUAL analysis

    //   REQUIRED JSON FORMAT:
    //   {
    //     "bestTemplateId": "template_master_id_from_list",
    //     "score": number_between_0_and_100,
    //     "reasons": [
    //       "Reason based on content-business alignment",
    //       "Reason based on tone/professionalism fit",
    //       "Reason based on practical adaptability"
    //     ],
    //     "ranking": [
    //       {"templateId": "template_master_id_from_list", "score": number},
    //       {"templateId": "template_master_id_from_list", "score": number},
    //       {"templateId": "template_master_id_from_list", "score": number},
    //       {"templateId": "template_master_id_from_list", "score": number}
    //     ]
    //   }

    //   GUIDING PRINCIPLE: 
    //   1) Use logical reasoning.
    //   2) not hardcoded rules. 
    //   3)If a template's content doesn't make sense for a brand's business, score it low.
    //   4)Output format must and should follow the REQUIRED JSON FORMAT no comparmize in that.
    //   `;
//      const prompt = `# BRAND-TO-TEMPLATE CONTEXTUAL MATCHING SYSTEM

// ## CRITICAL RULES:
// 1. OUTPUT MUST BE PURE VALID JSON ONLY
// 2. USE EXACT "template_id" FROM TEMPLATES ARRAY
// 3. ANALYZE PATTERNS, NOT PRE-DEFINED CATEGORIES
// 4. NO HARDCODED INDUSTRY KNOWLEDGE

// # INPUT DATA:
// BRAND DATA: ${JSON.stringify(brand, null, 2)}

// TEMPLATES DATA (Text Content Only):
// ${JSON.stringify(templates.map((t: { template_id: any; html: string; }) => ({
//   template_id: t.template_id,
//   // Extract ALL text content from HTML (clean, no tags)
//   content_text: t.html.replace(/<[^>]*>/g, ' ')
//                       .replace(/\{\{[^}]*\}\}/g, '')  // Remove placeholders
//                       .replace(/\s+/g, ' ')
//                       .trim(),
//   // Raw HTML snippet for context (first 200 chars)
//   html_preview: t.html.substring(0, 200).replace(/</g, '&lt;').replace(/>/g, '&gt;')
// })), null, 2)}

// # ANALYTICAL APPROACH:

// ## PHASE 1: UNDERSTAND THE BRAND CONTEXT
// Read the brand data and identify:
// 1. What business activities are described?
// 2. What language/tone is used in description?
// 3. What implicit industry can be inferred?
// 4. What type of communication would this brand need?

// ## PHASE 2: ANALYZE EACH TEMPLATE CONTEXT
// For each template's content_text:
// 1. Read the actual words and phrases
// 2. Identify recurring themes or subjects
// 3. Determine what type of entity would use this language
// 4. Note any specialized terminology

// ## PHASE 3: CONTEXTUAL MATCHING METHODOLOGY

// ### Step 1: Semantic Domain Extraction
// From brand description, extract:
// - Key activity verbs (what they do)
// - Key subject nouns (what they work with)
// - Key industry terminology
// - Target audience hints

// From template content, extract:
// - Domain-specific vocabulary
// - Service/product references
// - Customer interaction patterns
// - Communication purpose

// ### Step 2: Domain Overlap Analysis
// Compare:
// - Do the semantic domains overlap?
// - Is template vocabulary appropriate for brand's activities?
// - Would template content make sense coming from this brand?

// ### Step 3: Communication Purpose Alignment
// Assess:
// - What is the template trying to achieve? (inform, promote, transact, etc.)
// - What communication needs does the brand have?
// - Is there alignment in communication goals?

// ## SCORING FRAMEWORK (0-100):

// ### A. Semantic Coherence (0-40)
// - 35-40: Template content semantically aligns perfectly with brand's described activities
// - 25-34: Template content is in a related semantic domain
// - 15-24: Some semantic overlap exists
// - 5-14: Minimal semantic connection
// - 0-4: Semantic domains are contradictory

// ### B. Contextual Appropriateness (0-30)
// - 25-30: Template's communication style perfectly matches brand's tone/needs
// - 20-24: Style is generally appropriate
// - 15-19: Some style mismatch but workable
// - 10-14: Significant style adjustment needed
// - 0-9: Inappropriate communication style

// ### C. Content Adaptability (0-20)
// - 15-20: Content can be directly used or minimally adapted
// - 10-14: Requires moderate content modification
// - 5-9: Requires substantial rewriting
// - 0-4: Core content is incompatible

// ### D. Practical Utility (0-10)
// - 8-10: Template serves a clear business need for this brand
// - 5-7: Could serve some utility with adaptation
// - 0-4: Little practical utility for this brand

// ## DECISION-MAKING PRINCIPLES:

// 1. **Contextual Fit Over Keywords**: Look for overall context match, not specific words
// 2. **Business Logic First**: Would using this template make business sense?
// 3. **Communication Need**: Does the brand need this type of communication?
// 4. **Natural Language Understanding**: Read and comprehend both texts naturally

// ## THINKING PROCESS (INTERNAL):

// For each template, follow this reasoning chain:
// 1. "When I read this template's content, what kind of business comes to mind?"
// 2. "When I read the brand description, what kind of business is this?"
// 3. "Would the business from step 1 use the template from step 2?"
// 4. "If not, could the template be adapted? How much change?"
// 5. "Does the adaptation make practical sense?"

// ## PATTERN RECOGNITION GUIDELINES:

// 1. **Specialized Terminology Detection**:
//    - If template uses highly specialized terms, it's likely for a specific domain
//    - If brand operates in that domain, high match
//    - If brand doesn't operate there, low match

// 2. **General vs Specific Content**:
//    - General content templates = wider applicability
//    - Specific content templates = narrow applicability

// 3. **Communication Type Recognition**:
//    - Promotional language = sales/marketing businesses
//    - Instructional language = service/consulting businesses
//    - Transactional language = retail/e-commerce businesses
//    - Informational language = most businesses

// ## OUTPUT FORMAT - MUST FOLLOW EXACTLY:

// {
//   "bestTemplateId": "exact_template_id",
//   "score": 85,
//   "confidence": "high/medium/low",
//   "primaryMatchReason": "Context-based reason without industry names",
//   "analysis": {
//     "brandContext": "Brief summary of brand's apparent business focus",
//     "templateContext": "Brief summary of template's apparent purpose",
//     "semanticAlignment": "Description of how contexts align or differ",
//     "adaptationRequired": "What would need to change if used"
//   },
//   "ranking": [
//     {
//       "templateId": "id1",
//       "score": 95,
//       "reason": "Contextual reason based on semantic analysis"
//     },
//     {
//       "templateId": "id2",
//       "score": 87,
//       "reason": "Contextual reason based on semantic analysis"
//     }
//   ],
//   "methodologyNotes": [
//     "Note on analytical approach used"
//   ]
// }

// ## CRITICAL AVOIDANCES:

// 1. DO NOT reference specific industries (medical, automotive, etc.)
// 2. DO NOT use pre-defined category names
// 3. DO NOT hardcode any business types
// 4. DO NOT assume any template purposes
// 5. DO READ and COMPREHEND texts naturally

// ## ANALYTICAL MINDSET:

// Approach this as a natural language understanding task:
// 1. Read brand text → form mental model of business
// 2. Read template text → form mental model of use case
// 3. Compare mental models → assess compatibility
// 4. Score based on model overlap

// ## FINAL GUIDANCE:

// Use your natural language understanding capabilities to:
// 1. Comprehend the brand's described activities
// 2. Comprehend each template's content and implied use
// 3. Assess whether the template's implied use aligns with the brand's activities
// 4. Score based on the depth of this alignment

// All analysis must emerge from reading the texts, not from pre-existing knowledge.`

const prompt = `# TEMPLATE MATCHING - VERSION 2.0
Brand-to-Template Matching Analysis
 You are an advanced brand identity matching engine with dynamic industry analysis capabilities.
 You are genius in matching the brand with templates
# ONE SIMPLE RULE: COMPARE TEXT CONTENT

## OUTPUT REQUIREMENTS:
1. MUST OUTPUT VALID JSON ONLY
2. USE EXACT "template_id" FROM templates ARRAY
3. NO OTHER TEXT BEFORE OR AFTER JSON

## INPUT DATA:

### BRAND TEXT TO ANALYZE:
"${brand?.title || ''} - ${brand?.description || ''}"

### TEMPLATES TO COMPARE:
${JSON.stringify(templates.map((t: { template_id: any; html: string; }) => ({
  template_id: t.template_id,
  content: t.html
    .replace(/<[^>]*>/g, ' ')           
    .replace(/\{\{[^}]*\}\}/g, '')      
    .replace(/&[a-z]+;/g, ' ')          
    .replace(/\s+/g, ' ')               
    .trim()
    .substring(0, 500)                  
})), null, 2)}

## PURE TEXT SIMILARITY ANALYSIS:

### CONCEPTUAL APPROACH:
1. Read brand text → understand its meaning and focus
2. Read each template text → understand its meaning and focus  
3. Compare conceptual alignment → not word matching

### SCORING PRINCIPLES:
- Score based on MEANING similarity, not word matching
- Consider the OVERALL CONCEPT being communicated
- Assess whether the template's message would make sense coming from this brand

### SCORING SCALE (0-100):
- 90-100: Communicating about the same core concepts/services
- 70-89: Discussing related concepts with significant overlap
- 50-69: Some conceptual overlap but different focus
- 30-49: Different concepts with minor connections
- 10-29: Mostly different concepts
- 0-9: Completely unrelated concepts

### DIFFERENTIATION RULES:
1. Each template receives a UNIQUE score
2. Scores must cover at least 50 points range
3. If conceptual similarity appears equal, differentiate by:
   - Specificity of match
   - Depth of concept alignment
   - Natural language variance

## SIMPLE TASK:
Compare the BRAND TEXT with each TEMPLATE'S CONTENT.
Score each template from 0-100 based on ONE THING ONLY:
**How similar are the topics/subjects discussed?**


## THINKING PROCESS (SIMPLIFIED):
1. Read brand text: What is this company about?
2. Read template content: What is this template about?
3. Compare: Are they talking about similar things?
4. Score: Based on similarity (0-100)

## MANDATORY RULES FOR SCORE DIFFERENTIATION:
1. EACH template MUST get a DIFFERENT score
2. Scores MUST span at least 30 points between highest and lowest
3. If match count is same, adjust scores by ±3-5 points
4. Highest score goes to template with MOST matches and BEST specificity

## TIE-BREAKING RULES
If same match count, differentiate by:
1. Specificity of match (exact terms vs general)
2. Relevance to brand's primary focus
3. Number of supporting words that align
4. NEVER give same score to different templates


## EXAMPLE (FOR UNDERSTANDING ONLY):
1)Brand: "We provide dental care and teeth cleaning services"
Template 1: "Get your teeth checked today!"
Template 2: "Car repair service available"
→ Template 1 scores high (similar topics), Template 2 scores low (different topics)

2)Brand : "We provide you best coaching in coding"
Template 1: "coding skills are mastered here"
Template 2: "grasp the latest techonology here by mastering current trend tech"
 → here Template 1 and Template 2 both sticks with the same topic , now you have give best template score based on the brand needs give score among them"


## OUTPUT FORMAT (EXACT STRUCTURE):
{
  "bestTemplateId": "template_id_with_highest_score",
  "score": highest_score_number,
  "ranking": [
    {
      "templateId": "template_id_1",
      "score": score_1,
      "reason": "One sentence explaining topic similarity"
    },
    {
      "templateId": "template_id_2",
      "score": score_2,
      "reason": "One sentence explaining topic similarity"
    }
    // Include ALL templates in ranking, highest score first
  ]
}

## CRITICAL INSTRUCTIONS:
1)Compare ONLY the text content provided that is as mentioned above based on MEANING similarity, not word matching
2)Do NOT use any external knowledge
3)Do NOT reference specific industries
4)Do NOT make own assumptions
5)score must be given based on the previous instruction mentioned above

## FINAL REMINDER:
Look at the brand text.
Look at each template's content.
Score based on how similar the topics are and based on MEANING similarity, not word matching each template should have unique scores.
That's it.
All analysis must emerge from reading the texts, not from pre-existing knowledge.
NOW OUTPUT JSON:`
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
