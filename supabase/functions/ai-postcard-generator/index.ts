// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
// Use npm: specifiers instead of esm.sh
import { StateGraph, START, END, Send } from "npm:@langchain/langgraph";
import { ChatOpenAI } from "npm:@langchain/openai";
import { ChatPromptTemplate } from "npm:@langchain/core/prompts";
import { z } from "npm:zod";

// --- 1. SCHEMAS
const PostcardPlanSchema = z.object({
  hero: z.object({
    title: z.string(),
    subtitle: z.string(),
    theme: z.string()
  }),
  establishment: z.object({
    name: z.string(),
    logo_url: z.string(),
    category: z.string()
  }),
  offers: z.array(z.object({
    label: z.string(),
    value: z.string(),
    description: z.string()
  })),
  contact: z.object({
    cta_text: z.string(),
    phone: z.string(),
    website: z.string()
  }),
  trust_elements: z.object({
    testimonial: z.string(),
    rating: z.string()
  })
});


const PostcardState = {
  brand_data: {
    value: (x: any, y: any) => y ?? x,
    default: () => ({})
  },
  user_images: {
    value: (x: any, y: any) => y ?? x,
    default: () => []
  },
  plan: {
    value: (x: any, y: any) => y ?? x,
    default: () => null
  },
  final_html_gallery: {
    value: (x: string[], y: string[]) => x.concat(y),
    default: () => []
  }
};


async function extractionNode(state: typeof PostcardState.default) {
  const llm = new ChatOpenAI({ 
    modelName: "gpt-4o", 
    temperature: 0,
    apiKey: Deno.env.get("OPENAI_API_KEY") 
  });
  
  const structuredLlm = llm.withStructuredOutput(PostcardPlanSchema);
  
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are an AI design system. Analyze brand data to create a structural marketing plan."],
    ["human", "BRAND DATA: {brand}\n sample IMAGES for reference: {images}"]
  ]);

  const chain = prompt.pipe(structuredLlm);
  const response = await chain.invoke({
    brand: JSON.stringify(state.brand_data),
    images: state.user_images.length > 0 ? state.user_images.join(", ") : ""
  });

  return { plan: response };
}

