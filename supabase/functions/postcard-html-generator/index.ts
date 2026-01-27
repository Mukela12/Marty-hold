import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { StateGraph, START, END } from "npm:@langchain/langgraph"
import { ChatOpenAI } from "npm:@langchain/openai"
import { ChatPromptTemplate } from "npm:@langchain/core/prompts"
// Cors 
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
}
// State
const PostcardState = {
  reference_images: { value: (_: any, y: any) => y, default: () => [] },
  brand_data: { value: (_: any, y: any) => y, default: () => ({}) },
  layout_html: { value: (_: any, y: any) => y, default: () => "" },
  unsplash_images: { value: (_: any, y: any) => y, default: () => [] },
  final_html: { value: (_: any, y: any) => y, default: () => "" }
};
// NODE 1 — Extract Html Template
async function extractLayoutNode(state: any) {
  try {
    const llm = new ChatOpenAI({
      modelName: "gpt-5-mini",
      apiKey: Deno.env.get("OPENAI_API_KEY")
    })
    const imageMessages = []
    for (const url of state.reference_images) {
      const base64 = await imageUrlToBase64(url)
      imageMessages.push({
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${base64}`
        }
      })
    };
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `
You are a Pixel-Perfect UI Reconstruction Coding Agent. Your ONLY task is to convert the provided postcard/banner image into a SINGLE self-contained HTML file that visually matches the image as closely as possible.
ABSOLUTE OUTPUT RULES (NON-NEGOTIABLE)
1) Output ONLY a complete valid HTML document.
2) Do NOT use markdown.
3) Do NOT include explanations, notes, reasoning, comments, or extra text.
4) Start with: <!DOCTYPE html>
5) End with: </html>
6) The result MUST be pixel-perfect (layout, spacing, alignment, sizes, typography, colors, gradients, shadows, borders, rotations, layering).
PRIMARY GOAL
Pixel-perfect UI reproduction is the only priority. Code cleanliness, reusability, and best practices do NOT matter unless they improve visual accuracy.
BRAND DATA PLACEHOLDER RULES (STRICT)
- The following MUST ALWAYS be placeholders and MUST NOT contain real or inferred text:
  - Company / Brand Name → {{BRAND_NAME}}
  - Phone / Mobile Number → {{PHONE}}
  - Website / Domain → {{WEBSITE}}
  - Address / Location → {{ADDRESS}}
  - Logo Image → {{LOGO_IMAGE}}
- These placeholders MUST appear wherever the image visually shows this information.
- Do NOT invent, stylize, abbreviate, or reword these values.
MARKETING CONTENT PRESERVATION (CRITICAL)
- All marketing, promotional, and creative text visible in the image (such as slogans, taglines, headlines, offers, benefits, CTA text) MUST be reproduced EXACTLY as seen.
- Do NOT convert marketing text into placeholders.
- Do NOT rewrite, improve, localize, shorten, or creatively alter any marketing copy.
- If the image shows fixed marketing text, it MUST remain fixed and identical in the output.
PLACEHOLDER SUBSTITUTION (MINIMAL & STRICT)
- If the image contains:
  - Company / Brand name → replace ONLY the text with {{BRAND_NAME}}
  - Phone / Mobile number → replace ONLY the text with {{PHONE}}
  - Website / URL → replace ONLY the text with {{WEBSITE}}
  - Logo image → use <img src="{{LOGO_IMAGE}}">
- Preserve font, size, color, spacing, alignment exactly as in the image.
- Do NOT replace or alter any other text.
- All slogans, offers, headings, taglines, and marketing copy MUST remain exactly as shown in the image.
CANVAS + RESPONSIVE SCALING (MANDATORY)
- Use a fixed design canvas that matches the image aspect ratio:
  Example:
  --canvas-w: 1503px;
  --canvas-h: 1021px;
- Wrap the design like this:
  <div id="stage">
    <div id="postcard"> ... </div>
  </div>
- The page background must be neutral:
  background: #f2f4f7;
- Center the postcard and scale it responsively WITHOUT changing internal pixel layout:
  1) #stage uses:
     width: min(96vw, var(--canvas-w));
     aspect-ratio: var(--canvas-w) / var(--canvas-h);
     position: relative;
  2) #postcard uses fixed size (var(--canvas-w), var(--canvas-h)) and is scaled with transform:
     transform: scale(calc(min(96vw, var(--canvas-w)) / var(--canvas-w)));
     transform-origin: top left;
INLINE CSS REQUIREMENT (STRICT)
- Use INLINE CSS on EVERY element for layout + styling.
- Do NOT use classes for styling.
- Use IDs only for element targeting/debugging (optional), but styling must still be inline.
- Only allowed <style> usage:
  - Base reset rules for html/body
  - #stage and #postcard scaling logic
  - Optional: a universal img rule (object-fit: cover)
- Everything else MUST be inline style attributes.
IMAGE HANDLING (MANDATORY)
- Use <img> tags for all images (logos, photos, icons, backgrounds).
- Use placeholder sources:
  https://via.placeholder.com/WxH?text=IMAGE
- Preserve aspect ratio and cropping:
  - For photo areas use:
    object-fit: cover;
    object-position: center;
- If the image has tilt/rotation:
  - Apply CSS transform: rotate(...) on the image container.
