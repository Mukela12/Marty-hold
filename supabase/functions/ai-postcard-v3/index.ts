// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { StateGraph, START, END, Send } from "npm:@langchain/langgraph@0.2.20" 
import { ChatOpenAI } from "npm:@langchain/openai@0.3.0"
import { ChatPromptTemplate } from "npm:@langchain/core/prompts"
import { z } from "npm:zod@3.23.8"

const PostcardPlanSchema = z.object({
  layout_id: z.string(),
  
  dimensions: z.object({
    width: z.string().describe("e.g., 600px"),
    height: z.string().describe("e.g., 408px"),
  }),
  
  background: z.object({
    image_coverage: z.enum(["full-bleed", "contained-with-margins"]),
    overlay_gradient: z.string().describe("e.g., linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.6))"),
    overlay_color: z.string().describe("e.g., rgba(0,0,0,0.3)"),
  }),
  
  logo: z.object({
    position_css: z.string().describe("Complete CSS: position: absolute; top: 20px; left: 30px;"),
    width: z.string().describe("e.g., 80px or 15%"),
    height: z.string().describe("e.g., 80px or auto"),
  }),
  
  content_box: z.object({
    position_css: z.string().describe("Complete CSS positioning"),
    dimensions_css: z.string().describe("width, height, padding"),
    background_css: z.string().describe("background: rgba(255,255,255,0.95); backdrop-filter: blur(10px);"),
    border_css: z.string().describe("border-radius, border, box-shadow"),
    alignment: z.enum(["left", "center", "right"]),
  }),
  
  typography: z.object({
    brand_title: z.object({
      css: z.string().describe("Complete CSS: font-family: 'Playfair Display'; font-size: 32px; font-weight: 700; letter-spacing: -0.5px; line-height: 1.2; color: #1a1a1a;"),
      alignment: z.enum(["left", "center", "right"]),
    }),
    tagline: z.object({
      css: z.string().describe("Complete CSS for tagline/slogan"),
      alignment: z.enum(["left", "center", "right"]),
    }),
    body_text: z.object({
      css: z.string().describe("Complete CSS for address/contact text"),
      alignment: z.enum(["left", "center", "right"]),
    }),
  }),
  
  decorative_elements: z.object({
    divider_line: z.object({
      exists: z.boolean(),
      css: z.string().describe("width: 60px; height: 3px; background: #d4af37; margin: 16px auto;"),
    }),
    accent_bar: z.object({
      exists: z.boolean(),
      css: z.string().describe("Complete CSS if exists"),
    }),
    bullet_style: z.string().describe("CSS for list items if present"),
  }),
  
  spacing: z.object({
    section_gaps: z.string().describe("e.g., 24px between sections"),
    internal_padding: z.string().describe("e.g., 32px padding inside content box"),
  }),
  
  color_palette: z.object({
    primary: z.string().describe("Hex code"),
    secondary: z.string().describe("Hex code"),
    text_primary: z.string().describe("Hex code"),
    text_secondary: z.string().describe("Hex code"),
  }),
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
};

async function extractionNode(state:any) {
  const llm = new ChatOpenAI({
    modelName: "gpt-5.2",
    temperature: 0,
    apiKey: Deno.env.get("OPENAI_API_KEY")
  })

  const structured = llm.withStructuredOutput(MultiPostcardExtraction)

  const imageMessages = state.user_images.map((url:string) => ({
    type: "image_url",
    image_url: { url, detail: "high" }
  }))
 

  // Add this to your Extraction Prompt
//   const prompt = ChatPromptTemplate.fromMessages([
//     ["system", `
//       You are a Reverse Design Engineer specializing in layout deconstruction.

// OBJECTIVE: Analyze the provided postcard image and create a precise technical specification to replicate its EXACT visual structure.

// SYSTEMATIC EXTRACTION CHECKLIST:

// 1. BACKGROUND IMAGE TREATMENT
//    - Coverage: Full-bleed (100%) or contained within margins?
//    - Positioning: How is the image anchored (cover, contain, specific dimensions)?
//    - Overlay effects: Any color tints, gradients, or darkening overlays?

// 2. LOGO SPECIFICATIONS
//    - Absolute position: Precise coordinates (top, left, right, bottom)
//    - Dimensions: Width × Height in pixels or percentage
//    - Spacing: Margin/padding around the logo
//    - Z-index: Layering relative to other elements

// 3. CONTENT CONTAINER
//    - Position: Exact placement (coordinates or alignment)
//    - Dimensions: Width, height, padding values
//    - Background: Color (with hex/rgba), opacity percentage
//    - Effects: Blur (backdrop-filter), shadows, borders
//    - Alignment: How content is positioned within the container

// 4. TYPOGRAPHY HIERARCHY
//    - Brand/Title: Font family, weight (100-900), size, letter-spacing, line-height
//    - Headings: Same specifications as above
//    - Body text: Font specs, color, opacity
//    - Text alignment: Left, center, right, justify

// 5. DECORATIVE & STRUCTURAL ELEMENTS
//    - Divider lines: Thickness, color, length, position
//    - Accent bars: Width, height, color, placement
//    - Bullet points: Custom styling, spacing, alignment
//    - Icons or symbols: Size, color, positioning
//    - Border treatments: Radius, thickness, style

// 6. SPACING & RHYTHM
//    - Gaps between sections (vertical spacing)
//    - Horizontal margins and gutters
//    - Consistent spacing patterns (e.g., 16px, 24px, 32px increments)

// 7. COLOR PALETTE
//    - Extract all hex/rgba values used
//    - Note opacity levels for overlays

// OUTPUT FORMAT:
// Provide a structured blueprint with:
// - CSS-style specifications where applicable
// - Measurement units (px, %, rem, etc.)
// - Positioning methods (absolute, relative, flexbox, grid)
// - A mapping guide showing where dynamic data should populate

// GOAL: Enable pixel-perfect replication where new content slots seamlessly into the established design system.
//     `],
//     ["human", [
//       { type: "text", text: "Deconstruct these reference images for exact replication." },
//       ...imageMessages
//     ]]
//   ]);
const prompt = ChatPromptTemplate.fromMessages([
  ["system", `
You are a CSS Layout Extraction Engine.

Your ONLY responsibility is to analyze postcard IMAGES and output
machine-executable layout specifications that EXACTLY match the PostcardPlanSchema.

You are NOT a designer.
You must NOT invent, improve, stylize, or creatively interpret anything.

────────────────────────────────────
GLOBAL HARD RULES (NON-NEGOTIABLE)
────────────────────────────────────
1. Output MUST strictly match the PostcardPlanSchema
2. All CSS must be COMPLETE and COPY-PASTEABLE
   (full property names, units, semicolons)
3. You MUST NOT hallucinate or invent values
4. If a value truly does not exist, output an empty string ""
5. ALL positioning MUST be:
   - position: absolute;
   - px values ONLY (NO %, NO rem, NO transforms)
6. The postcard canvas MUST be treated as EXACTLY:
   width: 600px
   height: 408px

────────────────────────────────────
CANONICAL MEASUREMENT RULE (CRITICAL)
────────────────────────────────────
- Assume the input image has already been normalized to 600px × 408px
- ALL measurements MUST be snapped to the nearest canonical grid value:
  [4px, 8px, 12px, 16px, 24px, 32px, 40px, 48px, 64px]
- Do NOT output arbitrary pixel values
- This snapping is NOT guessing — it is normalization

────────────────────────────────────
EXISTENCE-FIRST DECISION RULE
────────────────────────────────────
For EACH section:
- logo
- content_box
- typography
- decorative_elements
- spacing
- color_palette

You MUST first decide:
EXISTS or DOES NOT EXIST.

If EXISTS:
- You MUST populate ALL related fields
- Use canonical grid measurements
- Use dominant visible styles

If DOES NOT EXIST:
- Leave related fields as empty strings
- Set exists: false where applicable

Empty output is ONLY allowed when the element truly does not exist.

────────────────────────────────────
VISUAL VERIFICATION DEFINITION
────────────────────────────────────
A value is considered visually verifiable if:
- It is clearly readable at normal viewing distance, OR
- It is a dominant visual feature repeated consistently, OR
- It follows common print layout conventions
  (e.g., centered card, consistent margins, clear hierarchy)

────────────────────────────────────
TYPOGRAPHY EXTRACTION RULES
────────────────────────────────────
- You MUST extract typography if text is visible
- You MUST extract:
  - font-size
  - font-weight
  - line-height
  - color
  - text-align
- If font-family is NOT visually identifiable:
  - Use a neutral fallback: font-family: sans-serif;
- Do NOT guess specific font names unless clearly recognizable

────────────────────────────────────
EXTRACTION PROTOCOL (FOR EACH IMAGE)
────────────────────────────────────

1. DIMENSIONS
- width MUST be "600px"
- height MUST be "408px"

2. BACKGROUND
- image_coverage: full-bleed OR contained-with-margins
- overlay_gradient: linear-gradient(...) OR ""
- overlay_color: rgba(...) OR ""

3. LOGO
If visible:
- position_css (absolute + px)
- width (canonical px)
- height (canonical px or "auto")

4. CONTENT BOX
A content box EXISTS if:
- Text is visually grouped with padding, OR
- A contrast panel improves readability, OR
- A clear container separates text from background

If exists:
- Extract absolute position (px only)
- Extract dimensions / padding using canonical grid
- Extract background and border styles if visible
- alignment: left | center | right

5. TYPOGRAPHY
Extract 3 CSS blocks:
- brand_title
- tagline
- body_text

Each CSS block MUST be complete.

6. DECORATIVE ELEMENTS
- divider lines
- accent bars
- shapes
- clip-path if present
Extract full CSS if they exist.

7. SPACING
- section_gaps (canonical px)
- internal_padding (canonical px)

8. COLOR PALETTE
Extract dominant colors:
- primary
- secondary
- text_primary
- text_secondary

────────────────────────────────────
OUTPUT RULES
────────────────────────────────────
- Return ONLY valid JSON matching PostcardPlanSchema
- ALL required fields must be present
- Use empty strings only when elements truly do not exist
- No explanations, no comments, no markdown
- No creative interpretation

────────────────────────────────────
FINAL SELF-CHECK BEFORE OUTPUT
────────────────────────────────────
✓ Canvas is exactly 600px × 408px
✓ Only px units are used
✓ Canonical grid values only
✓ No partial CSS declarations
✓ No guessed fonts
✓ No missing required fields
    `],
  ["human", [
    { type: "text", text: `
    Extract AT LEAST 5 DISTINCT postcard layout specifications from the provided reference images.
    RULES:
    - You MUST return a minimum of 5 plans.
    - Each plan must be structurally different:
      - different content_box position OR
      - different logo position OR
      - different alignment strategy
    - Do NOT duplicate layouts.
    - All plans must comply with PostcardPlanSchema.
      ` },
    ...imageMessages
  ]]
]);
  const response = await prompt.pipe(structured).invoke({})
  console.log(response);
  
  return { plans: response.plans }
};

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
};

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
    modelName: "gpt-5.2",
    temperature: 0.5,
    apiKey: Deno.env.get("OPENAI_API_KEY")
  })

  const { plan, brand_data, index, resolved_image_url } = workerInput
  const address = getPrimaryAddress(brand_data);
  const contact = getPrimaryContact(brand_data)
  const brandLogo =brand_data.logos[0]?.url ? brand_data.logos[0]?.url : `Have First Letter of the Brand Title:${brand_data.title} As for Logo with unique style`
 
