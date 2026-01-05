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
    ["human", "BRAND DATA: {brand}\nIMAGES: {images}"]
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
    temperature: 0.7,
    apiKey: Deno.env.get("OPENAI_API_KEY") 
  });

  const styles = ["Minimalist Modern", "Bold High-Contrast", "Classic Corporate", "Vibrant & Playful"];
  const styleVariant = styles[workerInput.index % styles.length];

  const postcardPrompt = `
    You are an AI PostGrid Canvas Export Engine (PRINT ONLY).
    STYLE: ${styleVariant}
    CONSTRAINTS: 600x408px, ABSOLUTE positioning, NO flex/grid.
    DATA: ${JSON.stringify(workerInput.plan)}
    Output ONLY raw HTML.
  `;

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
