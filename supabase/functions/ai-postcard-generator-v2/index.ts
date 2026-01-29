import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { StateGraph, START, END } from "npm:@langchain/langgraph"
import { ChatOpenAI } from "npm:@langchain/openai"
import { ChatPromptTemplate } from "npm:@langchain/core/prompts"

/* -------------------- CORS -------------------- */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

/* -------------------- STATE -------------------- */
const PostcardState = {
  reference_images: { value: (_: any, y: any) => y, default: () => [] },
  brand_data: { value: (_: any, y: any) => y, default: () => ({}) },
  layout_html: { value: (_: any, y: any) => y, default: () => "" },
  unsplash_images: { value: (_: any, y: any) => y, default: () => [] },
  final_html: { value: (_: any, y: any) => y, default: () => "" },
}

/* -------------------- NODE 1 : EXTRACT LAYOUT -------------------- */
async function extractLayoutNode(state: any) {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    apiKey: Deno.env.get("OPENAI_API_KEY"),
  })

  // 🚀 FAST: Use image URLs directly (NO base64)
  const imageMessages = state.reference_images.map((url: string) => ({
    type: "image_url",
    image_url: { url },
  }))

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `
You are a Pixel-Perfect UI Reconstruction Coding Agent.
Your ONLY task is to convert the provided postcard/banner image into a SINGLE self-contained HTML file.

RULES (STRICT):
- Output ONLY valid HTML
- Start with <!DOCTYPE html>
- End with </html>
- NO explanations, NO markdown, NO comments
- Pixel-perfect reproduction only

PLACEHOLDERS (STRICT):
{{BRAND_NAME}}, {{PHONE}}, {{WEBSITE}}, {{ADDRESS}}, {{LOGO_IMAGE}}

CANVAS:
--canvas-w and --canvas-h must match image ratio
Use #stage and #postcard scaling logic

INLINE CSS ONLY
NO TEXT CROPPING
WEB-SAFE FONTS ONLY
      `,
    ],
    [
      "human",
      [
        { type: "text", text: "Generate postcard HTML template from this image:" },
        ...imageMessages,
      ],
    ],
  ])

  const res = await prompt.pipe(llm).invoke({})
  return { layout_html: res.content }
}

/* -------------------- NODE 2 : UNSPLASH (PARALLEL) -------------------- */
const unsplashCache = new Map<string, string[]>()

async function unsplashNode(state: any) {
  const category =
    state.brand_data?.category ||
    state.brand_data?.industries?.eic?.[0]?.industry ||
    "business"

  if (unsplashCache.has(category)) {
    return { unsplash_images: unsplashCache.get(category) }
  }

  const query = encodeURIComponent(`${category} professional`)
  const url = `https://api.unsplash.com/search/photos?query=${query}&orientation=landscape&per_page=6&content_filter=high`

  const res = await fetch(url, {
    headers: {
      Authorization: `Client-ID ${Deno.env.get("UNSPLASH_ACCESS_KEY")}`,
      "Accept-Version": "v1",
    },
  })

  if (!res.ok) throw new Error("Unsplash API failed")

  const data = await res.json()
  const images = (data.results || []).map(
    (p: any) =>
      `${p.urls.raw}&auto=format&fit=crop&w=600&h=408&q=80`
  )

  unsplashCache.set(category, images)
  return { unsplash_images: images }
}

/* -------------------- NODE 3 : REPLACE PLACEHOLDERS -------------------- */
async function replacePlaceholdersNode(state: any) {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    apiKey: Deno.env.get("OPENAI_API_KEY"),
  })

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `
You are an HTML TEMPLATE FINALIZER.

RULES:
- Replace ALL placeholders
- Use Brand JSON as source of truth
- Use Unsplash images for image placeholders
- DO NOT change layout
- DO NOT change CSS
- Output RAW HTML ONLY
      `,
    ],
    [
      "human",
      `
HTML TEMPLATE:
{html}

BRAND DATA:
{brand_data}

UNSPLASH IMAGES:
{unsplash_images}
      `,
    ],
  ])

  const res = await prompt.pipe(llm).invoke({
    html: state.layout_html,
    brand_data: JSON.stringify(state.brand_data),
    unsplash_images: JSON.stringify(state.unsplash_images),
  })

  return { final_html: res.content }
}

/* -------------------- LANGGRAPH FLOW -------------------- */
const workflow = new StateGraph({ channels: PostcardState })
  .addNode("extract_layout", extractLayoutNode)
  .addNode("resolve_images", unsplashNode)
  .addNode("replace_placeholders", replacePlaceholdersNode)

  // ⚡ PARALLEL EXECUTION
  .addEdge(START, "extract_layout")
  .addEdge(START, "resolve_images")

  .addEdge("extract_layout", "replace_placeholders")
  .addEdge("resolve_images", "replace_placeholders")

  .addEdge("replace_placeholders", END)

const app = workflow.compile()

/* -------------------- SERVER -------------------- */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const payload = await req.json()

    const outputs = await Promise.all(
      (payload.images || []).map(async (image: string) => {
        const result = await app.invoke({
          reference_images: [image],
          brand_data: payload.brand,
        })

        return {
          source_image: image,
          html: result.final_html,
        }
      })
    )

    return new Response(
      JSON.stringify({ status: "success", postcards: outputs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    )
  } catch (e: any) {
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: corsHeaders }
    )
  }
});
