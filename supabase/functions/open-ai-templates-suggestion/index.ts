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

## TONE CLASSIFICATION SYSTEM:

### AVAILABLE TONE CATEGORIES:
- friendly
- professional  
- luxury
- playful

### TONE ANALYSIS METHOD:
1. Analyze ONLY the template content text
2. Look at word choice, sentence structure, and implied relationship with reader
3. Classify based on these textual patterns:

### TONE IDENTIFICATION GUIDELINES:
- **Friendly**: Uses warm, casual, welcoming language. May include conversational phrases, exclamations, or personal pronouns like "you", "we", "our". Often inviting and approachable.
- **Professional**: Uses formal, precise, business-like language. Focuses on expertise, quality, reliability. May include industry terms, formal structure, and measured tone.
- **Luxury**: Uses sophisticated, elegant, exclusive language. Emphasizes premium quality, uniqueness, status. Often descriptive with rich vocabulary.
- **Playful**: Uses fun, energetic, creative language. May include humor, whimsy, or imaginative expressions. Often light-hearted and engaging.

### TONE DECISION RULES:
1. Each template gets ONE tone from the four categories above
2. Choose the tone that BEST describes the majority of the text's character
3. If equally balanced between two tones, choose based on PRIMARY PURPOSE of template
4. Base decision ONLY on words and meaning in the template content

## WELCOME MESSAGE GENERATION:
- Create a TWO-word welcome message based on template tone and content
- Message should reflect the tone classification
- Use only words or concepts present or strongly implied in template content
- Keep it natural and appropriate to the template's style



## OUTPUT FORMAT (EXACT STRUCTURE):
{
  "bestTemplateId": "template_id_with_highest_score",
  "score": highest_score_number,
  "ranking": [
    {
      "templateId": "template_id_1",
      "score": score_1,
      "tone": "one_of_four_classifications mentioned in Tone_MASTER, follow the TONE_GUIDE_LINES",
      "welcomeMessage": "two_word_message", 
      "reason": "One sentence explaining topic similarity"
    },
    {
      "templateId": "template_id_2",
      "score": score_2,
      "tone": "one_of_four_classifications mentioned in Tone_MASTER, follow the TONE_GUIDE_LINES",
      "welcomeMessage": "two_word_message",
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
6) Tone classification must be based ONLY on the template content text
7) Welcome message must be derived ONLY from template content meaning

## FINAL REMINDER:
Look at the brand text.
Look at each template's content.
Score based on how similar the topics are and based on MEANING similarity, not word matching each template should have unique scores.
That's it.
Analyze each template's text to determine its tone.
Create a two-word welcome message fitting that tone.
All analysis must emerge from reading the texts, not from pre-existing knowledge.
NOW OUTPUT JSON:`
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });
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
