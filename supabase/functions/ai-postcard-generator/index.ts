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


async function generateSinglePostcard(workerInput: any) {
  const llm = new ChatOpenAI({ 
    modelName: "gpt-4o", 
    temperature: 0.7, 
    apiKey: Deno.env.get("OPENAI_API_KEY") 
  });
  const { plan, brand_data, index } = workerInput;
  const address = getPrimaryAddress(brand_data)
  const contact = getPrimaryContact(brand_data)
  const industry = brand_data.industries?.eic?.[0]?.industry
  const photoUrl = `https://unsplash.com/s/photos/${industry}`

//   const designerPrompt=`You are a World-Class Graphic Designer. Create a High-Conversion Marketing Postcard.


// CANVAS: 600px x 408px (Fixed Print Size)


// BRAND IDENTITY:

// - Name: ${brand_data.title}

// - Colors: Primary(${brand_data.colors[0].hex, brand_data.colors[0].name}), Accent(${brand_data.colors[1].hex, brand_data.colors[1].name}),

// - Tagline: ${brand_data?.slogan}

// - Address: ${address}

// - Contact: ${contact}



// LAYOUT BLUEPRINT (Follow this geometry strictly):

// - Hero Area: ${plan.geometry.hero_box}

// - Content Area: ${plan.geometry.content_box}

// - Badge Area: ${plan.geometry.badge_box}

// - Footer Area: ${plan.geometry.footer_box}



// DESIGN RULES:

// 1. Use Google Fonts: "Montserrat" for headlines, "Inter" for body.

// 2. All elements MUST use "position: absolute".

// 3. The Hero image should use "object-fit: cover". Use a high-quality placeholder image related to ${brand_data.industries.eic[0].industry}.

// 4. Create a compelling "Call to Action" that doesn't look like a web button, but a high-end print element.

// 5. Variation ID: ${index} (Ensure the copy and headlines are unique from other versions).



// OUTPUT:

// Return ONLY the raw HTML/CSS. No markdown code blocks. No explanations.`

// const designerPrompt = `
// #### ROLE AND MAIN MOTIVE 
// You are a Lead Creative Director at a top-tier Ad Agency. 
// Your goal is to design a high-end, premium marketing postcard that elevates the brand's perceived value.

// CANVAS: 600px x 408px (Fixed Print Size)

// BRAND IDENTITY:
// - Name: ${brand_data.title}
// - Colors: Primary(${brand_data.colors[0].hex}), Accent(${brand_data.colors[1].hex})
// - Tagline: ${brand_data?.slogan}
// - Contact Details: ${address} | ${contact}

// LAYOUT BLUEPRINT (Geometric Guides):
// - Hero Area: ${plan.geometry.hero_box}
// - Content Area: ${plan.geometry.content_box}
// - Badge Area: ${plan.geometry.badge_box}
// - Footer Area: ${plan.geometry.footer_box}

// ### THE "PREMIUM AD" DESIGN SYSTEM (STRICT)
// 1. ELEGANT WHITE SPACE: Every text container MUST have "padding: 40px 32px;". NEVER let text touch a border.
// 2. BOX MODEL: Set "box-sizing: border-box;" on every element.
// 3. TYPOGRAPHIC HIERARCHY: 
//    - Headline: font-size: 36px; font-weight: 800; line-height: 1.1; letter-spacing: -0.03em; margin-bottom: 20px;
//    - Body: font-size: 14px; line-height: 1.6; color: rgba(0,0,0,0.75);
//    - Footer: font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em;
// 4. VISUAL ANCHOR: Add a 6px vertical solid border-left using the Primary Color on the Content Area to create a high-end editorial look.

// ### CREATIVE EFFECTS FOR AD CAMPAIGNS
// 1. GLASSMORPHISM: Apply a subtle "backdrop-filter: blur(8px); background: rgba(255,255,255,0.85);" to the Content Box if it overlaps an image.
// 2. PREMIUM BADGE: The Badge Area should be a "Floating CTA" (border-radius: 50px; background: ${brand_data.colors[0].hex}; color: white; padding: 12px 24px; box-shadow: 0 15px 35px rgba(0,0,0,0.15); font-weight: bold;).
// 3. SOFT GRADIENTS: Use a very light linear gradient (white to #f4f4f4) on the main background to avoid a "flat/cheap" look.

// ### SELF-CRITIQUE RULES:
// - If the text is cluttered: Reduce font size or shorten the copy.
// - If it looks like a website: Change the layout. This is a PHYSICAL PRINT piece.
// - All elements MUST be "position: absolute".

// OUTPUT:
// Return ONLY the raw HTML/CSS. No markdown code blocks. No explanations.`;

const designerPrompt= `You are a World-Class Graphic Designer. Create a High-Conversion Marketing Postcard.
CANVAS: 600px x 408px (Fixed Print Size)

BRAND IDENTITY:

- Name: ${brand_data.title}
- Colors: Primary(${brand_data.colors[0].hex, brand_data.colors[0].name}), Accent(${brand_data.colors[1].hex, brand_data.colors[1].name}),
- Tagline: ${brand_data?.slogan}
- Address: ${address}
- Contact: ${contact}

LAYOUT BLUEPRINT (Follow this geometry strictly):
- Hero Area: ${plan.geometry.hero_box}
- Content Area: ${plan.geometry.content_box}
- Badge Area: ${plan.geometry.badge_box}
- Footer Area: ${plan.geometry.footer_box}

DESIGN RULES:

1. Use Google Fonts: "Montserrat" for headlines, "Inter" for body.
2. All elements MUST use "position: absolute".
3. The Hero image should use "object-fit: cover"
4. Create a compelling "Call to Action" that doesn't look like a web button, but a high-end print element.
5. Variation ID: ${index} (Ensure the copy and headlines are unique from other versions).

OUTPUT:
Return ONLY the raw HTML/CSS. No markdown code blocks. No explanations.`

const personas = ["Luxury Minimalist", "Bold Editorial", "Swiss Modern", "Elegant Serif"];
  const currentPersona = personas[index % personas.length];

  // Dynamic Image URL (Placeholder that actually works)

  // const designerPrompt = `
  //   ROLE: Lead Creative Director at a Global Ad Agency, Did Phd in Designing .
  //   PERSONA: You are designing in a "${currentPersona}" style.
  //   GOAL: Create a PREMIUM, high-conversion marketing postcard.

  //   CANVAS: 600px x 408px (Fixed Print Size)
  //   BRAND IDENTITY:
  //    - Name: ${brand_data.title}
  //    - Colors: Primary(${brand_data.colors[0].hex, brand_data.colors[0].name}), Accent(${brand_data.colors[1].hex, brand_data.colors[1].name}),
  //    - Tagline: ${brand_data?.slogan}
  //    - Address: ${address}
  //    - Contact: ${contact}
  //    MUST: use the brand colors

  //   LAYOUT BLUEPRINT (Geometric Foundation):
  //   - Hero: ${plan.geometry.hero_box}
  //   - Content: ${plan.geometry.content_box}
  //   - Badge: ${plan.geometry.badge_box}
  //   - Footer: ${plan.geometry.footer_box}

  //   ### VARIETY & ELEGANCE INSTRUCTIONS:
  //   1. CREATIVE LICENSE: You are NOT restricted to the blueprint. Adjust positions by 5-15% to improve visual balance. 
  //   2. TYPOGRAPHY (PREMIUM):
  //      - If "${currentPersona}" is Luxury: Use large, airy serif headlines with high tracking.
  //      - If "${currentPersona}" is Bold: Use heavy, tight-kerning sans-serifs.
  //      - HEADLINE MUST BE FOCAL POINT: min-size: 34px.
  //   3. SPACING & BREATHING ROOM:
  //      - Apply "padding: 45px 35px;" to the main content area.
  //      - Use "line-height: 1.5;" for body text to avoid clutter.
  //   4. AD-SPECIFIC EFFECTS:
  //      - Apply a soft "box-shadow: 0 20px 40px rgba(0,0,0,0.1);" to text containers.
  //      - Use "backdrop-filter: blur(12px);" for elements overlapping images for a modern, glass look.
  //      - Add a 1px elegant border-bottom under the headline using the Accent color.

  //   OUTPUT: 
  //   Return ONLY raw HTML/CSS. Ensure Variation ID ${index} is unique in its copy and layout interpretation.
  // `;

  // const designerPrompt = `
  //   ROLE: You are the Lead Industrial Designer, channeling the philosophy of Steve Jobs. 
  //   PHILOSOPHY: "Design is not just what it looks like and feels like. Design is how it works." 
  //   GOAL: Create a marketing postcard that feels like a physical object of desire—pure, elegant, and high-end.

  //   CANVAS: 600px x 408px (Fixed Print Size)
  //   CANVAS: 600px x 408px (Fixed Print Size)
  //   BRAND IDENTITY:
  //    - Name: ${brand_data.title}
  //    - Colors: Primary(${brand_data.colors[0].hex, brand_data.colors[0].name}), Accent(${brand_data.colors[1].hex, brand_data.colors[1].name}),
  //    - Tagline: ${brand_data?.slogan}
  //    - Address: ${address}
  //    - Contact: ${contact}
  //   ##MUST:  Use only brand Identity colors 

  //   LAYOUT BLUEPRINT (Foundational Guides):
  //   - Hero: ${plan.geometry.hero_box}
  //   - Content: ${plan.geometry.content_box}
  //   - Badge: ${plan.geometry.badge_box}
  //   - Footer: ${plan.geometry.footer_box}

  //   ### THE "APPLE" STANDARD OF ELEGANCE:
  //   1. ANTI-OVERLAP PROTOCOL: Elements must breathe. If the Content Box overlaps the Hero Area, you MUST use a "Glassmorphism" background (blur: 20px, semi-transparent white) to create separation. Never let text sit directly on a busy image background.
  //   2. NEGATIVE SPACE AS A FEATURE: Increase padding to 50px. Do not fear empty space; it signals luxury. 
  //   3. TACTILE DEPTH: 
  //      - Use a extremely subtle radial gradient on the background (#ffffff to #f2f2f2) to simulate premium heavy-weight matte paper.
  //      - Apply a "Letterpress" effect to secondary text (thin 1px text-shadow: 0px 1px 0px rgba(255,255,255,0.5)).
  //   4. TYPOGRAPHY: 
  //      - Use "Inter" or "SF Pro" style sans-serif. 
  //      - Headlines: Font-weight 600, letter-spacing -0.022em.
  //      - Sub-headlines: Primary Color, uppercase, 0.1em letter-spacing.
  //   5. THE "GOLDEN RATIO" PLACEMENT: If the provided geometry feels cluttered, you have the authority to shrink elements to ensure no two text blocks are within 30px of each other.

  //   ### AD-SPECIFIC REFINEMENT:
  //   - CTA: The Badge should look like a "Polished Button" or a "Premium Seal"—not a square box.
  //   - FOOTER: Ensure contact details are perfectly aligned and use a tiny font size (12px) with high tracking to look professional.

  //   OUTPUT: 
  //   Return ONLY raw HTML/CSS. NO markdown. Ensure Variation ID ${index} feels like a unique piece of "Product Design."
  // `;

  const response = await llm.invoke(designerPrompt);
  return { final_html_gallery: [response.content] };
}


const dispatchWorkers = (state: any) => {
  const TOTAL_VARIATIONS = 5;
  const availablePlans = state.plans;

  return Array.from({ length: TOTAL_VARIATIONS }).map((_, i) => {
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