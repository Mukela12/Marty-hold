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
- Output is for a **PRINT POSTCARD (6 x 4 inches)**.
- NOT a website, NOT a UI mockup, NOT responsive.
- editorData DOES NOT EXIST at input time.
- You MUST generate editorData from scratch.
- Any schema violation or layout overflow is a FAILURE.

================================================================================
CANVAS (PRINT-LOCKED — SINGLE SOURCE OF TRUTH)
================================================================================
- Physical size: 6 x 4 inches
- DPI: 72
- Width: 432 px
- Height: 288 px
- Unit: px
- ALL elements MUST be fully inside this area
- NO overflow, NO clipping, NO scaling outside bounds

================================================================================
PRIMARY OBJECTIVE
================================================================================
Generate a **COMPLETE, VALID, RENDERABLE editorData JSON** that:
- Fits entirely within 432 x 288
- Has ZERO overlaps
- Preserves HTML hierarchy and grouping
- Is print-safe and editable in PostGrid

================================================================================
INPUT AUTHORITY (STRICT)
================================================================================
1. HTML INPUT — SOURCE OF TRUTH
   - Defines text, images, grouping, hierarchy, alignment

2. SAMPLE editorData — STRUCTURE ONLY
   - Learn schema and required flags ONLY
   - DO NOT copy values, sizes, or proportions

================================================================================
STRICT PROHIBITIONS
================================================================================
DO NOT:
- Copy IDs or dimensions from sample
- Invent content not present in HTML
- Output markdown, comments, or explanations
- Output partial JSON

================================================================================
MANDATORY OUTPUT RULES
================================================================================
1. Output ONLY valid JSON
2. Exactly ONE page
3. x, y, width, height MUST be numbers
4. Elements MUST NOT overlap
5. Stack order:
   background → figures → images → text
6. ALL editor flags MUST be present:
   draggable, selectable, removable,
   resizable, visible, showInExport, styleEditable
7. Generate NEW unique IDs for every element

================================================================================
TEXT SIZE & BOUNDING RULES (CRITICAL)
================================================================================
- Text MUST NEVER overflow its bounding box
- Font size MUST be derived from available space
- Text boxes MUST be sized using these rules:

TEXT BOX HEIGHT RULE:
- height ≥ fontSize × lineCount × 1.3

TEXT BOX WIDTH RULE:
- width ≥ 0.6 × fontSize × maxCharsPerLine

HEADLINE RULES:
- Max fontSize: 64 px
- Max text height: 96 px
- If text length > 8 characters → wrap into multiple lines
- Headline MUST NOT dominate more than its container

MINIMUM FONT SIZE:
- Minimum fontSize allowed: 12 px
- If content cannot fit → reduce fontSize first, then increase height

================================================================================
LAYOUT SAFETY RULES
================================================================================
- Maintain minimum 12 px padding from canvas edges
- Avoid tight boxes that risk clipping
- Prefer vertical stacking over crowding
- Layout must look balanced and print-safe

================================================================================
ELEMENT EXTRACTION
================================================================================
Reconstruct ALL visible elements from HTML:
- Text blocks → type: "text"
- Images → type: "image"
- Decorative shapes → type: "figure"
- Frames/containers → type: "guideline"

DO NOT invent decorative elements.

================================================================================
OUTPUT FORMAT (EXACT)
================================================================================
{
  "audios": [],
  "dpi": 72,
  "fonts": [],
  "height": 288,
  "pages": [
    {
      "id": "generated_page_id",
      "background": "white",
      "bleed": 0,
      "children": [],
      "duration": 5000,
      "height": "auto",
      "width": "auto"
    }
  ],
  "unit": "px",
  "width": 432
}

================================================================================
SAMPLE editorData (STRUCTURE ONLY)
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