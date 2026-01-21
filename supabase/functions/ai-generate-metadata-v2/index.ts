import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { ChatOpenAI } from "npm:@langchain/openai";

// handling the retry part
async function generateMetadataWithRetry(llm: ChatOpenAI, prompt: string, retries = 2): Promise<any> {
  let lastError: any;
  let currentPrompt = prompt;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await llm.invoke(currentPrompt);
      const raw = response.content as string;

      // Strip markdown 
      const cleaned = raw
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      return JSON.parse(cleaned);
    } catch (error) {
      lastError = error;
    };
  };

  throw new Error(
    "Failed to generate valid PostGrid metadata after retries"
  );
};

// METADATA GENERATION
async function generatePostGridMetadata(html: string, metaData: any) {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0,
    apiKey: Deno.env.get("OPENAI_API_KEY")
  });

const prompt = `
You are a **PostGrid EditorData Reconstruction Engine**.

================================================================================
ABSOLUTE CONTEXT (NON-NEGOTIABLE)
================================================================================
- This output is for a **PRINT POSTCARD**, NOT a website, NOT a UI mockup.
- The PostGrid editor consumes a strict JSON schema named **editorData**.
- At input time, **editorData DOES NOT EXIST** and must be generated from scratch.
- Any deviation from PostGrid schema rules is a FAILURE.

================================================================================
CANVAS (LOCKED — MUST BE RESPECTED)
================================================================================
- Width: 600 px
- Height: 408 px
- Unit: px
- Do NOT exceed canvas bounds.
- Do NOT place elements outside the visible area.

================================================================================
PRIMARY OBJECTIVE
================================================================================
Generate a **COMPLETE, VALID, and RENDERABLE** \`editorData\` JSON object by
reconstructing the visual layout described in the provided HTML.

The output MUST render correctly inside the PostGrid editor without:
- overlaps
- missing styles
- broken hierarchy
- invalid defaults

================================================================================
INPUT SOURCES (STRICT PRIORITY)
================================================================================
1. **HTML INPUT (SOURCE OF TRUTH)**
   - Defines ALL:
     • text content
     • images
     • visual hierarchy
     • spatial relationships
     • relative sizing

2. **SAMPLE editorData (REFERENCE ONLY)**
   - Use ONLY to learn:
     • JSON structure
     • supported element types
     • required properties
     • default flags and editor settings

⚠️ The SAMPLE is NOT a design reference.

================================================================================
STRICT PROHIBITIONS
================================================================================
DO NOT:
- Copy IDs from the sample
- Copy x / y / width / height values from the sample
- Copy text, images, colors, or fonts from the sample
- Assume the sample layout matches the HTML
- Invent content not present in HTML
- Output partial JSON
- Output explanations, comments, or markdown

================================================================================
MANDATORY RECONSTRUCTION RULES
================================================================================
1. Output MUST be **valid JSON**
2. Output MUST contain **ONLY editorData**
3. Exactly **ONE page**
4. Use **NUMERIC VALUES ONLY** for:
   - x, y, width, height
5. Elements MUST NOT overlap
6. Maintain correct visual stacking order:
   background → images → text → foreground
7. Every element MUST include ALL required PostGrid properties
8. If a property is not applicable, KEEP its default value
9. Generate NEW, UNIQUE IDs for every element
10. ALL editor flags MUST be present:
    - draggable
    - selectable
    - removable
    - resizable
    - visible
    - showInExport
    - styleEditable
11. NO HTML, NO CSS, NO comments, NO explanations

================================================================================
LAYOUT STABILITY RULES (CRITICAL)
================================================================================
- Respect padding and spacing implied by HTML
- Preserve text alignment and grouping
- Do NOT stretch text or images unnaturally
- Avoid tight bounding boxes that may cause clipping
- Ensure safe spacing between adjacent elements
- Prefer balanced layouts over edge-aligned placement

================================================================================
ELEMENT EXTRACTION REQUIREMENTS
================================================================================
From the HTML, extract and reconstruct:
- ALL visible text blocks
- ALL images
- ALL solid shapes or decorative elements
- Background or framing elements if visually present

================================================================================
ELEMENT TYPE MAPPING
================================================================================
- Text content        → type: "text"
  • properties: text, fontFamily, fontSize, fill, alignment

- Images              → type: "image"
  • properties: src, crop, size, position

- Decorative shapes   → type: "figure"

- Background frames /
  layout guides       → type: "guideline"

================================================================================
OUTPUT FORMAT (EXACT — DO NOT WRAP)
================================================================================
{
  "audios": [],
  "dpi": 72,
  "fonts": [],
  "height": 408,
  "pages": [
    {
      "id": "generated_page_id",
      "background": "white",
      "bleed": 0,
      "children": [ /* reconstructed elements */ ],
      "duration": 5000,
      "height": "auto",
      "width": "auto"
    }
  ],
  "unit": "px",
  "width": 600
}

================================================================================
SAMPLE editorData (REFERENCE ONLY)
================================================================================
${metaData}

================================================================================
HTML INPUT (SOURCE OF TRUTH)
================================================================================
${html}
`;


return generateMetadataWithRetry(llm, prompt);
};

Deno.serve(async (req: any) => {
  // here handling the cors issue
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type"
  };
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  };

  try {
    const payload = await req.json();

    // if we don't pass the html we are handling the error here
    if (!payload.html) {
      return new Response(
        JSON.stringify({ error: "Missing HTML input" }),
        { status: 400, headers: corsHeaders }
      );
    };

    // Here I'm calling the generation of metadata
    const metadata = await generatePostGridMetadata(payload.html, payload.metaData);

    // Here i am constructing the metadata part
    const finalMetaData = {
      editorCollateral: "postcard_6x4",
      editorCollateralDest: "us_intl",
      editorData: metadata,
      editorPostcardSide: "front"
    };
console.log(finalMetaData, ">>>>>>>>>>>>>>>>>>>>>>>>>");

    return new Response(
      JSON.stringify({  
        status: "success",
        finalMetaData
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        status: "error",
        message: error.message
      }),
      { status: 500, headers: corsHeaders }
    );
  };
});