const fd=""
 


// const designerPrompt = `
//     You are a Technical Frontend Developer AND a pixel-perfect UI layout compiler.

// Your task is to generate a PHYSICAL PRINT POSTCARD layout using HTML and CSS that visually matches the provided reference design with exact accuracy.

// CORE OBJECTIVE:
// - Build a 600x408px print postcard that matches the reference design at 100% zoom.
// - Output must be visually indistinguishable from the reference when overlaid.

// REFERENCE DNA TO REPLICATE (HARD CONTRACT):
// - Background Image: ${resolved_image_url}
//   - Must cover the exact area as shown in the reference.
//   - No cropping distortion or aspect ratio changes.
// - Content Card:
//   - Background: ${plan.mappings.background_overlay}
//   - Position & size: ${plan.geometry.content_box}
// - Logo Slot:
//   - Position: ${plan.mappings.logo_position}
//   - Asset: ${brandLogo}
// - Headline Style:
//   - Apply EXACT styles from ${plan.mappings.headline_css}

// NEW BRAND DATA (CONTENT ONLY — DO NOT ALTER STRUCTURE):
// - Title: ${brand_data.title}
// - Tagline: ${brand_data.slogan}
// - Address: ${address}
// - Contact: ${contact}
// - Primary Color: ${brand_data.colors[0].hex}

