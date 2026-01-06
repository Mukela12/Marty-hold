import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { StateGraph, START, END, Send } from "npm:@langchain/langgraph";
import { ChatOpenAI } from "npm:@langchain/openai";
import { ChatPromptTemplate } from "npm:@langchain/core/prompts";
import { z } from "npm:zod";

const PostcardPlanSchema = z.object({
  layout_id: z.string().describe("Unique identifier for this pattern"),
  geometry: z.object({
    hero_box: z.string().describe("CSS absolute positioning: e.g., top:0; left:0; width:600px; height:250px;"),
    content_box: z.string().describe("CSS for the text area: e.g., top:260px; left:20px; width:560px;"),
    badge_box: z.string().describe("CSS for the offer badge"),
    footer_box: z.string().describe("CSS for the contact strip at bottom")
  }),
  visual_style: z.enum(["modern", "classic", "minimalist", "bold"]),
  extracted_elements: z.object({
    headline_style: z.string().describe("e.g. uppercase, serif, heavy-bold"),
    image_mask: z.string().describe("e.g. rectangular, rounded-lg, or full-bleed")
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


async function extractionNode(state: any) {
  const llm = new ChatOpenAI({ 
    modelName: "gpt-4o", 
    temperature: 0,
    apiKey: Deno.env.get("OPENAI_API_KEY") 
  });

  const structuredLlm = llm.withStructuredOutput(MultiPostcardExtraction);
  
  const imageMessages = state.user_images.map((url: string) => ({
    type: "image_url",
    image_url: { url: url, detail: "high" }
  }));

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", `You are a Senior Print Production Architect. 
    Analyze the provided postcard references and convert their structure into a CSS-ready Geometric Blueprint.
    
    RULES:
    1. Focus ONLY on the skeleton (where things are). 
    2. Convert spatial relationships into absolute CSS strings for a 600x408px canvas.
    3. Ignore the original colors; we will apply brand colors later.`],
    ["human", [
      { type: "text", text: `Analyze these ${state.user_images.length} images. Return ${state.user_images.length} distinct layout plans.` },
      ...imageMessages
    ]]
  ]);

  const response = await prompt.pipe(structuredLlm).invoke({});
  return { plans: response.plans };
}


async function generateSinglePostcard(workerInput: any) {
  const llm = new ChatOpenAI({ 
    modelName: "gpt-4o", 
    temperature: 0.7, 
    apiKey: Deno.env.get("OPENAI_API_KEY") 
  });

  const { plan, brand_data, index } = workerInput;

  const designerPrompt = `
    You are a World-Class Graphic Designer. Create a High-Conversion Marketing Postcard.
    
    CANVAS: 600px x 408px (Fixed Print Size)
    
    BRAND IDENTITY:
    - Name: ${brand_data.name}
    - Colors: Primary(${brand_data.primary_color}), Accent(${brand_data.secondary_color})
    - Tone: ${brand_data.tone || 'Professional'}
    - Tagline: ${brand_data.slogan}

    LAYOUT BLUEPRINT (Follow this geometry strictly):
    - Hero Area: ${plan.geometry.hero_box}
    - Content Area: ${plan.geometry.content_box}
    - Badge Area: ${plan.geometry.badge_box}
    - Footer Area: ${plan.geometry.footer_box}

    DESIGN RULES:
    1. Use Google Fonts: "Montserrat" for headlines, "Inter" for body.
    2. All elements MUST use "position: absolute".
    3. The Hero image should use "object-fit: cover". Use a high-quality placeholder image related to ${brand_data.category}.
    4. Create a compelling "Call to Action" that doesn't look like a web button, but a high-end print element.
    5. Variation ID: ${index} (Ensure the copy and headlines are unique from other versions).

    OUTPUT: 
    Return ONLY the raw HTML/CSS. No markdown code blocks. No explanations.
  `;

  const response = await llm.invoke(designerPrompt);
  return { final_html_gallery: [response.content] };
}


const dispatchWorkers = (state: any) => {
  const TOTAL_VARIATIONS = 12;
  const availablePlans = state.plans;

  return Array.from({ length: TOTAL_VARIATIONS }).map((_, i) => {
    // Cycles through the extracted plans to create 12 variations
    const selectedPlan = availablePlans[i % availablePlans.length];
    
    return new Send("generate_single_postcard", {
      index: i,
      brand_data: state.brand_data,
      plan: selectedPlan
    });
  });
};


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
    const initialState = {
      brand_data: payload.brand, 
      user_images: payload.images 
    };

    const result = await appEngine.invoke(initialState);
    
    return new Response(
      JSON.stringify({
        status: "success",
        postcards: result.final_html_gallery
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});