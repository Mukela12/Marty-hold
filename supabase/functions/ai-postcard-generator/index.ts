import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { StateGraph, START, END, Send } from "npm:@langchain/langgraph"
import { ChatOpenAI } from "npm:@langchain/openai"
import { ChatPromptTemplate } from "npm:@langchain/core/prompts"
import { z } from "npm:zod"

// =======================================================
// 1. SCHEMAS
// =======================================================



// shapes working
const PostcardPlanSchema = z.object({
  layout_id: z.string(),
  geometry: z.object({
    hero_box: z.string(),
    content_box: z.string(),
    badge_box: z.string(),
    footer_box: z.string()
  }),
  mappings: z.object({
    logo_position: z.string().describe("e.g. top: 20px; right: 20px;"),
    headline_css: z.string().describe("The exact font-size, weight, and color logic"),
    background_overlay: z.string().describe("The CSS linear-gradient or opacity layer"),
    accent_border_style: z.string()
  }),
  design_tokens: z.object({
    primary_color: z.string(),
    accent_color: z.string(),
    typography_vibe: z.enum(["serif-elegant", "sans-minimalist", "bold-grotesque"]),
    accent_shape: z.enum(["organic-curves", "geometric-rect", "minimal-float"]),
    overlay_opacity: z.string()
  }),
  marketing_intent: z.object({
    brand_placement: z.enum(["hero-center", "top-left-elegant", "floating-badge"]),
    badge_copy: z.string().describe("High-conversion hook like 'Limited Offer' or 'Premium Quality'"),
    shape_complexity: z.enum(["layered", "intersecting", "subtle-minimal"])
  }),
  visual_style: z.enum(["modern", "classic", "minimalist", "bold"]),
});



const MultiPostcardExtraction = z.object({
  plans: z.array(PostcardPlanSchema)
})

// =======================================================
// 2. STATE
// =======================================================

const PostcardState = {
  brand_data: { value: (x:any, y:any) => y ?? x, default: () => ({}) },
  user_images: { value: (x:any, y:any) => y ?? x, default: () => [] },
  plans: { value: (x:any, y:any) => y ?? x, default: () => [] },
  resolved_images: { value: (x:any, y:any) => y ?? x, default: () => [] },
  final_html_gallery: { value: (x:string[], y:string[]) => x.concat(y), default: () => [] }
}

// =======================================================
// 3. EXTRACTION NODE (UNCHANGED OUTPUT)
// =======================================================

async function extractionNode(state:any) {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0,
    apiKey: Deno.env.get("OPENAI_API_KEY")
  })

  const structured = llm.withStructuredOutput(MultiPostcardExtraction)

  const imageMessages = state.user_images.map((url:string) => ({
    type: "image_url",
    image_url: { url, detail: "high" }
  }))

  // const prompt = ChatPromptTemplate.fromMessages([
  //   ["system", `
  //     You are a SENIOR ART DIRECTOR. 
  //     Analyze the reference images not just for layout, but for "Premium Feel."
      
  //     CRITICAL DESIGN RULES:
  //     1. Geometry: Use 600x408.
  //     2. Color: Identify a luxury color palette (e.g., Deep Navy, Champagne, Charcoal, or Minimal White).
  //     3. Typography: Decide if the brand needs Elegant Serif (luxury/real estate) or Clean Sans-Serif (tech/modern).
  //     4. White Space: Ensure geometry allows for "breathable" margins (minimum 40px padding).
  //   `],
  //   ["human", [
  //     { type: "text", text: `Extract design DNA from these ${state.user_images.length} images.` },
  //     ...imageMessages
  //   ]]
  // ]);

  // Add this to your Extraction Prompt
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `
      You are a Reverse Design Engineer. Analyze the reference postcard image.
      
      TASK: Create a technical blueprint to replicate this EXACT layout.
      
      EXTRACT THE FOLLOWING:
      1. Image Area: Does the background image cover 100% or is it contained in a specific box?
      2. Logo: Coordinates (e.g., top: 20px; left: 20px) and sizing.
      3. Content Block: The exact positioning and background-color (including opacity/blur).
      4. Typography: Font weights and letter-spacing for the brand title.
      5. Decorative Elements: Extract vertical lines, accent bars, or specific bullet point styles.
      
      Return a plan that ensures the new data fits into these EXACT slots.
    `],
    ["human", [
      { type: "text", text: "Deconstruct these reference images for exact replication." },
      ...imageMessages
    ]]
  ]);
  const response = await prompt.pipe(structured).invoke({})
  return { plans: response.plans }
}

// =======================================================
// 4. IMAGE RESOLVER NODE (PEXELS — DYNAMIC)
// =======================================================

