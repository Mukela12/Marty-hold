import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { StateGraph, START, END, Send } from "npm:@langchain/langgraph"
import { ChatOpenAI } from "npm:@langchain/openai"
import { ChatPromptTemplate } from "npm:@langchain/core/prompts"
import { z } from "npm:zod"

// =======================================================
// 1. SCHEMAS
// =======================================================



// shapes working
// const PostcardPlanSchema = z.object({
//   layout_id: z.string(),
//   geometry: z.object({
//     hero_box: z.string(),
//     content_box: z.string(),
//     badge_box: z.string(),
//     footer_box: z.string()
//   }),
//   mappings: z.object({
//     logo_position: z.string().describe("e.g. top: 20px; right: 20px;"),
//     headline_css: z.string().describe("The exact font-size, weight, and color logic"),
//     background_overlay: z.string().describe("The CSS linear-gradient or opacity layer"),
//     accent_border_style: z.string()
//   }),
//   design_tokens: z.object({
//     primary_color: z.string(),
//     accent_color: z.string(),
//     typography_vibe: z.enum(["serif-elegant", "sans-minimalist", "bold-grotesque"]),
//     accent_shape: z.enum(["organic-curves", "geometric-rect", "minimal-float"]),
//     overlay_opacity: z.string()
//   }),
//   marketing_intent: z.object({
//     brand_placement: z.enum(["hero-center", "top-left-elegant", "floating-badge"]),
//     badge_copy: z.string().describe("High-conversion hook like 'Limited Offer' or 'Premium Quality'"),
//     shape_complexity: z.enum(["layered", "intersecting", "subtle-minimal"])
//   }),
//   visual_style: z.enum(["modern", "classic", "minimalist", "bold"]),
// });
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
}

// =======================================================
// 3. EXTRACTION NODE (UNCHANGED OUTPUT)
// =======================================================

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

Your ONLY responsibility is to analyze POSTCARD IMAGES and convert what you SEE into
a STRICT, MACHINE-EXECUTABLE JSON object that matches PostcardPlanSchema EXACTLY.

You are NOT a designer.
You must NOT improve, simplify, rename, or creatively interpret anything.
You must ONLY extract visible structure, positioning, and styling.

────────────────────────────────────────
ABSOLUTE HARD RULES (NON-NEGOTIABLE)
────────────────────────────────────────
1. Output MUST conform EXACTLY to PostcardPlanSchema
2. Output MUST be valid JSON (no comments, no explanations)
3. ALL CSS must be COMPLETE, COPY-PASTEABLE, and FINAL
   - Include full property names
   - Include units (px, %, rem)
   - End every declaration with a semicolon
4. ALL layout positioning MUST use:
   "position: absolute;" with exact px values
5. NEVER estimate, round, assume, or normalize values
6. If something does NOT exist in the image:
   - Use "" for strings
   - Use false for booleans
   - Use [] for arrays
7. DO NOT hallucinate missing sections
8. DO NOT infer behavior (QR scan, click, navigation)
   → Only extract VISUAL STRUCTURE
9. ALL overlapping-capable 
elements MUST include explicit z-index values
   - Higher visual layers = higher z-index
   - Background elements MUST have lower z-index
   - No two sibling regions may share the same z-index
10. ALL child elements MUST be positioned relative to their IMMEDIATE visual container
    - Containers MUST include: position: relative;
    - Children MUST use position: absolute;

────────────────────────────────────────
CRITICAL LAYOUT FLOW RULE:
────────────────────────────────────────
Visual regions (header, hero, content, footer) MUST be vertically stacked.
Each region’s `top` value MUST be computed as:

top = previous_region.top + previous_region.height + extracted_spacing

────────────────────────────────────────
POSTCARD STRUCTURE YOU MUST DETECT
────────────────────────────────────────

You MUST decompose the postcard into the following VISUAL REGIONS
ONLY IF THEY ARE VISIBLY PRESENT:

1. HEADER REGION
   - Brand title
   - Supporting tagline / slogan
   - Optional decorative shapes or background graphics
   - Alignment (left / center / right)
   - Exact typography styles

2. HERO / IMAGE REGION
   - Main human or product image
   - Shape mask (rectangle, rounded, circle, arch)
   - Exact crop boundaries
   - Position relative to postcard edges

3. CENTRAL CONTENT CONTAINER
   - Pricing grid, offer cards, or benefit blocks
   - Each price treated as its OWN block
   - Extract:
     • container background
     • padding
     • borders / dividers
     • spacing between items
     • typography per price, label, description

4. QR CODE BLOCK (IF PRESENT)
   - Treat QR as a visual image only
   - Extract:
     • width / height
     • position
     • surrounding label text (if visible)
   - DO NOT infer scan destination

5. FOOTER REGION
   - Company name
   - Phone number
   - Website text
   - Footer background bar
   - Logo if present
   - Alignment and spacing

────────────────────────────────────────
MEASUREMENT PROTOCOL
────────────────────────────────────────
1. Postcard canvas size MUST be extracted first
   - Width × Height (example: 600px × 408px)
