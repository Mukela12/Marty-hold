import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { StateGraph, START, END, Send } from "npm:@langchain/langgraph";
import { ChatOpenAI } from "npm:@langchain/openai";
import { ChatPromptTemplate } from "npm:@langchain/core/prompts";
import { z } from "npm:zod";

// --- 1. SCHEMAS (Tightened for Spacing) ---
const PostcardPlanSchema = z.object({
  layout_id: z.string(),
  structure: z.object({
    stack_direction: z.enum(["vertical", "horizontal", "split"]),
    content_alignment: z.enum(["flex-start", "center", "flex-end"]),
    bg_accent_shape: z.string().describe("CSS for a decorative background shape, e.g., 'clip-path: circle(50% at 0 0);'")
  })
});

const MultiPostcardExtraction = z.object({
  plans: z.array(PostcardPlanSchema)
});

const PostcardState = {
  brand_data: { value: (x: any, y: any) => y ?? x, default: () => ({}) },
  user_images: { value: (x: any, y: any) => y ?? x, default: () => [] },
  plans: { value: (x: any, y: any) => y ?? x, default: () => [] },
  final_html_gallery: { value: (x: string[], y: string[]) => x.concat(y), default: () => [] }
};

// --- 2. EXTRACTION NODE ---
async function extractionNode(state: any) {
  const llm = new ChatOpenAI({ modelName: "gpt-4o", temperature: 0, apiKey: Deno.env.get("OPENAI_API_KEY") });
  const structuredLlm = llm.withStructuredOutput(MultiPostcardExtraction);
  
  const imageMessages = state.user_images.map((url: string) => ({
    type: "image_url", image_url: { url: url, detail: "high" }
  }));

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a Senior Design Systems Architect. 
    Analyze postcard references. Instead of absolute pixels, extract the LOGICAL structure: 
    Is it a vertical stack? A split screen? Is the text centered? 
    Identify one signature geometric background shape from the image.`],
    ["human", [
      { type: "text", text: `Analyze these ${state.user_images.length} images for structural logic.` },
      ...imageMessages
    ]]
  ]);

  const response = await prompt.pipe(structuredLlm).invoke({});
  return { plans: response.plans };
}

// --- 3. HELPER FUNCTIONS ---
function getPrimaryContact(data:any) {
  const email = data?.email;
  const phone = data?.phone;
  const domain = data?.domain;
  const socials = data?.socials || [];

  if (email && phone) return `${email} | ${phone}`;
  if (email) return email;
  if (phone) return phone;
  if (domain) return domain;
  if (socials.length) return socials[0].url;

  return "";
}

function getPrimaryAddress(data:any) {
  const addr = data?.address;
  const email = data?.email;
  const phone = data?.phone;
  const domain = data?.domain;
  const socials = data?.socials || [];

  if (addr) {
    return [
      addr?.street,
      addr?.city,
      addr?.state_province,
      addr?.postal_code,
      addr?.country
    ]
      .filter(Boolean)
      .join(", ");
  }

  if (email && phone) return `${email} | ${phone}`;
  if (email) return email;
  if (phone) return phone;
  if (socials.length) return socials[0].url;
  if (domain) return domain;

  return "";
}

// --- 4. GENERATION NODE (The "Anti-Overlap" Designer) ---
async function generateSinglePostcard(workerInput: any) {
  const llm = new ChatOpenAI({ modelName: "gpt-4o", temperature: 0.7, apiKey: Deno.env.get("OPENAI_API_KEY") });
  const { plan, brand_data, index, style_type } = workerInput;
  const address = getPrimaryAddress(brand_data)
  const contact = getPrimaryContact(brand_data)
  const designerPrompt = `
    ROLE: High-End Marketing Art Director.
    TASK: Create a 600x408px Postcard for "${brand_data.title}".
    STYLE: ${style_type}.
    
    BRAND IDENTITY:
    - Name: ${brand_data.title}
    - Colors: Primary(${brand_data.colors[0].hex, brand_data.colors[0].name}), Accent(${brand_data.colors[1].hex, brand_data.colors[1].name}),
    - Tagline: ${brand_data?.slogan}
    - Address: ${address}
    - Contact: ${contact}

    CONSTRAINTS:
    - NO IMAGES. Use CSS shapes, gradients, and premium typography.
    - CANVAS: 600px width, 408px height.
    - NO OVERLAP: Elements must have breathing room.
    - PRIMARY COLOR: ${brand_data.colors[0].hex}
    - ACCENT COLOR: ${brand_data.colors[1]?.hex || '#000000'}

    LAYOUT LOGIC (Extracted from Blueprint):
    - Structure: ${plan.structure.stack_direction}
    - Align: ${plan.structure.content_alignment}
    - Accent Shape: ${plan.structure.bg_accent_shape}

    DESIGN SYSTEM:
    1. "IF Neo-Brutalism": Heavy borders (5px), hard shadows, "Montserrat" font.
    2. "IF Glassmorphism": Background-blur (15px), white-transparency, "Inter" font.
    3. "IF Minimalist Luxury": Airy margins (50px), "Playfair Display" Serif font, thin lines.
    4. Variation ID: ${index} (Ensure the copy and headlines are unique from other versions).
    5. It should feel premium and elegant look postcard and enhance the brand, and its marketing reach.


    HTML REQUIREMENTS:
    - Use a wrapper <div> with "display: flex" or "display: grid" to prevent overlapping.
    - Avoid "position: absolute" for text blocks unless it's for a background decoration.
    - Include <style> within the output.
    - The design must look like a professional print ad that converts.

    OUTPUT:
    Return ONLY the raw HTML/CSS. No markdown code blocks. No explanations.`

  const response = await llm.invoke(designerPrompt);
  return { final_html_gallery: [response.content] };
}

// --- 5. DISPATCHER ---
const dispatchWorkers = (state: any) => {
  const styles = ["Neo-Brutalism", "Glassmorphism", "Minimalist Luxury", "Swiss Modern"];
  return Array.from({ length: 12 }).map((_, i) => {
    return new Send("generate_single_postcard", {
      index: i,
      brand_data: state.brand_data,
      plan: state.plans[i % state.plans.length],
      style_type: styles[i % styles.length]
    });
  });
};

// --- 6. WORKFLOW & SERVE ---
const workflow = new StateGraph({ channels: PostcardState })
  .addNode("extractor", extractionNode)
  .addNode("generate_single_postcard", generateSinglePostcard)
  .addEdge(START, "extractor")
  .addConditionalEdges("extractor", dispatchWorkers)
  .addEdge("generate_single_postcard", END);

const appEngine = workflow.compile();

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const payload = await req.json();
    const result = await appEngine.invoke({ brand_data: payload.brand, user_images: payload.images });
    return new Response(JSON.stringify({ status: "success", postcards: result.final_html_gallery }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});