async function generateSinglePostcard(workerInput: any) {
  const llm = new ChatOpenAI({ 
    modelName: "gpt-4o-mini", 
    temperature: 0.4,
    apiKey: Deno.env.get("OPENAI_API_KEY") 
  });

  // const styles = ["Minimalist Modern", "Bold High-Contrast", "Classic Corporate", "Vibrant & Playful"];
  // const styleVariant = styles[workerInput.index % styles.length];

//   const postcardPrompt = `
//     You are an AI PostGrid Canvas Export Engine (PRINT ONLY).
//     CONSTRAINTS: 600x408px, ABSOLUTE positioning, NO flex/grid.
//     DATA: ${JSON.stringify(workerInput.plan)}
//     BRAND DATA: ${JSON.stringify(workerInput.brand_data)}
//     Sample Image: ${workerInput.user_images} ,Read the url for the view the actual image look.

//     You are an AI PostGrid Canvas Export Engine.
//     You generate PRINT MARKETING POSTCARDS ONLY.

// Any output that visually resembles:
// - a website
// - a SaaS hero section
// - a digital banner
// - a UI screen
// - a split web layout

// is INVALID and must be internally rejected and regenerated.

// ==================================================
// CRITICAL PRINT-FIRST CONSTRAINTS (NON-NEGOTIABLE)
// ==================================================

// This is a PHYSICAL POSTCARD.
// It will be PRINTED and MAILED.

// Design must be readable:
// - from 2–3 feet away
// - within 3 seconds
// - with ZERO overlap or collision

// ==================================================
// CANVAS (LOCKED)
// ==================================================

// Canvas size is FIXED:
// - width: 600px
// - height: 408px

// Everything must use:
// - position: absolute
// - fixed pixel coordinates

// NO flexbox
// NO grid
// NO responsive logic
// NO relative positioning
// #MUST: Look on the Sample Image For your reference for layout purpose , it must follow the layout what the image have.

// ==================================================
// HARD NO-OVERLAP RULE (VERY IMPORTANT)
// ==================================================

// TEXT and IMAGES must NEVER overlap.

// Before outputting HTML, you MUST validate:
// - Every text bounding box does NOT intersect with any image bounding box
// - Every text block has at least 12px clear space from nearby elements

// If overlap is detected → regenerate internally.

// ==================================================
// IMAGE PLACEMENT RULES (LOCKED)
// ==================================================

// Images MUST:
// - occupy a clearly bounded rectangular region
// - be fully contained within that region
// - NEVER bleed into text areas
// - NEVER sit behind text
// - NEVER be used as a background for text
// - Must: Add an image respective to the given sematic Brand Data 




// Allowed image layout:
// - left block OR
// - right block
// NOT both.

// Select a single brand-appropriate, industry-relevant image derived from the company description and industry data, and place it within one clearly bounded rectangular area (left OR right) sized to fit the 600×408 postcard canvas without overlapping any text or violating spacing rules.

// ==================================================
// TEXT ALIGNMENT RULES (MANDATORY)
// ==================================================

// All text MUST follow a vertical rhythm:
// - Headline
// - Subtitle
// - Offer
// - Trust
// - Contact

// Each block MUST:
// - align to the same left edge
// - have consistent vertical spacing
// - never float or drift visually

// Baseline alignment matters.
// Misaligned text is INVALID.

// ==================================================
// CTA & OFFER RULES (PRINT ONLY)
// ==================================================

// DO NOT generate buttons.

// CTA must be:
// - plain printed action text OR
// - an offer label / sticker using SVG

// Examples:
// - FREE TEAM SETUP
// - CALL TODAY
// - SCAN TO START
// - LIMITED TIME OFFER

// Rounded web-style buttons are FORBIDDEN.

// ==================================================
// BOTTOM STRIP (MANDATORY)
// ==================================================

// The contact section MUST:
// - be placed in a full-width horizontal strip at the bottom
// - contain brand + website/phone
// - be visually separated from main content

// ==================================================
// OUTPUT FORMAT (STRICT)
// ==================================================

// - Output ONLY raw HTML
// - One complete HTML document
// - No explanations
// - No markdown
// - No comments (except <!-- Template X --> if multiple)

// ==================================================
// FINAL SELF-VALIDATION (MANDATORY)
// ==================================================

// Before returning HTML, you MUST ask internally:
// 1. Does ANY image overlap text? → If yes, regenerate.
// 2. Does the layout look like a website hero? → If yes, regenerate.
// 3. Are text blocks cleanly aligned and evenly spaced? → If no, regenerate.
// 4. Would this look correct if PRINTED? → If no, regenerate.

// Only output HTML if ALL answers pass.


//     Output ONLY raw HTML.
//   `;

const postcardPrompt= `You are an AI PostGrid Canvas Export Engine.
You generate PRINT MARKETING POSTCARDS ONLY.

INPUT:
extracted DATA: ${JSON.stringify(workerInput.plan)}
BRAND DATA: ${JSON.stringify(workerInput.brand_data)}
Sample Image: ${workerInput.user_images} ,Read the url for the view the actual image look.


Any output that visually resembles:
- a website
- a SaaS hero section
- a digital banner
- a UI screen
- a split web layout
is INVALID and must be internally rejected and regenerated.
==================================================
CRITICAL PRINT-FIRST CONSTRAINTS (NON-NEGOTIABLE)
==================================================
This is a PHYSICAL POSTCARD.
It will be PRINTED and MAILED.
Design must be readable:
- from 2–3 feet away
- within 3 seconds
- with ZERO overlap or collision
==================================================
CANVAS (LOCKED)
==================================================
Canvas size is FIXED:
- width: 600px
- height: 408px
Everything must use:
- position: absolute
- fixed pixel coordinates
NO flexbox
NO grid
NO responsive logic
NO relative positioning
==================================================
HARD NO-OVERLAP RULE (VERY IMPORTANT)
==================================================
TEXT and IMAGES must NEVER overlap.
Before outputting HTML, you MUST validate:
- Every text bounding box does NOT intersect with any image bounding box
- Every text block has at least 12px clear space from nearby elements
If overlap is detected → regenerate internally.
==================================================
IMAGE PLACEMENT RULES (LOCKED)
==================================================
You MUST select ONE high-quality image from Unsplash.
The image MUST:
- be loaded using a DIRECT Unsplash image URL (images.unsplash.com)
- include auto=format, fit=crop, and width parameters
- be publicly accessible without authentication
- be placed using a standard <img src="..."> tag
- NOT rely on CSS background-image
- NOT rely on lazy loading
- NOT rely on JS
Images MUST:
- occupy a clearly bounded rectangular region
- be fully contained within that region
- NEVER bleed into text areas
- NEVER sit behind text
- NEVER be used as a background for text
Allowed image layout:
- LEFT block OR
- RIGHT block
NOT both.
If the image does not render → regenerate internally with a different Unsplash image.
==================================================
TEXT ALIGNMENT RULES (MANDATORY)
==================================================
All text MUST follow a strict vertical rhythm:
1. Headline
2. Subtitle
3. Offer
4. Trust
5. Contact
Each block MUST:
- align to the same left edge
- have consistent vertical spacing
- never float or drift visually
Baseline alignment matters.
Misaligned text is INVALID.
==================================================
CTA & OFFER RULES (PRINT ONLY)
==================================================
DO NOT generate buttons.
CTA must be:
- plain printed action text OR
- an offer label / sticker using SVG
Examples:
- FREE CONSULTATION
- CALL TODAY
- LIMITED TIME OFFER
Web-style buttons are FORBIDDEN.
==================================================
BOTTOM STRIP (MANDATORY)
==================================================
The contact section MUST:
- be placed in a full-width horizontal strip at the bottom
- contain brand + website/phone
- be visually separated from main content
==================================================
OUTPUT FORMAT (STRICT)
==================================================
- Output ONLY raw HTML
- One complete HTML document
- No explanations
- No markdown
- No comments (except <!-- Template X --> if multiple)
==================================================
FINAL SELF-VALIDATION (MANDATORY)
==================================================
Before returning HTML, you MUST ask internally:
1. Does ANY image fail to load? → If yes, regenerate.
2. Does ANY image overlap text? → If yes, regenerate.
3. Does the layout look like a website hero? → If yes, regenerate.
4. Are text blocks cleanly aligned and evenly spaced? → If no, regenerate.
5. Would this look correct if PRINTED? → If no, regenerate.
Only output HTML if ALL answers pass.`

  const response = await llm.invoke(postcardPrompt);
  
  return { final_html_gallery: [response.content] };
}

// --- 4. DISPATCHER 
const dispatchWorkers = (state: any) => {
  return Array.from({ length: 12 }).map((_, i) => 
    new Send("generate_single_postcard", {
      index: i,
      brand_data: state.brand_data,
      plan: state.plan
    })
  );
};

// --- 5. ORCHESTRATION ---
const workflow = new StateGraph({ channels: PostcardState })
  .addNode("extractor", extractionNode)
  .addNode("generate_single_postcard", generateSinglePostcard)
  .addEdge(START, "extractor")
  .addConditionalEdges("extractor", dispatchWorkers)
  .addEdge("generate_single_postcard", END);

const appEngine = workflow.compile();

// --- 6. SERVE ---

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
Deno.serve(async (req) => {
  try {

    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: { ...corsHeaders },
      });
    }
    const payload = await req.json();
    
    const initialState = {
      brand_data: payload.brand,
      user_images: payload.images || []
    };

    const result = await appEngine.invoke(initialState);
    console.log("result----->", result)
    return new Response(
      JSON.stringify({
        status: "success",
        plan: result.plan,
        postcards: result.final_html_gallery
      }),
      { headers: { ...corsHeaders,"Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/ai-postcard-generator' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