// NON-NEGOTIABLE CONSTRAINTS:
// - This is a PRINT postcard, not a website or digital banner.
// - Match spacing, padding, margins, alignment, and breathable space EXACTLY as seen in the reference.
// - If the reference contains a vertical line separator, include it using ${brand_data.colors[0].hex}.
// - Bullet points (if present) must be clean, minimal, and use the brand’s primary color.

// STRICT VISUAL RULES (FAIL IF VIOLATED):
// 1. Do NOT simplify, optimize, refactor, or “improve” the design.
// 2. Do NOT add, remove, or rearrange any visual element.
// 3. Do NOT guess content or design decisions — infer ONLY from the reference.
// 4. Do NOT substitute assets — if an image exists, preserve its exact dimensions.
// 5. Do NOT use external libraries or frameworks (Bootstrap, Tailwind, etc.).
// 6. Do NOT include JavaScript.
// 7. Do NOT introduce creative interpretation.
// 8. Avoid fractional pixels unless they are clearly implied by the reference.

// STYLING RULES:
// - Fonts must match exactly (family, size, weight, line-height, letter-spacing).
// - Colors must be exact (hex / rgba).
// - Shadows must match offset, blur, spread, and opacity precisely.
// - Border radius must match exactly.
// - Do NOT use CSS variables unless already implied by the reference.