async function imageResolverNode(state: any) {
  const industry =state.brand_data?.category||
    state.brand_data?.industries?.eic?.[0]?.industry  ||
    "business"

  const query = encodeURIComponent(`${industry} professional`)
  const url =
    `https://api.unsplash.com/search/photos` +
    `?query=${query}` +
    `&orientation=landscape` +
    `&per_page=10` +
    `&content_filter=high`

  const res = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${Deno.env.get("UNSPLASH_ACCESS_KEY")}`,
      "Accept-Version": "v1"
    }
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Unsplash API failed: ${text}`)
  }

  const data = await res.json()

  if (!data.results || data.results.length === 0) {
    throw new Error("No Unsplash images found")
  }

  /**
   * Build PRINT-SAFE image URLs
   * Using `urls.raw` + crop params as per Unsplash docs
   */
  const images = data.results.map((photo: any) => {
    return (
      `${photo.urls.raw}` +
      `&auto=format` +
      `&fit=crop` +
      `&w=600` +
      `&h=408` +
      `&q=80`
    )
  })

  return {
    resolved_images: images
  }
}


// =======================================================
// 5. HELPERS
// =======================================================

function getPrimaryContact(data:any) {
  return data?.phone || data?.email || data?.domain || ""
}

function getPrimaryAddress(data:any) {
  const a = data?.address
  if (!a) return ""
  return [a.street, a.city, a.state_province, a.country].filter(Boolean).join(", ")
}

// =======================================================
// 6. POSTCARD RENDERER (OUTPUT PRESERVED)
// =======================================================

async function generateSinglePostcard(workerInput:any) {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0.7,
    apiKey: Deno.env.get("OPENAI_API_KEY")
  })

  const { plan, brand_data, index, resolved_image_url } = workerInput
  const address = getPrimaryAddress(brand_data);
  const contact = getPrimaryContact(brand_data)
  const brandLogo =brand_data.logos[0]?.url ? brand_data.logos[0]?.url : `Have First Letter of the Brand Title:${brand_data.title} As for Logo with unique style`

//v2 shapes effect perfect
// const designerPrompt = `
//     You are a LUXURY MARKETING DESIGNER. 
//     Create a 600x408 postcard that feels like a premium ad campaign.

//     DESIGN DIRECTIVE:
//     1. TYPOGRAPHY: 
//        - Use 'Montserrat' (700) for headlines with 2px letter-spacing for a "high-fashion" feel.
//        - Use 'Lora' (italic) for sub-brand elements to add "prestige."
//     2. SHAPES & DEPTH:
//        - Don't just place text in a box. Use a "Card-on-Image" effect. 
//        - Incorporate a ${plan.design_tokens.accent_shape} element. If "organic-curves", use 'border-radius: 50% 0 50% 0'.
//        - Use subtle 'box-shadow: 0 10px 30px rgba(0,0,0,0.1)' on the content box to create 3D depth.
//     3. COLOR STRATEGY:
//        - Use ${plan.design_tokens.primary_color} for the primary shape and ${plan.design_tokens.accent_color} for thin, elegant borders or bullet points.
//        - Use a semi-transparent 'backdrop-filter: blur(8px)' on the info card for a modern "Glassmorphism" look.
//     4. MARKETING LAYOUT:
//        - HEADLINE: Positioned in ${plan.geometry.hero_box} with high contrast.
//        - CONTACT: Place in ${plan.geometry.footer_box} with small, elegant icons or clean vertical dividers (|).
//        - BADGE: A floating gold or ${plan.design_tokens.accent_color} circle for "Offers" or "Logos".

//     ASSETS:
//     - Background Image: ${resolved_image_url}
//     - Brand: ${brand_data.title}
//     - Address: ${getPrimaryAddress(brand_data)}
//     - Contact: ${getPrimaryContact(brand_data)}

    // STRICT OUTPUT:
    // - ONE RAW HTML document.
    // - @import Google Fonts: 'Montserrat', 'Lora'.
    // - Use absolute positioning for the main layers.
    // - Ensure a 40px padding "Breathable Zone" around the edges.
    // - ONE complete HTML document
    // - RAW HTML ONLY
    // - NO markdown
    // - NO explanation
//   `
const fd=""
//moreshapes
// const designerPrompt = `
//     You are a SENIOR ART DIRECTOR for a high-end Luxury Advertising Agency.
//     Task: Render a 600x408 premium postcard with "High-Value" marketing aesthetics.

//     BRAND ASSETS:
//     - Name: ${brand_data.title} 10pt to 16pt , Highlight as much as
//     - Details: ${address} try to be bold
//     - Contact: ${contact} try to be bold
//     - Slogan: Generate a short, luxury tagline for ${brand_data?.industries?.eic?.[0]?.industry}.

//     DESIGN ARCHITECTURE (STRICT):
    
//     1. THE PREMIUM INFO CARD (The "Blurred" Area):
//        - Location: ${plan.geometry.content_box}.
//        - CSS COMPATIBILITY: Use 'background: rgba(255, 255, 255, 0.85);' as a fallback. 
//        - If the environment supports it, use 'backdrop-filter: blur(12px); background: rgba(255, 255, 255, 0.25);'.
//        - ADDITION: Add a 2px left-border using ${plan.design_tokens.accent_color} to create a "designer" look.
//        - CONTENT: Place Address, Contact, and Slogan with 'line-height: 1.6'.