2. ALL child elements positioned relative to canvas
3. ALL spacing must be explicitly measured
   - padding
   - margin
   - gaps between elements
4. Vertical regions MUST NOT overlap:
   - bottom of previous region + spacing ≤ top of next region
   - spacing MUST be explicitly extracted as px
────────────────────────────────────────
TYPOGRAPHY EXTRACTION RULES
────────────────────────────────────────
Extract SEPARATE CSS blocks for:
- Brand / Headline text
- Subheading / Slogan text
- Pricing numbers
- Pricing labels
- Body / footer text

Each block MUST include:
- font-family
- font-size
- font-weight
- line-height
- letter-spacing
- text-transform (if any)
- color

────────────────────────────────────────
COLOR & BACKGROUND RULES
────────────────────────────────────────
- Extract exact hex or rgba colors ONLY
- Extract gradients ONLY if visible
- If background includes shapes or patterns:
  → Extract them as background CSS, not descriptions

────────────────────────────────────────
OUTPUT REQUIREMENTS
────────────────────────────────────────
- Return ONE JSON object
- Matches PostcardPlanSchema EXACTLY
- ALL schema fields must exist
- Empty or missing elements must be explicitly empty

FINAL CHECK BEFORE OUTPUT:
✓ No prose
✓ No markdown
✓ No explanations
✓ No assumptions
✓ JSON ONLY
  `],
  ["human", [
    { type: "text", text: "Extract the layout specifications from these reference postcard images:" },
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
    modelName: "gpt-5.2",
    temperature: 0.7,
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
You are an HTML/CSS Compiler. Generate a 600×408px print postcard matching the extracted layout specification.

INPUT DATA:
- Layout Spec: ${JSON.stringify(plan, null, 2)}
- Background Image: ${resolved_image_url}
- Brand Title: ${brand_data.title}
- Tagline: ${brand_data.slogan}
- Address: ${address}
- Contact: ${contact}
- Logo: ${brandLogo}
- Brand Primary Color: ${brand_data.colors[0].hex}

STRICT OUTPUT RULES:
1. Return ONLY raw HTML (no markdown, no backticks, no explanations)
2. Single HTML file with embedded <style> tag
3. NO JavaScript
4. NO external libraries (Bootstrap, Tailwind, etc.)
5. NO CSS variables
6. NO comments in code

HTML STRUCTURE REQUIREMENTS:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    .postcard {
      width: ${plan.dimensions.width};
      height: ${plan.dimensions.height};
      position: relative;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }
    
    .background-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
      position: absolute;
      top: 0;
      left: 0;
    }
    
    .overlay {
      ${plan.background.overlay_gradient}
      ${plan.background.overlay_color ? 'background: ' + plan.background.overlay_color + ';' : ''}
      width: 100%;
      height: 100%;
      position: absolute;
      top: 0;
      left: 0;
    }
    
    .logo {
      ${plan.logo.position_css}
      width: ${plan.logo.width};
      height: ${plan.logo.height};
      z-index: 10;
    }
    
    .content-box {
      ${plan.content_box.position_css}
      ${plan.content_box.dimensions_css}
      ${plan.content_box.background_css}
      ${plan.content_box.border_css}
      z-index: 5;
      text-align: ${plan.content_box.alignment};
    }
    
    .brand-title {
      ${plan.typography.brand_title.css}
      text-align: ${plan.typography.brand_title.alignment};
    }
    
    .tagline {
      ${plan.typography.tagline.css}
      text-align: ${plan.typography.tagline.alignment};
      margin-top: ${plan.spacing.section_gaps};
    }
    
    .divider {
      ${plan.decorative_elements.divider_line.css}
      display: ${plan.decorative_elements.divider_line.exists ? 'block' : 'none'};
    }
    
    .body-text {
      ${plan.typography.body_text.css}
      text-align: ${plan.typography.body_text.alignment};
      margin-top: ${plan.spacing.section_gaps};
    }
  </style>
</head>
<body>
  <div class="postcard">
    <img src="${resolved_image_url}" alt="Background" class="background-image">
    <div class="overlay"></div>
    
    ${brandLogo ? `<img src="${brandLogo}" alt="Logo" class="logo">` : ''}
    
    <div class="content-box">
      <h1 class="brand-title">${brand_data.title}</h1>
      <div class="divider"></div>
      <p class="tagline">${brand_data.slogan}</p>
      <div class="body-text">
        <p>${address}</p>
        <p>${contact}</p>
      </div>
    </div>
  </div>
</body>
</html>
\`\`\`

CRITICAL: Replace ${plan.xxx} placeholders with ACTUAL CSS from the layout spec.
Output ONLY the final HTML with no additional text.
`;
const response = await llm.invoke(designerPrompt)
  return { final_html_gallery: [response.content] }
}

// =======================================================
// 7. DISPATCHER
// =======================================================

const dispatchWorkers = (state:any) => {
  const TOTAL = 1
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