// LAYOUT IMPLEMENTATION:
// - Prefer absolute positioning to preserve spatial accuracy.
// - Flexbox or Grid may ONLY be used if it results in identical pixel output.
// - Ensure no visual drift at 100% browser zoom.

// OUTPUT FORMAT (MANDATORY):
// - Return RAW HTML and CSS ONLY.
// - Single HTML file.
// - CSS must be embedded inside a <style> tag.
// - No comments, no explanations, no markdown, no extra text.

// MENTAL VALIDATION BEFORE OUTPUT:
// - Overlay test aligns perfectly.
// - No spacing, sizing, or alignment deviations.
// - Matches reference exactly at 100% zoom.

// You must behave like an automated design-to-code compiler, not a creative assistant.
// Failure to meet any rule results in INVALID output.

//   `;
const designerPrompt = `
You are a STRICT HTML/CSS PRINT POSTCARD COMPILER.

You do NOT design.
You do NOT improvise.
You do NOT beautify.

You ONLY fill a fixed postcard template using the provided layout spec.

────────────────────────────────
ABSOLUTE CANVAS RULES
────────────────────────────────
- Canvas size MUST be exactly 600px × 408px
- This is a PRINT POSTCARD, not a website
- ZERO overlapping text
- No responsive behavior

────────────────────────────────
SOURCE OF TRUTH (AUTHORITATIVE)
────────────────────────────────
Layout Spec:
${JSON.stringify(plan, null, 2)}

Background Image:
${resolved_image_url}

Brand Content:
- Title: ${brand_data.title}
- Tagline: ${brand_data.slogan}
- Address: ${address}
- Contact: ${contact}

Logo (optional):
${brandLogo}

────────────────────────────────
TYPOGRAPHY SAFETY LIMITS
────────────────────────────────
- brand_title font-size: 26px – 42px ONLY
- tagline font-size: 14px – 22px ONLY
- body text MUST be smaller than tagline
- Headline must visually dominate

────────────────────────────────
CONTENT PANEL RULE (CRITICAL)
────────────────────────────────
- Text MUST live inside a visible content panel
- Panel MUST have background OR strong contrast
- Panel padding MUST be ≥ 24px
- Panel MUST be anchored to at least one edge

────────────────────────────────
ALIGNMENT MAPPING (MANDATORY)
────────────────────────────────
left   → align-items: flex-start; text-align: left
center → align-items: center;     text-align: center
right  → align-items: flex-end;   text-align: right

────────────────────────────────
MANDATORY HTML STRUCTURE (DO NOT CHANGE)
────────────────────────────────
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#fff}

.postcard{
  width:600px;
  height:408px;
  position:relative;
  overflow:hidden;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}

.background{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit:cover;
  z-index:0;
}

.overlay{
  position:absolute;
  inset:0;
  z-index:1;
}

.logo{
  position:absolute;
  z-index:5;
}

.content{
  position:absolute;
  z-index:4;
  display:flex;
  flex-direction:column;
  justify-content:center;
}

.title{}
.divider{}
.tagline{}
.body{}
</style>
</head>
<body>
<div class="postcard">
  <img class="background" src="${resolved_image_url}">
  <div class="overlay"></div>

  ${brandLogo ? `<img class="logo" src="${brandLogo}">` : ""}

  <div class="content">
    <h1 class="title">${brand_data.title}</h1>
    <div class="divider"></div>
    <p class="tagline">${brand_data.slogan}</p>
    <div class="body">
      <p>${address}</p>
      <p>${contact}</p>
    </div>
  </div>
</div>
</body>
</html>

────────────────────────────────
STYLE INJECTION RULES
────────────────────────────────
- Inject ALL CSS from the layout spec
- Replace EVERY class with resolved CSS
- Use ONLY values from the layout spec
- No placeholders
- No comments

────────────────────────────────
FINAL COMMAND
────────────────────────────────
Return ONLY the final resolved HTML.
Any deviation = FAILURE.
`;

const response = await llm.invoke(designerPrompt)
  return { final_html_gallery: [response.content] }
}

// =======================================================
// 7. DISPATCHER
// =======================================================

const dispatchWorkers = (state:any) => {
  const TOTAL = 5
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

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/ai-postcard-v3' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
