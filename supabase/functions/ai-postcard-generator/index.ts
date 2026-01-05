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
  }),
  // NEW: Capturing the "DNA" of the layout
  layout_metadata: z.object({
    image_alignment: z.enum(["left", "right", "background", "top", "bottom"]),
    text_alignment: z.enum(["left", "right", "center"]),
    primary_color_hex: z.string(),
    secondary_color_hex: z.string(),
    hero_position_coords: z.string().describe("e.g. top: 40px; left: 20px;"),
    offer_display_style: z.enum(["badge", "list", "strip"])
  })
});

// For multiple images, we use an array wrapper
const MultiPostcardExtraction = z.object({
  plans: z.array(PostcardPlanSchema)
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
  
  console.log("state---->", state,state["user_images"])
  const structuredLlm = llm.withStructuredOutput(MultiPostcardExtraction);
  
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a Senior Print Production Designer and Vision Analyst. 
    Your task is to reverse-engineer marketing postcards into a structured schema.

    CRITICAL ANALYSIS RULES:
    1. SPATIAL MAPPING: Determine the X/Y coordinates of the Hero section, Image blocks, and Offer badges.
    2. TYPOGRAPHY: Identify the hierarchy (Title vs Subtitle).
    3. COLOR EXTRACTION: Identify the dominant brand colors from the pixels.
    4. LAYOUT DNA: Note if the image is on the left, right, or serving as a background.
    
    You must process EVERY image provided in the list. If there are 4 images, return 4 objects in the plans array.`],
    ["human", [
      { type: "text", text: `Analyze these ${state.user_images.length} reference images and extract their structural DNA extract all content based on . `}
    ]]
  ]);

  const chain = prompt.pipe(structuredLlm);
  const response = await chain.invoke({
    images: state.user_images.length > 0 ? state.user_images.join(", ") : ""
  });

  return { plan: response };
}

// async function extractionNode(state: typeof PostcardState.default) {
//   const llm = new ChatOpenAI({ 
//     modelName: "gpt-4o", // GPT-4o is required for vision analysis
//     temperature: 0,
//     apiKey: Deno.env.get("OPENAI_API_KEY") 
//   });
  
//   const structuredLlm = llm.withStructuredOutput(MultiPostcardExtraction);
  
//   // Construct the Vision Message payload
//   const imageMessages = state.user_images.map((url: string) => ({
//     type: "image_url",
//     image_url: { url: url, detail: "high" }
//   }));

//   const prompt = ChatPromptTemplate.fromMessages([
//     ["system", `You are a Senior Print Production Designer and Vision Analyst. 
//     Your task is to reverse-engineer marketing postcards into a structured schema.

//     CRITICAL ANALYSIS RULES:
//     1. SPATIAL MAPPING: Determine the X/Y coordinates of the Hero section, Image blocks, and Offer badges.
//     2. TYPOGRAPHY: Identify the hierarchy (Title vs Subtitle).
//     3. COLOR EXTRACTION: Identify the dominant brand colors from the pixels.
//     4. LAYOUT DNA: Note if the image is on the left, right, or serving as a background.
    
//     You must process EVERY image provided in the list. If there are 4 images, return 4 objects in the plans array.`],
//     ["human", [
//       { type: "text", text: `Analyze these ${state.user_images.length} reference images and extract their structural DNA. BRAND DATA: ${JSON.stringify(state.brand_data)}` },
//       ...imageMessages
//     ]]
//   ]);

//   const chain = prompt.pipe(structuredLlm);
//   const response = await chain.invoke({});

//   // Note: response.plans will contain the array of 4 extracted schemas
//   return { plan: response.plans }; 
// }

async function generateSinglePostcard(workerInput: any) {
  const llm = new ChatOpenAI({ 
    modelName: "gpt-4o-mini", 
    temperature: 0.4,
    apiKey: Deno.env.get("OPENAI_API_KEY") 
  });

  console.log("the extraction ----->", workerInput.plan)
  console.log("user_image------>", workerInput.user_images)
const postcardPrompt= `You are an AI PostGrid Canvas Export Engine.
You generate PRINT MARKETING POSTCARDS ONLY.

LAYOUT SELECTION RULE (MANDATORY)

You MUST select EXACTLY ONE layout JSON per generation.

Layout selection MUST be derived from variation_seed:
- Seed mod number_of_layouts
- Deterministic but different per seed

You MUST NOT reuse the same layout across different seeds
unless the seed resolves to the same index.

INPUT:
BRAND DATA: ${JSON.stringify(workerInput.brand_data)}
Sample post-card: ${workerInput?.user_images} (The provided post cards are only for layout reference. Not use this in actual output generation),
Extracted Data : ${JSON.stringify(workerInput.plans)}
You are an AI PostGrid Canvas Export Engine.

Your ONLY job is to generate PRINT-READY HTML postcards
that are compatible with the PostGrid editor.

You do NOT design layouts.
You do NOT invent structure.
You ONLY render HTML based on the provided layout data.

==================================================
VARIATION CONTROL (MANDATORY)
==================================================

You are generating MULTIPLE postcards using the SAME layout.

This generation has:
- variation_seed: "{{variation_seed}}"

You MUST use this seed to ensure the output is UNIQUE.

Based on the variation_seed, you MUST vary:
- headline wording
- supporting copy
- CTA phrasing
- badge text
- image choice or crop (from provided images)
- color emphasis from brand palette

STRICT RULES:
- Do NOT repeat identical headlines across seeds
- Do NOT repeat identical CTAs across seeds
- Do NOT repeat identical badge text across seeds
- Layout MUST remain unchanged

If output matches a previous seed → regenerate internally.

==================================================
ABSOLUTE SCOPE (NON-NEGOTIABLE)
==================================================

You generate:
- PHYSICAL PRINT MARKETING POSTCARDS ONLY

Any output that visually resembles:
- a website
- a SaaS hero section
- a digital banner
- a UI screen
- a split web layout

is INVALID and must be internally rejected and regenerated.

==================================================
CANVAS (LOCKED)
==================================================

Canvas size is FIXED:
- width: 600px
- height: 408px

Everything MUST use:
- position: absolute
- fixed pixel coordinates

STRICTLY FORBIDDEN:
- flexbox
- grid
- responsive units
- relative positioning
- viewport units

==================================================
INPUTS YOU WILL RECEIVE
==================================================

1️⃣ LAYOUT JSON (SOURCE OF TRUTH)
- Defines canvas size
- Defines regions with exact x, y, width, height
- Defines structural intent ONLY
- Layout must be followed EXACTLY

2️⃣ BRAND / BUSINESS DATA
- Brand name
- Slogan / description
- Colors
- Logos
- Backdrop images
- Address / website

==================================================
CRITICAL RULE: LAYOUT OVERRIDES EVERYTHING
==================================================

The layout JSON is FINAL.

You MUST:
- Create exactly one HTML element per layout region
- Position it using the exact coordinates provided
- NEVER resize or reposition regions
- NEVER merge or split regions
- NEVER add extra layout blocks

If a region exists in layout → render it  
If a region does NOT exist → do NOT invent it

==================================================
IMAGE RENDERING RULES
==================================================

Images MUST:
- Be rendered as <img> tags
- Use absolute positioning
- Fit fully inside their region
- Use object-fit: cover
- NEVER overlap text
- NEVER be used as a background for text

==================================================
TEXT RENDERING RULES
==================================================

Text MUST:
- Stay fully inside its assigned region
- Follow vertical stacking if region.flow = "vertical"
- Maintain minimum 12px internal spacing
- Be readable at 2–3 feet (print-safe font sizes)

You MAY:
- Choose font sizes and weights conservatively
- Apply brand colors to text and backgrounds

You MUST NOT:
- Change alignment rules
- Drift text outside region bounds

==================================================
CTA RULES (PRINT ONLY)
==================================================

DO NOT generate buttons.

CTAs must be:
- Plain text
- OR simple boxed text using background color

Rounded web-style buttons are FORBIDDEN.

==================================================
FOOTER STRIP (MANDATORY IF PRESENT)
==================================================

If layout contains "footer_strip":
- It MUST span the full width
- It MUST sit at the bottom
- It MUST contain brand + website and/or location


==================================================
OUTPUT FORMAT (STRICT)
==================================================

- Output ONLY raw HTML
- One or more complete HTML documents
- No markdown
- No explanations
- No comments except <!-- Template X -->
- No validation text

==================================================
FINAL SELF-CHECK (MANDATORY)
==================================================

Before returning HTML, you MUST confirm internally:

1. Does the HTML follow the layout JSON exactly?
2. Is every element absolutely positioned?
3. Is there ZERO overlap between text and images?
4. Does this look correct when PRINTED?
5. Does this avoid all web-UI patterns?

ONLY output HTML if ALL checks pass.
`

  const response = await llm.invoke(postcardPrompt);
  
  return { final_html_gallery: [response.content] };
}

// --- 4. DISPATCHER 
const dispatchWorkers = (state: any) => {
  return Array.from({ length: 2 }).map((_, i) => 
    new Send("generate_single_postcard", {
      index: i,
      brand_data: state.brand_data,
      plan: state.plan,
      user_images: state.user_images
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

    console.log("image url---->", initialState["user_images"])

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