//     2. BRAND IDENTITY (The Hook):
//        - Place "${brand_data.title}" in ${plan.geometry.hero_box} 10pt to 16pt , Highlight as much as.
//        - STYLE: Font-weight: 900; Uppercase; Letter-spacing: 6px; Color: ${plan.design_tokens.primary_color};
//        - EFFECT: Add 'text-shadow: 0px 4px 10px rgba(0,0,0,0.15)'.
//        - ACCENT: Position a 40px wide, 4px thick 'accent-bar' (${plan.design_tokens.accent_color}) directly under the Brand Name.

//     3. DYNAMIC GEOMETRY (${plan.design_tokens.accent_shape}):
//        - If "organic-curves": Use 'border-radius: 60px 0px 60px 0px' on the Info Card.
//        - If "geometric-rect": Use a sharp 'clip-path: polygon(0 0, 100% 0, 95% 100%, 5% 100%)' for the Info Card.
//        - If "minimal-float": Use 'box-shadow: 0 30px 60px -12px rgba(50,50,93,0.25)'.

//     4. THE "CALL-TO-ACTION" BADGE:
//        - Place "${plan.marketing_intent.badge_copy}" in ${plan.geometry.badge_box}.
//        - STYLE: Background: ${plan.design_tokens.accent_color}; Color: #FFF; Padding: 10px 20px; 
//        - SHAPE: Use a "Pill" shape (border-radius: 50px).
//        - EFFECT: 'transform: rotate(-5deg); font-weight: bold; text-transform: uppercase; font-size: 12px;'.

//     TECHNICAL CONSTRAINTS:
//     - 600x408px exactly.
//     - Absolute positioning only.
//     - Padding: 40px internal margins.
//     - Fonts: @import 'Montserrat:wght@400;900' and 'Lora:italic'.
//     - Image: ${resolved_image_url} (object-fit: cover; width: 100%; height: 100%; position: absolute; z-index: -1).

//     STRICT OUTPUT:
//     - RAW HTML ONLY.
//     - No Markdown. No explanation.
// `;


const designerPrompt = `
    You are a Technical Frontend Developer. Build a 600x408px print postcard.
    
    REFERENCE DNA TO REPLICATE:
    - Background: ${resolved_image_url} (Must cover the area defined in reference).
    - Content Card: ${plan.mappings.background_overlay}. Positioned at ${plan.geometry.content_box}.
    - Logo Slot: Position at ${plan.mappings.logo_position}. make use of as ${brandLogo}
    - Headline Style: ${plan.mappings.headline_css}.

    NEW BRAND DATA:
    - Title: ${brand_data.title}
    - Tagline: ${brand_data.slogan}
    - Address: ${address}
    - Contact: ${contact}
    - Primary Color: ${brand_data.colors[0].hex}

    CONSTRAINTS:
    - 600px width, 408px height precisely.
    - Use absolute positioning for every major element.
    - Match the "breathable space" and padding from the reference.
    - If the reference had a vertical line separator, include it using ${brand_data.colors[0].hex}.
    - Bullet points should be clean and use the brand's accent color.

    OUTPUT: RAW HTML/CSS ONLY. NO MARKDOWN.
  `;
const response = await llm.invoke(designerPrompt)
  return { final_html_gallery: [response.content] }
}

// =======================================================
// 7. DISPATCHER
// =======================================================

const dispatchWorkers = (state:any) => {
  const TOTAL = 10
  return Array.from({ length: TOTAL }).map((_, i) =>
    new Send("generate_single_postcard", {
      index: i,
      plan: state.plans[i % state.plans.length],
      brand_data: state.brand_data,
      resolved_image_url: state.resolved_images[i % state.resolved_images.length]
    })
  )
}

// =======================================================
// 8. LANGGRAPH
// =======================================================

const workflow = new StateGraph({ channels: PostcardState })
  .addNode("extractor", extractionNode)
  .addNode("image_resolver", imageResolverNode)
  .addNode("generate_single_postcard", generateSinglePostcard)
  .addEdge(START, "extractor")
  .addEdge("extractor", "image_resolver")
  .addConditionalEdges("image_resolver", dispatchWorkers)
  .addEdge("generate_single_postcard", END)

const appEngine = workflow.compile()

// =======================================================
// 9. SERVER
// =======================================================

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type"
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const payload = await req.json()

    const result = await appEngine.invoke({
      brand_data: payload.brand,
      user_images: payload.images || []
    })

    console.log("result--->", result)
    return new Response(
      JSON.stringify({
        status: "success",
        postcards: result.final_html_gallery
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (e:any) {
    console.log("errr--->", e)
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})