TEXT RULES (CRITICAL: NO CROPPING)
Text must NEVER be clipped, hidden, or cut off.
To guarantee this:
1) Always set explicit line-height for headings and large text.
2) Never place important text inside an overflow:hidden container.
3) Add padding-bottom for script/large typography if needed.
4) Increase section heights if text approaches boundaries.
5) Use z-index carefully so text is above shapes and photos.
TYPOGRAPHY RULES
- Use only web-safe fonts.
- Sans text:
  font-family: Arial, Helvetica, sans-serif;
- Script text approximation:
  font-family: "Brush Script MT","Segoe Script","Comic Sans MS",cursive;
SPECIAL VISUAL EFFECTS (WHEN PRESENT)
- Gradient text:
  Use inline styles:
  background: linear-gradient(...);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
- Dotted separators:
  Use inline border-right: dotted ...;
- Thick banner strips:
  Use solid background blocks with exact height and centered text using flex.
- Rounded CTA pills/bars:
  Use border-radius: 999px and gradient backgrounds.
STRUCTURE RECONSTRUCTION RULES
- Rebuild the postcard using nested divs with precise pixel dimensions.
- Use flex/grid where it improves accuracy; use absolute positioning for overlap.
- Match the exact spacing and placement of:
  - logos
  - headings
  - subheadings
  - photos
  - offer columns
  - separators
  - footer CTA blocks
- Preserve visual hierarchy.
QUALITY CHECK BEFORE OUTPUT (MANDATORY)
Before responding, verify:
- Pixel-perfect alignment relative to the image.
- No text clipping anywhere.
- Correct layering (z-index).
- Correct gradients, shadows, borders, and rounded corners.
- Correct canvas aspect ratio and responsive scaling.
- Output is ONLY the HTML file and nothing else.
`],
      ["human", [
        { type: "text", text: "Generate postcard HTML template from this image:" },
        ...imageMessages
      ]]
    ]);
    const res = await prompt.pipe(llm).invoke({})
    console.log(res.response_metadata);
    return { layout_html: res.content }
  } catch (error: any) {
    console.log(error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  };
};
async function imageUrlToBase64(url: string) {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch image")
  const buffer = await res.arrayBuffer()
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  };
  return btoa(binary);
};
// NODE 2 — Get UnSplash Images
async function unsplashNode(state: any) {
  try {
    const category =
      state.brand_data?.category ||
      state.brand_data?.industries?.eic?.[0]?.industry ||
      "business"
    const query = encodeURIComponent(`${category} professional`)
    const url =
      `https://api.unsplash.com/search/photos?query=${query}` +
      `&orientation=landscape&per_page=6&content_filter=high`
    const res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${Deno.env.get("UNSPLASH_ACCESS_KEY")}`,
        "Accept-Version": "v1"
      }
    })
    if (!res.ok) throw new Error("Unsplash API failed")
    const data = await res.json()
    const images = (data.results || []).map((p: any) =>
      `${p.urls.raw}&auto=format&fit=crop&w=600&h=408&q=80`
    )
    return { unsplash_images: images }
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    );
  };
};
// NODE 3 — Replace Placeholder
async function replacePlaceholdersNode(state: any) {
  try {
    console.log("----------------------------------------");
    console.log(state.unsplash_images);
    console.log(state.unsplash_images);
    console.log(state?.brand_data);
    console.log("----------------------------------------");

    console.log(state.layout_html);

    const llm = new ChatOpenAI({
      modelName: "gpt-5-mini",
      apiKey: Deno.env.get("OPENAI_API_KEY")
    })
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `
You are an HTML TEMPLATE FINALIZER.
INPUTS:
• HTML with arbitrary placeholders
• Brand data JSON (authoritative)
• Image URLs array
TASK:
• Replace EVERY placeholder with the most appropriate real value
• Decide meaning of each placeholder from context
• Map text placeholders to brand fields
• Map image placeholders to Unsplash images
• Logos must use brand logos if present
STRICT RULES:
• Output RAW HTML ONLY
• Do NOT explain anything
• Do NOT add comments
• Do NOT leave unresolved placeholders
• Do NOT change layout or structure
• Do NOT add JavaScript
• CSS must remain untouched
  `],
      ["human", `
HTML TEMPLATE:
{html}
BRAND DATA (JSON):
{brand_data}
UNSPLASH IMAGES:
{unsplash_images}
  `],
    ]);
    const res = await prompt.pipe(llm).invoke({
      html: state.layout_html,
      brand_data: JSON.stringify(state.brand_data, null, 2),
      unsplash_images: JSON.stringify(state.unsplash_images, null, 2),
    });
    console.log(">>>");
    console.log(res.response_metadata);
    console.log(res.content);
    return { final_html: res.content }
  } catch (error: any) {
    console.log(error);

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders }
    )
  }
}
// LangGraph Flow
const workflow = new StateGraph({ channels: PostcardState })
  .addNode("extract_layout", extractLayoutNode)
  .addNode("resolve_images", unsplashNode)
  .addNode("replace_placeholders", replacePlaceholdersNode)
  .addEdge(START, "extract_layout")
  .addEdge("extract_layout", "resolve_images")
  .addEdge("resolve_images", "replace_placeholders")
  .addEdge("replace_placeholders", END)
const app = workflow.compile()
// SERVER
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  };
  try {
    const payload = await req.json();
    const outputs = await Promise.all(
      (payload.images || []).map(async (image: any) => {
        const result = await app.invoke({
          reference_images: [image],
          brand_data: payload.brand
        });

        return {
          source_image: image,
          html: result.final_html
        };
      })
    );

    return new Response(
      JSON.stringify({
        status: "success",
        postcards: outputs
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: corsHeaders }
    )
  }
})
