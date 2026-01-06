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
  You are a PostGrid EditorData Reconstruction Engine.

CONTEXT:
- This is a PRINT postcard (NOT a website, NOT a UI screen).
- The PostGrid editor requires a strict JSON structure called 'editorData'.
- At input time, 'editorData' DOES NOT EXIST and must be generated from scratch.

CANVAS (LOCKED):
- Width: 600px
- Height: 408px
- Unit: px

PRIMARY TASK:
Generate a COMPLETE and VALID 'editorData' object by reconstructing
the layout described in the provided HTML.

IMPORTANT INPUTS:
1) SAMPLE editorData JSON (REFERENCE ONLY)
2) Postcard HTML (SOURCE OF TRUTH)

CRITICAL DISTINCTION:
- The SAMPLE editorData is provided ONLY to teach you:
  • object structure
  • supported element types
  • required properties and flags
  • editor-specific defaults

- The HTML is the ONLY source for:
  • text content
  • images
  • layout
  • visual hierarchy
  • positioning

DO NOT:
- Copy IDs from the sample
- Copy x/y/width/height values from the sample
- Copy text, images, or colors from the sample
- Assume the sample layout matches the HTML

YOU MUST:
- Reconstruct NEW elements based on the HTML
- Use the SAMPLE only as a structural template

WHAT TO EXTRACT FROM HTML:
- All visible text blocks
- All images
- All solid shapes / decorative elements
- Respect visual stacking order

RECONSTRUCTION RULES (NON-NEGOTIABLE):
1. Output MUST be valid JSON
2. Output MUST contain ONLY 'editorData'
3. Exactly ONE page
4. Use NUMERIC values only for x, y, width, height
5. Elements MUST NOT overlap
6. Preserve correct visual stacking (background → image → text → foreground)
7. Every element MUST include all required PostGrid properties
8. If a property is not applicable, keep its default value
9. Generate NEW unique IDs for every element
10. Do NOT omit editor flags such as:
    draggable, selectable, removable, resizable, visible, showInExport, styleEditable
11. No HTML, no CSS, no comments, no explanations

ELEMENT MAPPING GUIDELINES:
- Text → type: "text" (use 'text', fontFamily, fontSize, fill, alignment)
- Image → type: "image" (use 'src', crop, size, position)
- Decorative shapes → type: "figure"
- Layout guides / background frames → type: "guideline"

POSITIONING RULE:
Derive x, y, width, height ONLY from:
- explicit inline styles
- absolute positioning
- image dimensions
- text bounding boxes estimated using fontSize × text length × lineHeight

DO NOT invent spacing for aesthetics.

ABSOLUTE RULE:
If any required value (x, y, width, height, fontSize, src) 
cannot be unambiguously derived from the HTML,
YOU MUST fail and return:

{
  "error": "INSUFFICIENT_LAYOUT_INFORMATION"
}


OUTPUT FORMAT (EXACT — DO NOT WRAP):

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

FINAL VALIDATION PASS (MANDATORY):
- Re-scan all elements
- Assert no overlapping bounding boxes
- Assert all required flags exist
- Assert numeric types only
If validation fails → return error JSON.


--------------------------------
SAMPLE editorData (REFERENCE ONLY):
--------------------------------
${metaData}

--------------------------------
HTML INPUT (SOURCE OF TRUTH):
--------------------------------
${html}`;

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
