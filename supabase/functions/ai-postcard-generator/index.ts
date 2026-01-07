import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { StateGraph, START, END, Send } from "npm:@langchain/langgraph"
import { ChatOpenAI } from "npm:@langchain/openai"
import { ChatPromptTemplate } from "npm:@langchain/core/prompts"
import { z } from "npm:zod"

// =======================================================
// 1. SCHEMAS
// =======================================================

const PostcardPlanSchema = z.object({
  layout_id: z.string(),
  geometry: z.object({
    hero_box: z.string(),
    content_box: z.string(),
    badge_box: z.string(),
    footer_box: z.string()
  }),
  visual_style: z.enum(["modern", "classic", "minimalist", "bold"]),
  extracted_elements: z.object({
    headline_style: z.string(),
    image_mask: z.string()
  })
})

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

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `
You are a STRICT PRINT LAYOUT SCHEMA EXTRACTION AGENT.

RULES:
- Focus ONLY on geometry
- 600x408 canvas
- Absolute CSS only
- ONE dominant image
- No design, no colors, no copy
    `],
    ["human", [
      { type: "text", text: `Analyze these ${state.user_images.length} postcard images.` },
      ...imageMessages
    ]]
  ])

  const response = await prompt.pipe(structured).invoke({})
  return { plans: response.plans }
}

// =======================================================
// 4. IMAGE RESOLVER NODE (PEXELS — DYNAMIC)
// =======================================================

async function imageResolverNode(state: any) {
  const industry =
    state.brand_data?.industries?.eic?.[0]?.industry ||
    state.brand_data?.category ||
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

  const designerPrompt = `
You are a STRICT PRINT POSTCARD RENDERING ENGINE.

CANVAS:
600px x 408px
position:absolute ONLY
NO web layout patterns

IMMUTABLE GEOMETRY:
Hero: ${plan.geometry.hero_box}
Content: ${plan.geometry.content_box}
Badge: ${plan.geometry.badge_box}
Footer: ${plan.geometry.footer_box}

IMAGE (LOCKED):
Use this EXACT image URL:
${resolved_image_url}

Rules:
- <img> only
- object-fit: cover
- Never replace image

BRAND:
${brand_data.title}
${getPrimaryAddress(brand_data)}
${getPrimaryContact(brand_data)}

CTA:
Printed text only (no buttons)

OUTPUT:
ONE complete HTML document
RAW HTML ONLY
NO markdown
NO explanation
  `

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