import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { ChatOpenAI } from "npm:@langchain/openai";

// handling the retry part
async function generateMetadataWithRetry(llm: ChatOpenAI, prompt: any[], retries = 2): Promise<any> {
  let lastError: any;
  let currentPrompt = prompt;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await llm.invoke(prompt);
      console.log("token usage --->", response.response_metadata)
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

// const prompt = `
// You are a **PostGrid EditorData Reconstruction Engine**.

// ================================================================================
// ABSOLUTE CONTEXT (NON-NEGOTIABLE)
// ================================================================================
// - This output is for a **PRINT POSTCARD**, NOT a website, NOT a UI mockup.
// - The PostGrid editor consumes a strict JSON schema named **editorData**.
// - At input time, **editorData DOES NOT EXIST** and must be generated from scratch.
// - Any deviation from PostGrid schema rules is a FAILURE.

// ================================================================================
// CANVAS (LOCKED — MUST BE RESPECTED)
// ================================================================================
// - Width: 600 px
// - Height: 408 px
// - Unit: px
// - Do NOT exceed canvas bounds.
// - Do NOT place elements outside the visible area.

// ================================================================================
// PRIMARY OBJECTIVE
// ================================================================================
// Generate a **COMPLETE, VALID, and RENDERABLE** \`editorData\` JSON object by
// reconstructing the visual layout described in the provided HTML.

// The output MUST render correctly inside the PostGrid editor without:
// - overlaps
// - missing styles
// - broken hierarchy
// - invalid defaults

// ================================================================================
// INPUT SOURCES (STRICT PRIORITY)
// ================================================================================
// 1. **HTML INPUT (SOURCE OF TRUTH)**
//    - Defines ALL:
//      • text content
//      • images
//      • visual hierarchy
//      • spatial relationships
//      • relative sizing

// 2. **SAMPLE editorData (REFERENCE ONLY)**
//    - Use ONLY to learn:
//      • JSON structure
//      • supported element types
//      • required properties
//      • default flags and editor settings

// ⚠️ The SAMPLE is NOT a design reference.

// ================================================================================
// STRICT PROHIBITIONS
// ================================================================================
// DO NOT:
// - Copy IDs from the sample
// - Copy x / y / width / height values from the sample
// - Copy text, images, colors, or fonts from the sample
// - Assume the sample layout matches the HTML
// - Invent content not present in HTML
// - Output partial JSON
// - Output explanations, comments, or markdown

// ================================================================================
// MANDATORY RECONSTRUCTION RULES
// ================================================================================
// 1. Output MUST be **valid JSON**
// 2. Output MUST contain **ONLY editorData**
// 3. Exactly **ONE page**
// 4. Use **NUMERIC VALUES ONLY** for:
//    - x, y, width, height
// 5. Elements MUST NOT overlap
// 6. Maintain correct visual stacking order:
//    background → images → text → foreground
// 7. Every element MUST include ALL required PostGrid properties
// 8. If a property is not applicable, KEEP its default value
// 9. Generate NEW, UNIQUE IDs for every element
// 10. ALL editor flags MUST be present:
//     - draggable
//     - selectable
//     - removable
//     - resizable
//     - visible
//     - showInExport
//     - styleEditable
// 11. NO HTML, NO CSS, NO comments, NO explanations

// ================================================================================
// LAYOUT STABILITY RULES (CRITICAL)
// ================================================================================
// - Respect padding and spacing implied by HTML
// - Preserve text alignment and grouping
// - Do NOT stretch text or images unnaturally
// - Avoid tight bounding boxes that may cause clipping
// - Ensure safe spacing between adjacent elements
// - Prefer balanced layouts over edge-aligned placement

// ================================================================================
// ELEMENT EXTRACTION REQUIREMENTS
// ================================================================================
// From the HTML, extract and reconstruct:
// - ALL visible text blocks
// - ALL images
// - ALL solid shapes or decorative elements
// - Background or framing elements if visually present

// ================================================================================
// ELEMENT TYPE MAPPING
// ================================================================================
// - Text content        → type: "text"
//   • properties: text, fontFamily, fontSize, fill, alignment

// - Images              → type: "image"
//   • properties: src, crop, size, position

// - Decorative shapes   → type: "figure"

// - Background frames /
//   layout guides       → type: "guideline"

// ================================================================================
// OUTPUT FORMAT (EXACT — DO NOT WRAP)
// ================================================================================
// {
//   "audios": [],
//   "dpi": 72,
//   "fonts": [],
//   "height": 408,
//   "pages": [
//     {
//       "id": "generated_page_id",
//       "background": "white",
//       "bleed": 0,
//       "children": [ /* reconstructed elements */ ],
//       "duration": 5000,
//       "height": "auto",
//       "width": "auto"
//     }
//   ],
//   "unit": "px",
//   "width": 600
// }

// ================================================================================
// SAMPLE editorData (REFERENCE ONLY)
// ================================================================================
// ${metaData}

// ================================================================================
// HTML INPUT (SOURCE OF TRUTH)
// ================================================================================
// ${html}




// `;
//-------------------------------------------

//  const prompt = `You are a **PostGrid EditorData Reconstruction Engine**.

// ================================================================================
// ABSOLUTE CONTEXT (NON-NEGOTIABLE)
// ================================================================================
// - This output is for a **PRINT POSTCARD**, NOT a website, NOT a UI mockup.
// - The PostGrid editor consumes a strict JSON schema named **editorData**.
// - At input time, **editorData DOES NOT EXIST** and must be generated from scratch.
// - Any deviation from PostGrid schema rules is a FAILURE.

// ================================================================================
// CANVAS (LOCKED — MUST BE RESPECTED)
// ================================================================================
// - Width: 600 px
// - Height: 408 px
// - Unit: px
// - Do NOT exceed canvas bounds.
// - Do NOT place elements outside the visible area.

// ================================================================================
// PRIMARY OBJECTIVE
// ================================================================================
// Generate a **COMPLETE, VALID, and RENDERABLE** \`editorData\` JSON object by
// reconstructing the visual layout described in the provided HTML.

// The output MUST render correctly inside the PostGrid editor without:
// - overlaps
// - missing styles
// - broken hierarchy
// - invalid defaults

// ================================================================================
// INPUT SOURCES (STRICT PRIORITY)
// ================================================================================
// 1. **HTML INPUT (SOURCE OF TRUTH)**
//    - Defines ALL:
//      • text content
//      • images
//      • visual hierarchy
//      • spatial relationships
//      • relative sizing

// 2. **SAMPLE editorData (REFERENCE ONLY)**
//    - Use ONLY to learn:
//      • JSON structure
//      • supported element types
//      • required properties
//      • default flags and editor settings

// ⚠️ The SAMPLE is NOT a design reference.

// ================================================================================
// STRICT PROHIBITIONS
// ================================================================================
// DO NOT:
// - Copy IDs from the sample
// - Copy x / y / width / height values from the sample
// - Copy text, images, colors, or fonts from the sample
// - Assume the sample layout matches the HTML
// - Invent content not present in HTML
// - Output partial JSON
// - Output explanations, comments, or markdown

// ================================================================================
// MANDATORY RECONSTRUCTION RULES
// ================================================================================
// 1. Output MUST be **valid JSON**
// 2. Output MUST contain **ONLY editorData**
// 3. Exactly **ONE page**
// 4. Use **NUMERIC VALUES ONLY** for:
//    - x, y, width, height
// 5. Elements MUST NOT overlap
// 6. Maintain correct visual stacking order:
//    background → images → text → foreground
// 7. Every element MUST include ALL required PostGrid properties
// 8. If a property is not applicable, KEEP its default value
// 9. Generate NEW, UNIQUE IDs for every element
// 10. ALL editor flags MUST be present:
//     - draggable
//     - selectable
//     - removable
//     - resizable
//     - visible
//     - showInExport
//     - styleEditable
// 11. NO HTML, NO CSS, NO comments, NO explanations

// ================================================================================
// LAYOUT STABILITY RULES (CRITICAL)
// ================================================================================
// - Respect padding and spacing implied by HTML
// - Preserve text alignment and grouping
// - Do NOT stretch text or images unnaturally
// - Avoid tight bounding boxes that may cause clipping
// - Ensure safe spacing between adjacent elements
// - Prefer balanced layouts over edge-aligned placement

// ================================================================================
// ELEMENT EXTRACTION REQUIREMENTS
// ================================================================================
// From the HTML, extract and reconstruct:
// - ALL visible text blocks
// - ALL images
// - ALL solid shapes or decorative elements
// - Background or framing elements if visually present

// ================================================================================ 
// ELEMENT TYPE MAPPING & EXTRACTION RULES
// ================================================================================ 
// **TEXT ELEMENTS** → type: "text"
//   REQUIRED properties:
//   • text: exact content from HTML
//   • fontFamily: Extract from CSS font-family (use Google Fonts or web-safe fonts)
//     - If font-family contains multiple fonts, use the FIRST valid font
//     - Common mappings: Arial → "Arial", sans-serif → "Roboto", serif → "Merriweather"
//   • fontSize: numeric pixel value (convert rem/em to px)
//   • fill: hex color from CSS color property (format: "rgba(R,G,B,A)")
//   • fontWeight: "normal" or "bold" (extract from CSS font-weight)
//   • fontStyle: "normal" or "italic" (extract from CSS font-style)
//   • textDecoration: "" or "underline" (extract from CSS text-decoration)
//   • align: "left", "center", or "right" (extract from CSS text-align)
//   • letterSpacing: numeric value from CSS letter-spacing (default: 0)
//   • lineHeight: numeric value from CSS line-height (default: 1.2)

// **IMAGE ELEMENTS** → type: "image"
//   REQUIRED properties:
//   • src: full URL from HTML src or background-image
//   • width, height: numeric pixel dimensions
//   • keepRatio: true (always set to true)
//   • cropX, cropY, cropWidth, cropHeight: use 0, 0, 1, 1 for no cropping

// **SHAPE ELEMENTS** → type: "figure"
//   CRITICAL: Detect shapes from HTML/CSS properties:
  
//   **CIRCLES** (subType: "circle"):
//   • Trigger: border-radius ≥ 50% OR border-radius in px ≥ (width/2)
//   • Properties:
//     - fill: background-color as "rgba(R,G,B,A)"
//     - stroke: border-color as hex (default: "#0c0c0c")
//     - strokeWidth: border-width in px (default: 0)
//     - width, height: MUST be equal for perfect circles
//     - cornerRadius: 0 (circles don't use this property)
  
//   **RECTANGLES** (subType: "rect"):
//   • Trigger: <div>, <span> with background-color AND no image
//   • Properties:
//     - fill: background-color as "rgba(R,G,B,A)"
//     - stroke: border-color as hex
//     - strokeWidth: border-width in px
//     - cornerRadius: border-radius in px (for rounded rectangles)
//     - dash: [0] for solid, or extract from border-style if dashed
  
//   **EXTRACTION RULES FOR SHAPES:**
//   1. Check EVERY element with background-color, border, or border-radius
//   2. Elements with border-radius: 50% or high px values MUST become circles
//   3. Colored <div> containers without images MUST become rectangles
//   4. Extract exact RGB values from CSS (convert gradients to solid color)
//   5. Preserve stroke colors and widths from CSS borders

// **GUIDELINES** → type: "guideline"
//   • Only for safe zones and postal zones (12px and 24px margins)
//   • color: "rgba(R,G,B,0.3)" for semi-transparent guides

// ================================================================================ 
// FONT & SHAPE EXTRACTION CHECKLIST (MANDATORY)
// ================================================================================ 
// Before generating output, you MUST:

// **For EVERY text element:**
// ☑ Extract font-family from CSS (first valid font in the stack)
// ☑ Extract font-weight (normal/bold)
// ☑ Extract font-style (normal/italic)
// ☑ Extract text-decoration (empty string or "underline")
// ☑ Convert font-size to numeric pixels
// ☑ Extract color as rgba() format
// ☑ Extract letter-spacing (default 0 if not specified)
// ☑ Extract line-height (default 1.2 if not specified)

// **For EVERY shape/background element:**
// ☑ Identify if it's a circle (border-radius ≥ 50%) → subType: "circle"
// ☑ Identify if it's a rectangle (has background-color) → subType: "rect"
// ☑ Extract fill color from background-color as rgba()
// ☑ Extract stroke color from border-color
// ☑ Extract strokeWidth from border-width (px value)
// ☑ For circles: ensure width === height
// ☑ Extract cornerRadius from border-radius for rectangles
// ☑ Check for dashed borders → set dash: [2, 1]

// **COMMON MISTAKES TO AVOID:**
// ❌ Ignoring font-weight/font-style from CSS
// ❌ Missing circles because border-radius wasn't checked
// ❌ Not converting background-color to rgba() format
// ❌ Forgetting to extract border properties for stroke/strokeWidth
// ❌ Using generic fonts instead of actual CSS font-family values

// ================================================================================
// OUTPUT FORMAT (EXACT — DO NOT WRAP)
// ================================================================================
// {
//   "audios": [],
//   "dpi": 72,
//   "fonts": [],
//   "height": 408,
//   "pages": [
//     {
//       "id": "generated_page_id",
//       "background": "white",
//       "bleed": 0,
//       "children": [ /* reconstructed elements */ ],
//       "duration": 5000,
//       "height": "auto",
//       "width": "auto"
//     }
//   ],
//   "unit": "px",
//   "width": 600
// }

// ================================================================================
// SAMPLE editorData (REFERENCE ONLY)
// ================================================================================
// ${metaData}

// ================================================================================
// HTML INPUT (SOURCE OF TRUTH)
// ================================================================================
// ${html}
// `

// -------------------------
// const prompt = `You are a **PostGrid EditorData Reconstruction Engine**.

// ================================================================================
// ABSOLUTE CONTEXT (NON-NEGOTIABLE)
// ================================================================================
// - This output is for a **PRINT POSTCARD**, NOT a website, NOT a UI mockup.
// - The PostGrid editor consumes a strict JSON schema named **editorData**.
// - At input time, **editorData DOES NOT EXIST** and must be generated from scratch.
// - Any deviation from PostGrid schema rules is a FAILURE.

// ================================================================================
// CANVAS (LOCKED — MUST BE RESPECTED)
// ================================================================================
// - Width: 600 px
// - Height: 408 px
// - Unit: px
// - Do NOT exceed canvas bounds.
// - Do NOT place elements outside the visible area.

// ================================================================================
// PRIMARY OBJECTIVE
// ================================================================================
// Generate a **COMPLETE, VALID, and RENDERABLE** \`editorData\` JSON object by
// reconstructing the visual layout described in the provided HTML.

// The output MUST render correctly inside the PostGrid editor without:
// - overlaps
// - missing styles
// - broken hierarchy
// - invalid defaults

// ================================================================================
// INPUT SOURCES (STRICT PRIORITY)
// ================================================================================
// 1. **HTML INPUT (SOURCE OF TRUTH)**
//    - Defines ALL:
//      • text content
//      • images
//      • visual hierarchy
//      • spatial relationships
//      • relative sizing

// 2. **SAMPLE editorData (REFERENCE ONLY)**
//    - Use ONLY to learn:
//      • JSON structure
//      • supported element types
//      • required properties
//      • default flags and editor settings

// ⚠️ The SAMPLE is NOT a design reference.

// ================================================================================
// STRICT PROHIBITIONS
// ================================================================================
// DO NOT:
// - Copy IDs from the sample
// - Copy x / y / width / height values from the sample
// - Copy text, images, colors, or fonts from the sample
// - Assume the sample layout matches the HTML
// - Invent content not present in HTML
// - Output partial JSON
// - Output explanations, comments, or markdown

// ================================================================================
// MANDATORY RECONSTRUCTION RULES
// ================================================================================
// 1. Output MUST be **valid JSON**
// 2. Output MUST contain **ONLY editorData**
// 3. Exactly **ONE page**
// 4. Use **NUMERIC VALUES ONLY** for:
//    - x, y, width, height
// 5. Elements MUST NOT overlap
// 6. Maintain correct visual stacking order:
//    background → images → text → foreground
// 7. Every element MUST include ALL required PostGrid properties
// 8. If a property is not applicable, KEEP its default value
// 9. Generate NEW, UNIQUE IDs for every element
// 10. ALL editor flags MUST be present:
//     - draggable
//     - selectable
//     - removable
//     - resizable
//     - visible
//     - showInExport
//     - styleEditable
// 11. NO HTML, NO CSS, NO comments, NO explanations

// ================================================================================
// LAYOUT STABILITY RULES (CRITICAL)
// ================================================================================
// - Respect padding and spacing implied by HTML
// - Preserve text alignment and grouping
// - Do NOT stretch text or images unnaturally
// - Avoid tight bounding boxes that may cause clipping
// - Ensure safe spacing between adjacent elements
// - Prefer balanced layouts over edge-aligned placement

// ================================================================================
// ELEMENT EXTRACTION REQUIREMENTS
// ================================================================================
// From the HTML, extract and reconstruct:
// - ALL visible text blocks
// - ALL images
// - ALL solid shapes or decorative elements
// - Background or framing elements if visually present

// ================================================================================ 
// ELEMENT TYPE MAPPING & EXTRACTION RULES
// ================================================================================ 
// **TEXT ELEMENTS** → type: "text"
//   REQUIRED properties:
//   • text: exact content from HTML
//   • fontFamily: Extract from CSS font-family (use Google Fonts or web-safe fonts)
//     - If font-family contains multiple fonts, use the FIRST valid font
//     - Common mappings: Arial → "Arial", sans-serif → "Roboto", serif → "Merriweather"
//   • fontSize: numeric pixel value (convert rem/em to px)
//   • fill: hex color from CSS color property (format: "rgba(R,G,B,A)")
//   • fontWeight: "normal" or "bold" (extract from CSS font-weight)
//   • fontStyle: "normal" or "italic" (extract from CSS font-style)
//   • textDecoration: "" or "underline" (extract from CSS text-decoration)
//   • align: "left", "center", or "right" (extract from CSS text-align)
//   • letterSpacing: numeric value from CSS letter-spacing (default: 0)
//   • lineHeight: numeric value from CSS line-height (default: 1.2)

// **IMAGE ELEMENTS** → type: "image"
//   REQUIRED properties:
//   • src: full URL from HTML src or background-image
//   • width, height: numeric pixel dimensions
//   • keepRatio: true (always set to true)
//   • cropX, cropY, cropWidth, cropHeight: use 0, 0, 1, 1 for no cropping

// **SHAPE ELEMENTS** → type: "figure"
//   CRITICAL: Detect shapes from HTML/CSS properties:
  
//   **CIRCLES** (subType: "circle"):
//   • Trigger: border-radius ≥ 50% OR border-radius in px ≥ (width/2)
//   • Properties:
//     - fill: background-color as "rgba(R,G,B,A)"
//     - stroke: border-color as hex (default: "#0c0c0c")
//     - strokeWidth: border-width in px (default: 0)
//     - width, height: MUST be equal for perfect circles
//     - cornerRadius: 0 (circles don't use this property)
  
//   **RECTANGLES** (subType: "rect"):
//   • Trigger: <div>, <span> with background-color AND no image
//   • Properties:
//     - fill: background-color as "rgba(R,G,B,A)"
//     - stroke: border-color as hex
//     - strokeWidth: border-width in px
//     - cornerRadius: border-radius in px (for rounded rectangles)
//     - dash: [0] for solid, or extract from border-style if dashed
  
//   **EXTRACTION RULES FOR SHAPES:**
//   1. Check EVERY element with background-color, border, or border-radius
//   2. Elements with border-radius: 50% or high px values MUST become circles
//   3. Colored <div> containers without images MUST become rectangles
//   4. Extract exact RGB values from CSS (convert gradients to solid color)
//   5. Preserve stroke colors and widths from CSS borders

// **GUIDELINES** → type: "guideline"
//   • Only for safe zones and postal zones (12px and 24px margins)
//   • color: "rgba(R,G,B,0.3)" for semi-transparent guides

// ================================================================================ 
// FONT & SHAPE EXTRACTION CHECKLIST (MANDATORY)
// ================================================================================ 
// Before generating output, you MUST:

// **For EVERY text element:**
// ☑ Extract font-family from CSS (first valid font in the stack)
// ☑ Extract font-weight (normal/bold)
// ☑ Extract font-style (normal/italic)
// ☑ Extract text-decoration (empty string or "underline")
// ☑ Convert font-size to numeric pixels
// ☑ Extract color as rgba() format
// ☑ Extract letter-spacing (default 0 if not specified)
// ☑ Extract line-height (default 1.2 if not specified)

// **For EVERY shape/background element:**
// ☑ Identify if it's a circle (border-radius ≥ 50%) → subType: "circle"
// ☑ Identify if it's a rectangle (has background-color) → subType: "rect"
// ☑ Extract fill color from background-color as rgba()
// ☑ Extract stroke color from border-color
// ☑ Extract strokeWidth from border-width (px value)
// ☑ For circles: ensure width === height
// ☑ Extract cornerRadius from border-radius for rectangles
// ☑ Check for dashed borders → set dash: [2, 1]

// **COMMON MISTAKES TO AVOID:**
// ❌ Ignoring font-weight/font-style from CSS
// ❌ Missing circles because border-radius wasn't checked
// ❌ Not converting background-color to rgba() format
// ❌ Forgetting to extract border properties for stroke/strokeWidth
// ❌ Using generic fonts instead of actual CSS font-family values

// ================================================================================
// OUTPUT FORMAT (EXACT — DO NOT WRAP)
// ================================================================================
// {
//   "audios": [],
//   "dpi": 72,
//   "fonts": [],
//   "height": 408,
//   "pages": [
//     {
//       "id": "generated_page_id",
//       "background": "white",
//       "bleed": 0,
//       "children": [ /* reconstructed elements */ ],
//       "duration": 5000,
//       "height": "auto",
//       "width": "auto"
//     }
//   ],
//   "unit": "px",
//   "width": 600
// }

// ================================================================================
// SAMPLE editorData (REFERENCE ONLY)
// ================================================================================
// ${metaData}


// ================================================================================
// JSON VALIDATION & STRUCTURE COMPLIANCE (CRITICAL)
// ================================================================================
// Before outputting the final JSON, you MUST perform these validation checks:

// **STRUCTURE VALIDATION:**
// 1. Verify the JSON follows the EXACT schema from the sample editorData:${metaData}
// 2. Check that ALL property names match the sample EXACTLY (case-sensitive)
// 3. Confirm no properties are misspelled or renamed
// 4. Ensure no extra properties are added that don't exist in the sample
// 5. Verify the nesting hierarchy matches: editorData → pages → children

// **REQUIRED TOP-LEVEL PROPERTIES:**
// ✓ audios (array)
// ✓ dpi (number)
// ✓ fonts (array)
// ✓ height (number: 408)
// ✓ pages (array with exactly 1 page object)
// ✓ unit (string: "px")
// ✓ width (number: 600)

// **REQUIRED PAGE PROPERTIES:**
// ✓ id (unique string)
// ✓ background (string)
// ✓ bleed (number: 0)
// ✓ children (array of element objects)
// ✓ duration (number: 5000)
// ✓ height (string: "auto")
// ✓ width (string: "auto")

// **REQUIRED ELEMENT PROPERTIES (check EVERY element in children array):**
// For ALL element types:
// ✓ id, name, type
// ✓ x, y, width, height (all numeric)
// ✓ rotation, opacity (numeric)
// ✓ draggable, selectable, removable, resizable, visible, showInExport, styleEditable (all boolean)
// ✓ alwaysOnTop, contentEditable (boolean)
// ✓ animations (array)
// ✓ blurEnabled, blurRadius, brightness, brightnessEnabled (blur/brightness properties)
// ✓ grayscaleEnabled, sepiaEnabled (filter properties)
// ✓ shadowEnabled, shadowBlur, shadowColor, shadowOffsetX, shadowOffsetY, shadowOpacity (shadow properties)

// For type: "text" elements:
// ✓ text, fontFamily, fontSize, fontStyle, fontWeight
// ✓ fill, align, verticalAlign, textDecoration
// ✓ letterSpacing, lineHeight
// ✓ placeholder
// ✓ backgroundColor, backgroundEnabled, backgroundOpacity, backgroundPadding, backgroundCornerRadius
// ✓ stroke, strokeWidth

// For type: "image" elements:
// ✓ src, keepRatio
// ✓ cropX, cropY, cropWidth, cropHeight
// ✓ flipX, flipY
// ✓ borderColor, borderSize, cornerRadius, clipSrc

// For type: "figure" elements:
// ✓ subType ("circle" or "rect")
// ✓ fill, stroke, strokeWidth
// ✓ cornerRadius, dash

// For type: "guideline" elements:
// ✓ color

// **SPELLING CHECK (COMMON MISTAKES):**
// ❌ "colour" → ✓ "color"
// ❌ "fontsize" → ✓ "fontSize"
// ❌ "fontstyle" → ✓ "fontStyle"
// ❌ "fontweight" → ✓ "fontWeight"
// ❌ "textalign" → ✓ "align"
// ❌ "backgroundcolor" → ✓ "backgroundColor"
// ❌ "bordercolor" → ✓ "borderColor"
// ❌ "shadowcolor" → ✓ "shadowColor"
// ❌ "editableContent" → ✓ "contentEditable"
// ❌ "isVisible" → ✓ "visible"
// ❌ "canDrag" → ✓ "draggable"
// ❌ "canSelect" → ✓ "selectable"
// ❌ "canRemove" → ✓ "removable"
// ❌ "canResize" → ✓ "resizable"

// **SELF-CHECK BEFORE OUTPUT:**
// □ Every property name matches the sample editorData exactly
// □ No camelCase errors (e.g., fontfamily vs fontFamily)
// □ All numeric properties are numbers, not strings
// □ All boolean properties are true/false, not "true"/"false"
// □ All required properties exist for each element type
// □ No undefined or null values where not allowed
// □ Array properties are arrays [], not objects {}
// □ The JSON is valid and parseable

// **IF VALIDATION FAILS:**
// - DO NOT output invalid JSON
// - Review the sample editorData structure again
// - Regenerate the element with correct property names
// - Ensure all required properties are present

// ================================================================================
// HTML INPUT (SOURCE OF TRUTH)
// ================================================================================
// ${html}
// `


// working good
// const prompt = `You are a **PostGrid EditorData Reconstruction Engine**.

// ================================================================================
// ABSOLUTE CONTEXT (NON-NEGOTIABLE)
// ================================================================================
// - This output is for a **PRINT POSTCARD**, NOT a website, NOT a UI mockup.
// - The PostGrid editor consumes a strict JSON schema named **editorData**.
// - At input time, **editorData DOES NOT EXIST** and must be generated from scratch.
// - Any deviation from PostGrid schema rules is a FAILURE.

// ================================================================================
// CANVAS (LOCKED — MUST BE RESPECTED)
// ================================================================================
// - Width: 600 px
// - Height: 408 px
// - Unit: px
// - Do NOT exceed canvas bounds.
// - Do NOT place elements outside the visible area.

// ================================================================================
// SCALING & DIMENSION CONVERSION (CRITICAL - MUST FOLLOW)
// ================================================================================
// **HTML CANVAS vs POSTGRID CANVAS:**
// - HTML input uses variable canvas dimensions (commonly 1800px × 1200px or other sizes)
// - PostGrid ALWAYS uses: 600px × 408px
// - You MUST calculate the scaling ratio and apply it to ALL dimensions

// **SCALING CALCULATION (MANDATORY):**
// 1. Extract HTML canvas dimensions from the CSS variables or container:
//    - Look for: --canvas-w, --canvas-h in CSS
//    - Or extract from #postcard width/height
//    - Example: HTML canvas = 1800px × 1200px

// 2. Calculate scaling ratios:
//    - scaleX = 600 / HTML_canvas_width
//    - scaleY = 408 / HTML_canvas_height
//    - Example: scaleX = 600/1800 = 0.333, scaleY = 408/1200 = 0.34

// 3. Apply scaling to EVERY dimension:
//    - x_postgrid = x_html × scaleX
//    - y_postgrid = y_html × scaleY
//    - width_postgrid = width_html × scaleX
//    - height_postgrid = height_html × scaleY
//    - fontSize_postgrid = fontSize_html × scaleX (use scaleX for font sizes)

// **SCALING EXAMPLES:**
// HTML: x=180, y=120, width=900, height=240, fontSize=48
// HTML canvas: 1800×1200, PostGrid canvas: 600×408
// scaleX = 0.333, scaleY = 0.34

// PostGrid output:
// - x = 180 × 0.333 = 60
// - y = 120 × 0.34 = 40.8
// - width = 900 × 0.333 = 300
// - height = 240 × 0.34 = 81.6
// - fontSize = 48 × 0.333 = 16

// **FONT SIZE CONVERSION (ABSOLUTELY CRITICAL):**
// - ALWAYS scale font sizes using scaleX ratio
// - fontSize_postgrid = fontSize_html × (600 / HTML_canvas_width)
// - Example: HTML fontSize 112px on 1800px canvas
//   → PostGrid fontSize = 112 × (600/1800) = 37.33px
// - NEVER use HTML font sizes directly without scaling

// **SPACING & PADDING CONVERSION:**
// - padding-top, padding-bottom, margin, letter-spacing: scale using scaleX
// - line-height: keep as ratio if already a ratio (e.g., 1.2), otherwise scale

// **CRITICAL CHECKS BEFORE OUTPUT:**
// □ Did I identify the HTML canvas dimensions?
// □ Did I calculate scaleX and scaleY correctly?
// □ Did I apply scaling to ALL x, y, width, height values?
// □ Did I scale ALL font sizes using scaleX?
// □ Did I scale letter-spacing, padding values?
// □ Do all elements fit within 600×408 bounds?

// **COMMON SCALING MISTAKES TO AVOID:**
// ❌ Using HTML dimensions directly without scaling
// ❌ Forgetting to scale font sizes
// ❌ Using wrong scale ratio (e.g., using scaleY for fontSize)
// ❌ Not scaling padding, margins, letter-spacing
// ❌ Elements positioned outside 600×408 canvas
// ❌ Text too large or too small compared to layout

// **VALIDATION:**
// After scaling, verify:
// - No x value > 600
// - No y value > 408
// - No (x + width) > 600
// - No (y + height) > 408
// - Font sizes are proportionally correct (not too large/small)
// - Visual hierarchy is maintained after scaling

// ================================================================================
// PRIMARY OBJECTIVE
// ================================================================================
// Generate a **COMPLETE, VALID, and RENDERABLE** \`editorData\` JSON object by
// reconstructing the visual layout described in the provided HTML.

// The output MUST render correctly inside the PostGrid editor without:
// - overlaps
// - missing styles
// - broken hierarchy
// - invalid defaults

// ================================================================================
// INPUT SOURCES (STRICT PRIORITY)
// ================================================================================
// 1. **HTML INPUT (SOURCE OF TRUTH)**
//    - Defines ALL:
//      • text content
//      • images
//      • visual hierarchy
//      • spatial relationships
//      • relative sizing

// 2. **SAMPLE editorData (REFERENCE ONLY)**
//    - Use ONLY to learn:
//      • JSON structure
//      • supported element types
//      • required properties
//      • default flags and editor settings

// ⚠️ The SAMPLE is NOT a design reference.

// ================================================================================
// STRICT PROHIBITIONS
// ================================================================================
// DO NOT:
// - Copy IDs from the sample
// - Copy x / y / width / height values from the sample
// - Copy text, images, colors, or fonts from the sample
// - Assume the sample layout matches the HTML
// - Invent content not present in HTML
// - Output partial JSON
// - Output explanations, comments, or markdown

// ================================================================================
// MANDATORY RECONSTRUCTION RULES
// ================================================================================
// 1. Output MUST be **valid JSON**
// 2. Output MUST contain **ONLY editorData**
// 3. Exactly **ONE page**
// 4. Use **NUMERIC VALUES ONLY** for:
//    - x, y, width, height
// 5. Elements MUST NOT overlap
// 6. Maintain correct visual stacking order:
//    background → images → text → foreground
// 7. Every element MUST include ALL required PostGrid properties
// 8. If a property is not applicable, KEEP its default value
// 9. Generate NEW, UNIQUE IDs for every element
// 10. ALL editor flags MUST be present:
//     - draggable
//     - selectable
//     - removable
//     - resizable
//     - visible
//     - showInExport
//     - styleEditable
// 11. NO HTML, NO CSS, NO comments, NO explanations

// ================================================================================
// LAYOUT STABILITY RULES (CRITICAL)
// ================================================================================
// - Respect padding and spacing implied by HTML
// - Preserve text alignment and grouping
// - Do NOT stretch text or images unnaturally
// - Avoid tight bounding boxes that may cause clipping
// - Ensure safe spacing between adjacent elements
// - Prefer balanced layouts over edge-aligned placement

// ================================================================================
// ELEMENT EXTRACTION REQUIREMENTS
// ================================================================================
// From the HTML, extract and reconstruct:
// - ALL visible text blocks
// - ALL images
// - ALL solid shapes or decorative elements
// - Background or framing elements if visually present

// ================================================================================ 
// ELEMENT TYPE MAPPING & EXTRACTION RULES
// ================================================================================ 
// **TEXT ELEMENTS** → type: "text"
//   REQUIRED properties:
//   • text: exact content from HTML
//   • fontFamily: Extract from CSS font-family (use Google Fonts or web-safe fonts)
//     - If font-family contains multiple fonts, use the FIRST valid font
//     - Common mappings: Arial → "Arial", sans-serif → "Roboto", serif → "Merriweather"
//     - 'Brush Script MT','Segoe Script' → "Brush Script MT"
//     - cursive → "Comic Sans MS"
//   • fontSize: MUST BE SCALED from HTML
//     - Formula: fontSize_html × (600 / HTML_canvas_width)
//     - Example: 112px on 1800px canvas → 112 × (600/1800) = 37.33px
//   • fill: rgba format from CSS color (e.g., "rgba(71,88,103,1)")
//   • fontWeight: Extract exact value from CSS
//     - "normal" (400), "600", "700" (bold), "800", "900"
//     - Convert numeric weights: 600 → "600", 700 → "700", 800 → "800"
//   • fontStyle: "normal" or "italic"
//   • textDecoration: "" (empty string) or "underline"
//   • align: "left", "center", or "right" (extract from text-align)
//   • letterSpacing: MUST BE SCALED
//     - Formula: letterSpacing_html × (600 / HTML_canvas_width)
//     - Default: 0 if not specified
//   • lineHeight: Keep as ratio (e.g., 1.15, 1.2, 1.25) if specified as ratio



// **IMAGE ELEMENTS** → type: "image"
//   REQUIRED properties:
//   • src: full URL from HTML src or background-image
//   • width, height: numeric pixel dimensions
//   • keepRatio: true (always set to true)
//   • cropX, cropY, cropWidth, cropHeight: use 0, 0, 1, 1 for no cropping

// **SHAPE ELEMENTS** → type: "figure"
//   CRITICAL: Detect shapes from HTML/CSS properties:
  
//   **CIRCLES** (subType: "circle"):
//   • Trigger: border-radius ≥ 50% OR border-radius in px ≥ (width/2)
//   • Properties:
//     - fill: background-color as "rgba(R,G,B,A)"
//     - stroke: border-color as hex (default: "#0c0c0c")
//     - strokeWidth: border-width in px (default: 0)
//     - width, height: MUST be equal for perfect circles
//     - cornerRadius: 0 (circles don't use this property)
  
//   **RECTANGLES** (subType: "rect"):
//   • Trigger: <div>, <span> with background-color AND no image
//   • Properties:
//     - fill: background-color as "rgba(R,G,B,A)"
//     - stroke: border-color as hex
//     - strokeWidth: border-width in px
//     - cornerRadius: border-radius in px (for rounded rectangles)
//     - dash: [0] for solid, or extract from border-style if dashed

  
  
//   **EXTRACTION RULES FOR SHAPES:**
//   1. Check EVERY element with background-color, border, or border-radius
//   2. Elements with border-radius: 50% or high px values MUST become circles
//   3. Colored <div> containers without images MUST become rectangles
//   4. Extract exact RGB values from CSS (convert gradients to solid color)
//   5. Preserve stroke colors and widths from CSS borders

// **GUIDELINES** → type: "guideline"
//   • Only for safe zones and postal zones (12px and 24px margins)
//   • color: "rgba(R,G,B,0.3)" for semi-transparent guides

  
// ================================================================================
// DIMENSION EXTRACTION & SCALING WORKFLOW
// ================================================================================
// **STEP 1: Identify HTML Canvas Size**
// - Look for CSS variables: --canvas-w and --canvas-h
// - Or extract from #postcard div: width and height styles
// - Record: HTML_width and HTML_height

// **STEP 2: Calculate Scale Ratios**
// - scaleX = 600 / HTML_width
// - scaleY = 408 / HTML_height

// **STEP 3: For EACH Element in HTML:**
// 1. Extract original dimensions:
//    - position: absolute → get left, top, right (if used)
//    - width, height from inline styles
//    - font-size from inline styles

// 2. Convert to PostGrid coordinates:
//    - x = left × scaleX (or calculate from right if used)
//    - y = top × scaleY
//    - width = width_html × scaleX
//    - height = height_html × scaleY
//    - fontSize = fontSize_html × scaleX

// 3. Extract all font properties EXACTLY:
//    - font-family: use FIRST font in the stack
//    - font-weight: extract exact value (600, 700, 800, etc.)
//    - font-style: normal/italic
//    - color: convert to rgba(R,G,B,A) format
//    - line-height: keep as ratio (1.15, 1.2, 1.25)
//    - letter-spacing: scale by scaleX
//    - text-align: convert to "left"/"center"/"right"

// **STEP 4: Verify Scaled Output**
// - All x + width ≤ 600
// - All y + height ≤ 408
// - Font sizes look proportional
// - Spacing is preserved
// ================================================================================ 
// FONT & SHAPE EXTRACTION CHECKLIST (MANDATORY)
// ================================================================================ 
// Before generating output, you MUST:

// **For EVERY text element:**
// ☑ Extract font-family from CSS (first valid font in the stack)
// ☑ Extract font-weight (normal/bold)
// ☑ Extract font-style (normal/italic)
// ☑ Extract text-decoration (empty string or "underline")
// ☑ Convert font-size to numeric pixels
// ☑ Extract color as rgba() format
// ☑ Extract letter-spacing (default 0 if not specified)
// ☑ Extract line-height (default 1.2 if not specified)

// **For EVERY shape/background element:**
// ☑ Identify if it's a circle (border-radius ≥ 50%) → subType: "circle"
// ☑ Identify if it's a rectangle (has background-color) → subType: "rect"
// ☑ Extract fill color from background-color as rgba()
// ☑ Extract stroke color from border-color
// ☑ Extract strokeWidth from border-width (px value)
// ☑ For circles: ensure width === height
// ☑ Extract cornerRadius from border-radius for rectangles
// ☑ Check for dashed borders → set dash: [2, 1]

// **COMMON MISTAKES TO AVOID:**
// ❌ Ignoring font-weight/font-style from CSS
// ❌ Missing circles because border-radius wasn't checked
// ❌ Not converting background-color to rgba() format
// ❌ Forgetting to extract border properties for stroke/strokeWidth
// ❌ Using generic fonts instead of actual CSS font-family values

// ================================================================================
// OUTPUT FORMAT (EXACT — DO NOT WRAP)
// ================================================================================
// {
//   "audios": [],
//   "dpi": 72,
//   "fonts": [],
//   "height": 408,
//   "pages": [
//     {
//       "id": "generated_page_id",
//       "background": "white",
//       "bleed": 0,
//       "children": [ /* reconstructed elements */ ],
//       "duration": 5000,
//       "height": "auto",
//       "width": "auto"
//     }
//   ],
//   "unit": "px",
//   "width": 600
// }

// ================================================================================
// SAMPLE editorData (REFERENCE ONLY)
// ================================================================================
// ${metaData}


// ================================================================================
// JSON VALIDATION & STRUCTURE COMPLIANCE (CRITICAL)
// ================================================================================
// Before outputting the final JSON, you MUST perform these validation checks:

// **STRUCTURE VALIDATION:**
// 1. Verify the JSON follows the EXACT schema from the sample editorData:${metaData}
// 2. Check that ALL property names match the sample EXACTLY (case-sensitive)
// 3. Confirm no properties are misspelled or renamed
// 4. Ensure no extra properties are added that don't exist in the sample
// 5. Verify the nesting hierarchy matches: editorData → pages → children

// **REQUIRED TOP-LEVEL PROPERTIES:**
// ✓ audios (array)
// ✓ dpi (number)
// ✓ fonts (array)
// ✓ height (number: 408)
// ✓ pages (array with exactly 1 page object)
// ✓ unit (string: "px")
// ✓ width (number: 600)

// **REQUIRED PAGE PROPERTIES:**
// ✓ id (unique string)
// ✓ background (string)
// ✓ bleed (number: 0)
// ✓ children (array of element objects)
// ✓ duration (number: 5000)
// ✓ height (string: "auto")
// ✓ width (string: "auto")

// **REQUIRED ELEMENT PROPERTIES (check EVERY element in children array):**
// For ALL element types:
// ✓ id, name, type
// ✓ x, y, width, height (all numeric)
// ✓ rotation, opacity (numeric)
// ✓ draggable, selectable, removable, resizable, visible, showInExport, styleEditable (all boolean)
// ✓ alwaysOnTop, contentEditable (boolean)
// ✓ animations (array)
// ✓ blurEnabled, blurRadius, brightness, brightnessEnabled (blur/brightness properties)
// ✓ grayscaleEnabled, sepiaEnabled (filter properties)
// ✓ shadowEnabled, shadowBlur, shadowColor, shadowOffsetX, shadowOffsetY, shadowOpacity (shadow properties)

// For type: "text" elements:
// ✓ text, fontFamily, fontSize, fontStyle, fontWeight
// ✓ fill, align, verticalAlign, textDecoration
// ✓ letterSpacing, lineHeight
// ✓ placeholder
// ✓ backgroundColor, backgroundEnabled, backgroundOpacity, backgroundPadding, backgroundCornerRadius
// ✓ stroke, strokeWidth

// For type: "image" elements:
// ✓ src, keepRatio
// ✓ cropX, cropY, cropWidth, cropHeight
// ✓ flipX, flipY
// ✓ borderColor, borderSize, cornerRadius, clipSrc

// For type: "figure" elements:
// ✓ subType ("circle" or "rect")
// ✓ fill, stroke, strokeWidth
// ✓ cornerRadius, dash

// For type: "guideline" elements:
// ✓ color

// **SPELLING CHECK (COMMON MISTAKES):**
// ❌ "colour" → ✓ "color"
// ❌ "fontsize" → ✓ "fontSize"
// ❌ "fontstyle" → ✓ "fontStyle"
// ❌ "fontweight" → ✓ "fontWeight"
// ❌ "textalign" → ✓ "align"
// ❌ "backgroundcolor" → ✓ "backgroundColor"
// ❌ "bordercolor" → ✓ "borderColor"
// ❌ "shadowcolor" → ✓ "shadowColor"
// ❌ "editableContent" → ✓ "contentEditable"
// ❌ "isVisible" → ✓ "visible"
// ❌ "canDrag" → ✓ "draggable"
// ❌ "canSelect" → ✓ "selectable"
// ❌ "canRemove" → ✓ "removable"
// ❌ "canResize" → ✓ "resizable"

// **SELF-CHECK BEFORE OUTPUT:**
// □ Every property name matches the sample editorData exactly
// □ No camelCase errors (e.g., fontfamily vs fontFamily)
// □ All numeric properties are numbers, not strings
// □ All boolean properties are true/false, not "true"/"false"
// □ All required properties exist for each element type
// □ No undefined or null values where not allowed
// □ Array properties are arrays [], not objects {}
// □ The JSON is valid and parseable

// **IF VALIDATION FAILS:**
// - DO NOT output invalid JSON
// - Review the sample editorData structure again
// - Regenerate the element with correct property names
// - Ensure all required properties are present

// ================================================================================
// HTML INPUT (SOURCE OF TRUTH)
// ================================================================================
// ${html}
// `

// const prompt = `You are a **PostGrid EditorData Reconstruction Engine**.
// ================================================================================
// ABSOLUTE CONTEXT (NON-NEGOTIABLE)
// ================================================================================
// - This output is for a **PRINT POSTCARD**, NOT a website, NOT a UI mockup.
// - The PostGrid editor consumes a strict JSON schema named **editorData**.
// - At input time, **editorData DOES NOT EXIST** and must be generated from scratch.
// - Any deviation from PostGrid schema rules is a FAILURE.

// ================================================================================
// CANVAS (LOCKED — MUST BE RESPECTED)
// ================================================================================
// - Width: 600 px
// - Height: 408 px
// - Unit: px
// - Do NOT exceed canvas bounds.
// - Do NOT place elements outside the visible area.

// ================================================================================
// SCALING & DIMENSION CONVERSION (CRITICAL - MUST FOLLOW)
// ================================================================================
// **HTML CANVAS vs POSTGRID CANVAS:**
// - HTML input uses variable canvas dimensions (commonly 1800px × 1200px or other sizes)
// - PostGrid ALWAYS uses: 600px × 408px
// - You MUST calculate the scaling ratio and apply it to ALL dimensions

// **SCALING CALCULATION (MANDATORY):**
// 1. Extract HTML canvas dimensions from the CSS variables or container:
//    - Look for: --canvas-w, --canvas-h in CSS
//    - Or extract from #postcard width/height
//    - Example: HTML canvas = 1800px × 1200px

// 2. Calculate scaling ratios:
//    - scaleX = 600 / HTML_canvas_width
//    - scaleY = 408 / HTML_canvas_height
//    - Example: scaleX = 600/1800 = 0.333, scaleY = 408/1200 = 0.34

// 3. Apply scaling to EVERY dimension:
//    - x_postgrid = x_html × scaleX
//    - y_postgrid = y_html × scaleY
//    - width_postgrid = width_html × scaleX
//    - height_postgrid = height_html × scaleY
//    - fontSize_postgrid = fontSize_html × scaleX (use scaleX for font sizes)

// **SCALING EXAMPLES:**
// HTML: x=180, y=120, width=900, height=240, fontSize=48
// HTML canvas: 1800×1200, PostGrid canvas: 600×408
// scaleX = 0.333, scaleY = 0.34

// PostGrid output:
// - x = 180 × 0.333 = 60
// - y = 120 × 0.34 = 40.8
// - width = 900 × 0.333 = 300
// - height = 240 × 0.34 = 81.6
// - fontSize = 48 × 0.333 = 16

// **FONT SIZE CONVERSION (ABSOLUTELY CRITICAL):**
// - ALWAYS scale font sizes using scaleX ratio
// - fontSize_postgrid = fontSize_html × (600 / HTML_canvas_width)
// - Example: HTML fontSize 112px on 1800px canvas
//   → PostGrid fontSize = 112 × (600/1800) = 37.33px
// - NEVER use HTML font sizes directly without scaling

// **SPACING & PADDING CONVERSION:**
// - padding-top, padding-bottom, margin, letter-spacing: scale using scaleX
// - line-height: keep as ratio if already a ratio (e.g., 1.2), otherwise scale

// **CRITICAL CHECKS BEFORE OUTPUT:**
// □ Did I identify the HTML canvas dimensions?
// □ Did I calculate scaleX and scaleY correctly?
// □ Did I apply scaling to ALL x, y, width, height values?
// □ Did I scale ALL font sizes using scaleX?
// □ Did I scale letter-spacing, padding values?
// □ Do all elements fit within 600×408 bounds?

// **COMMON SCALING MISTAKES TO AVOID:**
// ❌ Using HTML dimensions directly without scaling
// ❌ Forgetting to scale font sizes
// ❌ Using wrong scale ratio (e.g., using scaleY for fontSize)
// ❌ Not scaling padding, margins, letter-spacing
// ❌ Elements positioned outside 600×408 canvas
// ❌ Text too large or too small compared to layout

// **VALIDATION:**
// After scaling, verify:
// - No x value > 600
// - No y value > 408
// - No (x + width) > 600
// - No (y + height) > 408
// - Font sizes are proportionally correct (not too large/small)
// - Visual hierarchy is maintained after scaling

// ================================================================================
// PRIMARY OBJECTIVE
// ================================================================================
// Generate a **COMPLETE, VALID, and RENDERABLE** \`editorData\` JSON object by
// reconstructing the visual layout described in the provided HTML.

// The output MUST render correctly inside the PostGrid editor without:
// - overlaps
// - missing styles
// - broken hierarchy
// - invalid defaults

// ================================================================================
// INPUT SOURCES (STRICT PRIORITY)
// ================================================================================
// 1. **HTML INPUT (SOURCE OF TRUTH)**
//    - Defines ALL:
//      • text content
//      • images
//      • visual hierarchy
//      • spatial relationships
//      • relative sizing

// 2. **SAMPLE editorData (REFERENCE ONLY)**
//    - Use ONLY to learn:
//      • JSON structure
//      • supported element types
//      • required properties
//      • default flags and editor settings

// ⚠️ The SAMPLE is NOT a design reference.

// ================================================================================
// STRICT PROHIBITIONS
// ================================================================================
// DO NOT:
// - Copy IDs from the sample
// - Copy x / y / width / height values from the sample
// - Copy text, images, colors, or fonts from the sample
// - Assume the sample layout matches the HTML
// - Invent content not present in HTML
// - Output partial JSON
// - Output explanations, comments, or markdown

// ================================================================================
// MANDATORY RECONSTRUCTION RULES
// ================================================================================
// 1. Output MUST be **valid JSON**
// 2. Output MUST contain **ONLY editorData**
// 3. Exactly **ONE page**
// 4. Use **NUMERIC VALUES ONLY** for:
//    - x, y, width, height
// 5. Elements MUST NOT overlap
// 6. Maintain correct visual stacking order:
//    background → images → text → foreground
//    **FLATTEN ALL NESTING**: Extract ALL nested content as separate elements
//      - Text inside circles → separate text elements
//      - Images inside divs → separate image elements
//      - Multiple items in flex/grid → calculate absolute positions for each
//      - Calculate absolute coordinates: parent position + child offset
//      - NEVER skip nested content
// 7. Every element MUST include ALL required PostGrid properties
// 8. If a property is not applicable, KEEP its default value
// 9. Generate NEW, UNIQUE IDs for every element
// 10. ALL editor flags MUST be present:
//     - draggable
//     - selectable
//     - removable
//     - resizable
//     - visible
//     - showInExport
//     - styleEditable
// 11. NO HTML, NO CSS, NO comments, NO explanations

// ================================================================================
// LAYOUT STABILITY RULES (CRITICAL)
// ================================================================================
// - Respect padding and spacing implied by HTML
// - Preserve text alignment and grouping
// - Do NOT stretch text or images unnaturally
// - Avoid tight bounding boxes that may cause clipping
// - Ensure safe spacing between adjacent elements
// - Prefer balanced layouts over edge-aligned placement

// ================================================================================
// ELEMENT EXTRACTION REQUIREMENTS
// ================================================================================
// From the HTML, extract and reconstruct:
// - ALL visible text blocks
// - ALL images
// - ALL solid shapes or decorative elements
// - Background or framing elements if visually present

// ================================================================================
// NESTED CONTENT EXTRACTION (CRITICAL - MUST NOT BE SKIPPED)
// ================================================================================
// **FLATTENING NESTED ELEMENTS:**
// PostGrid does NOT support nested elements. ALL content must be in a FLAT array.

// **MANDATORY RULE:**
// When HTML has elements nested inside containers (e.g., text inside circles, images inside divs):
// 1. Extract the CONTAINER as one element (e.g., circle figure)
// 2. Extract EACH CHILD as a SEPARATE element at the SAME level
// 3. Position child elements using ABSOLUTE coordinates relative to canvas
// 4. Calculate child positions: parent_x + child_offset_x, parent_y + child_offset_y
// 5. NEVER skip nested content - ALL visible text and images MUST become elements

// **COMMON NESTING PATTERNS TO DETECT:**

// **Pattern 1: Text inside Circles/Shapes**
// HTML structure:
// <div style="circle styles...">
//   <div>Text 1</div>
//   <div>Text 2</div>
//   <div>Text 3</div>
// </div>

// PostGrid output:
// - ONE figure element (subType: "circle") for the circle
// - THREE separate text elements positioned INSIDE the circle bounds
// - Calculate text x/y by adding circle's x/y + text's offset from circle top-left

// **Pattern 2: Images inside Containers**
// HTML structure:
// "
// <div style="position:absolute; left:100px; top:50px;">
//   <img src="..." style="width:200px; height:150px;"/>
// </div>
// "

// PostGrid output:
// - ONE image element at x=100, y=50, width=200, height=150
// - NO separate div element (container is just positioning)

// **Pattern 3: Multiple Elements in Flex/Grid Containers**
// HTML structure:
// "
// <div style="display:flex; left:100px; top:200px; gap:20px;">
//   <div>Item 1</div>
//   <div>Item 2</div>
//   <div>Item 3</div>
// </div>
// "

// PostGrid output:
// - Calculate ABSOLUTE position for each item:
//   - Item 1: x = 100
//   - Item 2: x = 100 + item1_width + gap = 100 + width + 20
//   - Item 3: x = 100 + item1_width + gap + item2_width + gap
// - Extract each as SEPARATE element with absolute coordinates

// **EXTRACTION WORKFLOW FOR NESTED CONTENT:**

// STEP 1: Identify parent container position (left, top, right, bottom)
// STEP 2: For EACH child inside:
//   a) Calculate child's absolute position:
//      - child_x = parent_x + child's_left_offset
//      - child_y = parent_y + child's_top_offset
//   b) Apply scaling to final coordinates
//   c) Create separate element in children array

// STEP 3: Order elements by z-index:
//   - Parent shapes FIRST (backgrounds, circles, rectangles)
//   - Child content AFTER (text, images)

// **CRITICAL CHECKS:**
// □ Did I find ALL text inside shapes/containers?
// □ Did I extract nested images separately?
// □ Did I calculate absolute positions for all nested elements?
// □ Are text elements positioned INSIDE their parent circles/shapes?
// □ Did I apply scaling to nested element positions?

// **EXAMPLE: Circle with Text Inside**

// HTML (at 1500px × 972px canvas):
// "html
// <div style="position:absolute; left:120px; top:470px; width:220px; height:220px; border-radius:50%; background:#16b8b1;">
//   <div style="margin-top:8px; font-size:14px;">NEW PATIENT SPECIAL</div>
//   <div style="margin-top:10px; font-size:42px;">FREE</div>
//   <div style="margin-top:6px; font-size:18px;">WHITENING</div>
// </div>
// "

// PostGrid output (scaled to 600×408):
// scaleX = 600/1500 = 0.4, scaleY = 408/972 = 0.42

// 1. Circle figure:
//    - x = 120 × 0.4 = 48
//    - y = 470 × 0.42 = 197.4
//    - width = height = 220 × 0.4 = 88
//    - subType: "circle"

// 2. Text element 1 ("NEW PATIENT SPECIAL"):
//    - x = (120 + horizontal_center_offset) × 0.4 ≈ 48 + (88/2 - text_width/2)
//    - y = (470 + 8) × 0.42 ≈ 200.76
//    - fontSize = 14 × 0.4 = 5.6
//    - align: "center"

// 3. Text element 2 ("FREE"):
//    - x = (120 + horizontal_center_offset) × 0.4
//    - y = (470 + 8 + 14 + 10) × 0.42 ≈ 211
//    - fontSize = 42 × 0.4 = 16.8
//    - align: "center"

// 4. Text element 3 ("WHITENING"):
//    - x = (120 + horizontal_center_offset) × 0.4
//    - y = (470 + 8 + 14 + 10 + 42 + 6) × 0.42 ≈ 227
//    - fontSize = 18 × 0.4 = 7.2
//    - align: "center"

// **COMMON MISTAKES THAT CAUSE DISAPPEARED CONTENT:**
// ❌ Only extracting the circle, forgetting the text inside
// ❌ Not calculating absolute positions for nested elements
// ❌ Skipping flex/grid children
// ❌ Missing images inside divs
// ❌ Not applying scaling to nested element positions
// ❌ Wrong z-order (text behind shapes instead of in front)

// ================================================================================ 
// ELEMENT TYPE MAPPING & EXTRACTION RULES
// ================================================================================ 
// **TEXT ELEMENTS** → type: "text"
//   REQUIRED properties:
//   • text: exact content from HTML
//   • fontFamily: Extract from CSS font-family (use Google Fonts or web-safe fonts)
//     - If font-family contains multiple fonts, use the FIRST valid font
//     - Common mappings: Arial → "Arial", sans-serif → "Roboto", serif → "Merriweather"
//     - 'Brush Script MT','Segoe Script' → "Brush Script MT"
//     - cursive → "Comic Sans MS"
//   • fontSize: MUST BE SCALED from HTML
//     - Formula: fontSize_html × (600 / HTML_canvas_width)
//     - Example: 112px on 1800px canvas → 112 × (600/1800) = 37.33px
//   • fill: rgba format from CSS color (e.g., "rgba(71,88,103,1)")
//   • fontWeight: Extract exact value from CSS
//     - "normal" (400), "600", "700" (bold), "800", "900"
//     - Convert numeric weights: 600 → "600", 700 → "700", 800 → "800"
//   • fontStyle: "normal" or "italic"
//   • textDecoration: "" (empty string) or "underline"
//   • align: "left", "center", or "right" (extract from text-align)
//   • letterSpacing: MUST BE SCALED
//     - Formula: letterSpacing_html × (600 / HTML_canvas_width)
//     - Default: 0 if not specified
//   • lineHeight: Keep as ratio (e.g., 1.15, 1.2, 1.25) if specified as ratio



// **IMAGE ELEMENTS** → type: "image"
//   REQUIRED properties:
//   • src: full URL from HTML src or background-image
//   • width, height: numeric pixel dimensions
//   • keepRatio: true (always set to true)
//   • cropX, cropY, cropWidth, cropHeight: use 0, 0, 1, 1 for no cropping

// **SHAPE ELEMENTS** → type: "figure"
//   CRITICAL: Detect shapes from HTML/CSS properties:
  
//   **CIRCLES** (subType: "circle"):
//   • Trigger: border-radius ≥ 50% OR border-radius in px ≥ (width/2)
//   • Properties:
//     - fill: background-color as "rgba(R,G,B,A)"
//     - stroke: border-color as hex (default: "#0c0c0c")
//     - strokeWidth: border-width in px (default: 0)
//     - width, height: MUST be equal for perfect circles
//     - cornerRadius: 0 (circles don't use this property)
  
//   **RECTANGLES** (subType: "rect"):
//   • Trigger: <div>, <span> with background-color AND no image
//   • Properties:
//     - fill: background-color as "rgba(R,G,B,A)"
//     - stroke: border-color as hex
//     - strokeWidth: border-width in px
//     - cornerRadius: border-radius in px (for rounded rectangles)
//     - dash: [0] for solid, or extract from border-style if dashed

  
  
//   **EXTRACTION RULES FOR SHAPES:**
//   1. Check EVERY element with background-color, border, or border-radius
//   2. Elements with border-radius: 50% or high px values MUST become circles
//   3. Colored <div> containers without images MUST become rectangles
//   4. Extract exact RGB values from CSS (convert gradients to solid color)
//   5. Preserve stroke colors and widths from CSS borders

// **GUIDELINES** → type: "guideline"
//   • Only for safe zones and postal zones (12px and 24px margins)
//   • color: "rgba(R,G,B,0.3)" for semi-transparent guides

  
// ================================================================================
// DIMENSION EXTRACTION & SCALING WORKFLOW
// ================================================================================
// **STEP 1: Identify HTML Canvas Size**
// - Look for CSS variables: --canvas-w and --canvas-h
// - Or extract from #postcard div: width and height styles
// - Record: HTML_width and HTML_height

// **STEP 2: Calculate Scale Ratios**
// - scaleX = 600 / HTML_width
// - scaleY = 408 / HTML_height

// **STEP 3: For EACH Element in HTML:**
// 1. Extract original dimensions:
//    - position: absolute → get left, top, right (if used)
//    - width, height from inline styles
//    - font-size from inline styles

// 2. Convert to PostGrid coordinates:
//    - x = left × scaleX (or calculate from right if used)
//    - y = top × scaleY
//    - width = width_html × scaleX
//    - height = height_html × scaleY
//    - fontSize = fontSize_html × scaleX

// 3. Extract all font properties EXACTLY:
//    - font-family: use FIRST font in the stack
//    - font-weight: extract exact value (600, 700, 800, etc.)
//    - font-style: normal/italic
//    - color: convert to rgba(R,G,B,A) format
//    - line-height: keep as ratio (1.15, 1.2, 1.25)
//    - letter-spacing: scale by scaleX
//    - text-align: convert to "left"/"center"/"right"

// **STEP 4: Verify Scaled Output**
// - All x + width ≤ 600
// - All y + height ≤ 408
// - Font sizes look proportional
// - Spacing is preserved
// ================================================================================ 
// FONT & SHAPE EXTRACTION CHECKLIST (MANDATORY)
// ================================================================================ 
// Before generating output, you MUST:

// **For EVERY text element:**
// ☑ Extract font-family from CSS (first valid font in the stack)
// ☑ Extract font-weight (normal/bold)
// ☑ Extract font-style (normal/italic)
// ☑ Extract text-decoration (empty string or "underline")
// ☑ Convert font-size to numeric pixels
// ☑ Extract color as rgba() format
// ☑ Extract letter-spacing (default 0 if not specified)
// ☑ Extract line-height (default 1.2 if not specified)

// **For EVERY shape/background element:**
// ☑ Identify if it's a circle (border-radius ≥ 50%) → subType: "circle"
// ☑ Identify if it's a rectangle (has background-color) → subType: "rect"
// ☑ Extract fill color from background-color as rgba()
// ☑ Extract stroke color from border-color
// ☑ Extract strokeWidth from border-width (px value)
// ☑ For circles: ensure width === height
// ☑ Extract cornerRadius from border-radius for rectangles
// ☑ Check for dashed borders → set dash: [2, 1]

// **COMMON MISTAKES TO AVOID:**
// ❌ Ignoring font-weight/font-style from CSS
// ❌ Missing circles because border-radius wasn't checked
// ❌ Not converting background-color to rgba() format
// ❌ Forgetting to extract border properties for stroke/strokeWidth
// ❌ Using generic fonts instead of actual CSS font-family values

// ================================================================================
// OUTPUT FORMAT (EXACT — DO NOT WRAP)
// ================================================================================
// {
//   "audios": [],
//   "dpi": 72,
//   "fonts": [],
//   "height": 408,
//   "pages": [
//     {
//       "id": "generated_page_id",
//       "background": "white",
//       "bleed": 0,
//       "children": [ /* reconstructed elements */ ],
//       "duration": 5000,
//       "height": "auto",
//       "width": "auto"
//     }
//   ],
//   "unit": "px",
//   "width": 600
// }

// ================================================================================
// SAMPLE editorData (REFERENCE ONLY)
// ================================================================================
// ${metaData}


// ================================================================================
// JSON VALIDATION & STRUCTURE COMPLIANCE (CRITICAL)
// ================================================================================
// Before outputting the final JSON, you MUST perform these validation checks:

// **STRUCTURE VALIDATION:**
// 1. Verify the JSON follows the EXACT schema from the sample editorData:${metaData}
// 2. Check that ALL property names match the sample EXACTLY (case-sensitive)
// 3. Confirm no properties are misspelled or renamed
// 4. Ensure no extra properties are added that don't exist in the sample
// 5. Verify the nesting hierarchy matches: editorData → pages → children

// **REQUIRED TOP-LEVEL PROPERTIES:**
// ✓ audios (array)
// ✓ dpi (number)
// ✓ fonts (array)
// ✓ height (number: 408)
// ✓ pages (array with exactly 1 page object)
// ✓ unit (string: "px")
// ✓ width (number: 600)

// **REQUIRED PAGE PROPERTIES:**
// ✓ id (unique string)
// ✓ background (string)
// ✓ bleed (number: 0)
// ✓ children (array of element objects)
// ✓ duration (number: 5000)
// ✓ height (string: "auto")
// ✓ width (string: "auto")

// **REQUIRED ELEMENT PROPERTIES (check EVERY element in children array):**
// For ALL element types:
// ✓ id, name, type
// ✓ x, y, width, height (all numeric)
// ✓ rotation, opacity (numeric)
// ✓ draggable, selectable, removable, resizable, visible, showInExport, styleEditable (all boolean)
// ✓ alwaysOnTop, contentEditable (boolean)
// ✓ animations (array)
// ✓ blurEnabled, blurRadius, brightness, brightnessEnabled (blur/brightness properties)
// ✓ grayscaleEnabled, sepiaEnabled (filter properties)
// ✓ shadowEnabled, shadowBlur, shadowColor, shadowOffsetX, shadowOffsetY, shadowOpacity (shadow properties)

// For type: "text" elements:
// ✓ text, fontFamily, fontSize, fontStyle, fontWeight
// ✓ fill, align, verticalAlign, textDecoration
// ✓ letterSpacing, lineHeight
// ✓ placeholder
// ✓ backgroundColor, backgroundEnabled, backgroundOpacity, backgroundPadding, backgroundCornerRadius
// ✓ stroke, strokeWidth

// For type: "image" elements:
// ✓ src, keepRatio
// ✓ cropX, cropY, cropWidth, cropHeight
// ✓ flipX, flipY
// ✓ borderColor, borderSize, cornerRadius, clipSrc

// For type: "figure" elements:
// ✓ subType ("circle" or "rect")
// ✓ fill, stroke, strokeWidth
// ✓ cornerRadius, dash

// For type: "guideline" elements:
// ✓ color

// **SPELLING CHECK (COMMON MISTAKES):**
// ❌ "colour" → ✓ "color"
// ❌ "fontsize" → ✓ "fontSize"
// ❌ "fontstyle" → ✓ "fontStyle"
// ❌ "fontweight" → ✓ "fontWeight"
// ❌ "textalign" → ✓ "align"
// ❌ "backgroundcolor" → ✓ "backgroundColor"
// ❌ "bordercolor" → ✓ "borderColor"
// ❌ "shadowcolor" → ✓ "shadowColor"
// ❌ "editableContent" → ✓ "contentEditable"
// ❌ "isVisible" → ✓ "visible"
// ❌ "canDrag" → ✓ "draggable"
// ❌ "canSelect" → ✓ "selectable"
// ❌ "canRemove" → ✓ "removable"
// ❌ "canResize" → ✓ "resizable"

// **SELF-CHECK BEFORE OUTPUT:**
// □ Every property name matches the sample editorData exactly
// □ No camelCase errors (e.g., fontfamily vs fontFamily)
// □ All numeric properties are numbers, not strings
// □ All boolean properties are true/false, not "true"/"false"
// □ All required properties exist for each element type
// □ No undefined or null values where not allowed
// □ Array properties are arrays [], not objects {}
// □ The JSON is valid and parseable
// □ **ALL NESTED CONTENT HAS BEEN EXTRACTED (text inside circles, images inside divs, flex children)**
// □ **Text elements positioned correctly INSIDE their parent shapes**
// □ **Z-order is correct (shapes first, then text on top)**
// □ **No visible content from HTML is missing in the output**

// **IF VALIDATION FAILS:**
// - DO NOT output invalid JSON
// - Review the sample editorData structure again
// - Regenerate the element with correct property names
// - Ensure all required properties are present

// ================================================================================
// HTML INPUT (SOURCE OF TRUTH)
// ================================================================================
// ${html}
// `

// core working
// const systemPrompts = `# PostGrid EditorData Reconstruction Engine - IMPROVED PROMPT

// ================================================================================
// ABSOLUTE CONTEXT (NON-NEGOTIABLE)
// ================================================================================
// - This output is for a **PRINT POSTCARD**, NOT a website, NOT a UI mockup.
// - The PostGrid editor consumes a strict JSON schema named **editorData**.
// - At input time, **editorData DOES NOT EXIST** and must be generated from scratch.
// - Any deviation from PostGrid schema rules is a FAILURE.

// ================================================================================
// CRITICAL: THREE-STAGE GENERATION PROCESS
// ================================================================================
// To ensure accuracy, you MUST follow this three-stage process:

// **STAGE 1: ANALYSIS & PLANNING**
// 1. Extract HTML canvas dimensions from CSS variables or container
// 2. Calculate scaling ratios (scaleX, scaleY)
// 3. Identify ALL visual elements (text, images, shapes, backgrounds)
// 4. Map nested structures and calculate absolute positions
// 5. Plan z-order (background → images → shapes → text)

// **STAGE 2: GENERATION**
// 1. Generate complete editorData JSON
// 2. Apply scaling to ALL dimensions
// 3. Extract ALL font properties accurately
// 4. Detect and create ALL shape elements
// 5. Ensure proper element ordering

// EDITOR INTERACTIVITY (CRITICAL)**
// For ALL elements, set these properties for proper editor functionality:
// - "contentEditable": true  // MUST be true for text elements to be editable
// - "draggable": true
// - "selectable": true
// - "removable": true
// - "resizable": true
// - "visible": true
// - "showInExport": true
// - "styleEditable": true

// **CRITICAL**: contentEditable MUST be true for text elements, otherwise users cannot edit text in the PostGrid editor.
// ================================================================================
// MINIMUM FONT SIZE WITH PROPORTIONAL ADJUSTMENT (CRITICAL, PRINT READABILITY)
// ================================================================================
// **RULE: Absolute minimum fontSize is 14px**

// **STEP-BY-STEP PROCESS:**

// 1. **Calculate scaled fontSize:**
//    fontSize_scaled = fontSize_html × scaleX

// 2. **Apply minimum if needed:**
//    If fontSize_scaled < 14:
//      fontSize_final = 14
//    Else:
//      fontSize_final = fontSize_scaled

// 3. **Adjust bounding box proportionally:**
//    If fontSize was increased to meet minimum:
//      - Calculate ratio: adjustment_ratio = 14 / fontSize_scaled
//      - Increase width: width_final = width_scaled × adjustment_ratio
//      - Increase height: height_final = height_scaled × adjustment_ratio
//      - Keep x, y positions the same (don't move element)

// **EXAMPLES:**

// Example 1 - Small text (needs minimum):
// HTML: fontSize=36px, width=740px, height=50px
// Scaled: 36 × 0.3992 = 14.36px, width=295.2px, height=19.96px
// ✅ fontSize ≥ 14px → Use as is

// Example 2 - Tiny text (needs minimum + adjustment):
// HTML: fontSize=20px, width=400px, height=30px  
// Scaled: 20 × 0.3992 = 7.98px, width=159.68px, height=11.97px
// ❌ fontSize < 14px → Apply minimum
// Final: fontSize=14px
// Adjustment ratio: 14 / 7.98 = 1.754
// Adjusted width: 159.68 × 1.754 = 280px
// Adjusted height: 11.97 × 1.754 = 21px

// Example 3 - Large headline (keep scaled):
// HTML: fontSize=200px, width=740px, height=180px
// Scaled: 200 × 0.3992 = 79.84px, width=295.2px, height=71.86px  
// ✅ fontSize ≥ 14px → Use as is (79.84px is HUGE and correct)

// **CRITICAL:**
// - Large fonts (>35px after scaling) → ALWAYS use scaled value
// - Medium fonts (14-35px after scaling) → Use scaled value
// - Small fonts (<14px after scaling) → Use 14px + adjust box size proportionally

// ========================================================

// **STAGE 3: VALIDATION & CORRECTION**
// Before outputting, perform these checks:
// □ JSON schema matches sample editorData EXACTLY
// □ All required properties present for each element type
// □ No spelling mistakes in property names
// □ All numeric values are numbers, not strings
// □ All boolean values are true/false, not strings
// □ Scaling applied correctly to all dimensions
// □ Font sizes scaled using scaleX ratio
// □ No elements outside canvas bounds (0-600px width, 0-408px height)
// □ Visual hierarchy preserved
// □ ALL nested content extracted as separate elements
// □ Text colors match HTML exactly
// □ Background colors match HTML exactly

// If validation fails, regenerate the affected elements.

// ================================================================================
// CANVAS (LOCKED — MUST BE RESPECTED)
// ================================================================================
// - PostGrid Canvas: **600px × 408px** (FIXED, NEVER CHANGE)
// - Unit: px
// - Do NOT exceed canvas bounds
// - Do NOT place elements outside the visible area

// ================================================================================
// SCALING & DIMENSION CONVERSION (CRITICAL - MUST FOLLOW)
// ================================================================================

// **STEP 1: IDENTIFY HTML CANVAS DIMENSIONS**

// Extract from HTML:
// - CSS variables: "--canvas-w" and "--canvas-h"
// - OR from "#postcard" element: width and height styles
// - Example: "<div id="postcard" style="width:1503px;height:1021px">"
//   → HTML canvas = 1503px × 1021px

// **STEP 2: CALCULATE SCALING RATIOS**
// "
// scaleX = 600 / HTML_canvas_width
// scaleY = 408 / HTML_canvas_height
// "

// Example:
// - HTML canvas: 1503px × 1021px
// - scaleX = 600 / 1503 = 0.3992
// - scaleY = 408 / 1021 = 0.3996

// **STEP 3: APPLY SCALING TO EVERY DIMENSION**

// For each element:
// "
// x_postgrid = x_html × scaleX
// y_postgrid = y_html × scaleY
// width_postgrid = width_html × scaleX
// height_postgrid = height_html × scaleY
// fontSize_postgrid = fontSize_html × scaleX  (ALWAYS use scaleX for fonts)
// letterSpacing_postgrid = letterSpacing_html × scaleX
// padding_postgrid = padding_html × scaleX
// "

// **CRITICAL FONT SIZE RULE:**
// - ALWAYS use scaleX for font sizes (not scaleY)
// - fontSize_postgrid = fontSize_html × (600 / HTML_canvas_width)
// - Example: 150px font on 1503px canvas → 150 × 0.3992 = 59.88px

// **VALIDATION CHECKS:**
// After scaling, verify:
// - No x > 600
// - No y > 408
// - No (x + width) > 600
// - No (y + height) > 408
// - Font sizes proportionally correct
// - Visual spacing preserved

// ================================================================================
// VISUAL ACCURACY REQUIREMENTS (CRITICAL)
// ================================================================================

// **MULTI-LINE TEXT HANDLING:**
// When HTML shows text stacked vertically (e.g., "HEALTHY\nHAPPY\nSMILES!"):
// 1. Extract each line as shown in the design
// 2. Join with "\n" in the text property
// 3. Calculate correct lineHeight ratio from HTML
// 4. Adjust element height to accommodate all lines
// 5. Preserve visual appearance exactly

// When HTML has multiple text divs with DIFFERENT font sizes, create SEPARATE text elements:

// ❌ WRONG (combining):
// <div style="font-size:44px;">Text 1</div>
// <div style="font-size:170px;">Text 2</div>
// → ONE element with combined text

// ✅ CORRECT (separating):
// <div style="font-size:44px;">Text 1</div>
// <div style="font-size:170px;">Text 2</div>
// → TWO separate elements, each with its own fontSize

// Example:
// HTML:
// <div style="font-size:44px; line-height:44px;">Text 1</div>
// <div style="font-size:170px; line-height:150px;">Text 2</div>
// <div style="font-size:140px; line-height:130px;">Text 3</div>

// Generate:
// Element 1: {text: "Text 1", fontSize: 17.56}  // 44 × 0.3992
// Element 2: {text: "Text 2,", fontSize: 67.84}         // 170 × 0.3992
// Element 3: {text: "Text 3", fontSize: 55.88}         // 140 × 0.3992

// ONLY combine when font sizes are THE SAME.

// **COLOR ACCURACY:**
// - Extract EXACT colors from HTML/CSS
// - Convert to rgba format: "rgba(R,G,B,A)"
// - Do NOT approximate or change colors
// - Verify: Pink text in HTML → Pink text in output
// - Verify: Purple text in HTML → Purple text in output
// - Verify: Teal background in HTML → Teal background in output

// **GRADIENT TEXT HANDLING:**
// - PostGrid does NOT support CSS gradients in text
// - If HTML has gradient text (background-clip:text), extract the PRIMARY color from the gradient
// - Example: linear-gradient(90deg,#d1539a 0%,#6c4bd3 100%) → use "rgba(209,83,154,1)" (first color)
// - NEVER use rgba(0,0,0,0) for gradient text

// **ELEMENT DETECTION:**
// Detect and create elements for:
// - ALL text blocks (even small disclaimer text)
// - ALL images
// - ALL background colors (as figure/rect)
// - ALL circles (border-radius ≥ 50%)
// - ALL decorative shapes
// - Dotted dividers (as figure with dash property)

// ================================================================================
// NESTED CONTENT EXTRACTION (CRITICAL)
// ================================================================================

// **FLATTENING RULE:**
// PostGrid does NOT support nested elements. ALL content must be in a FLAT array.

// **EXTRACTION PROCESS:**

// 1. **Identify parent container** (div, flex, grid)
//    - Record: parent_x, parent_y, parent_width, parent_height

// 2. **For EACH child inside parent:**
//    - Calculate absolute position:
//      "
//      child_x = parent_x + child_offset_x
//      child_y = parent_y + child_offset_y
//    - Apply scaling to final coordinates
//    - Create separate element in children array

// 3. **Order by z-index:**
//    - Background shapes FIRST
//    - Images MIDDLE
//    - Text LAST (on top)

// **COMMON PATTERNS:**

// **Pattern 1: Flex container with multiple columns**
// "html
// <div style="display:flex; left:0; top:560px; height:170px;">
//   <div style="flex:1">Column 1 content</div>
//   <div style="flex:1">Column 2 content</div>
//   <div style="flex:1">Column 3 content</div>
//   <div style="flex:1">Column 4 content</div>
// </div>
// "

// Extract:
// 1. Background rectangle (if colored)
// 2. Calculate each column width: total_width / 4
// 3. Position each column: col1_x=0, col2_x=col1_width, col3_x=col1_width*2, etc.
// 4. Extract ALL text from each column as separate text elements

// **Pattern 2: Text inside circles**
// "html
// <div style="circle styles">
//   <div>Text 1</div>
//   <div>Text 2</div>
// </div>
// "

// Extract:
// 1. Circle figure element
// 2. Each text element positioned INSIDE circle bounds
// 3. Center-align text within circle

// **Pattern 3: Logo + text group**
// "html
// <div style="display:flex; align-items:center;">
//   <img src="logo.jpg"/>
//   <div>
//     <div>Company Name</div>
//     <div>Website</div>
//   </div>
// </div>
// "

// Extract:
// 1. Image element at calculated position
// 2. Company name text at calculated position
// 3. Website text at calculated position

// ================================================================================
// ELEMENT TYPE MAPPING & PROPERTY EXTRACTION
// ================================================================================

// **TEXT ELEMENTS** → type: "text"

// REQUIRED properties with EXACT extraction rules:

// "json
// {
//   "id": "unique_id",
//   "name": "Descriptive name",
//   "type": "text",
//   "x": 0,  // scaled
//   "y": 0,  // scaled
//   "width": 0,  // scaled
//   "height": 0,  // scaled, accommodate all lines
//   "rotation": 0,
//   "opacity": 1,
//   "draggable": true,
//   "selectable": true,
//   "removable": true,
//   "resizable": true,
//   "visible": true,
//   "showInExport": true,
//   "styleEditable": true,
//   "alwaysOnTop": false,
//   "contentEditable": false,
//   "animations": [],
//   "blurEnabled": false,
//   "blurRadius": 0,
//   "brightness": 1,
//   "brightnessEnabled": false,
//   "grayscaleEnabled": false,
//   "sepiaEnabled": false,
//   "shadowEnabled": false,
//   "shadowBlur": 0,
//   "shadowColor": "#000000",
//   "shadowOffsetX": 0,
//   "shadowOffsetY": 0,
//   "shadowOpacity": 1,
  
//   // TEXT-SPECIFIC (CRITICAL):
//   "text": "Exact text from HTML",  // use \n for line breaks
//   "fontFamily": "Arial",  // extract FIRST font from CSS font-family
//   "fontSize": 0,  // MUST be scaled using scaleX
//   "fontStyle": "normal",  // or "italic"
//   "fontWeight": "700",  // extract EXACT value: "normal", "600", "700", "800", "900"
//   "fill": "rgba(200,74,161,1)",  // EXACT color from HTML as rgba
//   "align": "center",  // "left", "center", or "right"
//   "verticalAlign": "top",
//   "textDecoration": "",  // empty string or "underline"
//   "letterSpacing": 0,  // scaled from HTML
//   "lineHeight": 1.2,  // ratio from HTML (line-height / font-size)
//   "placeholder": "",
//   "backgroundColor": "rgba(0,0,0,0)",
//   "backgroundEnabled": false,
//   "backgroundOpacity": 1,
//   "backgroundPadding": 0,
//   "backgroundCornerRadius": 0,
//   "stroke": "rgba(0,0,0,0)",
//   "strokeWidth": 0
// }
// "

// **FONT EXTRACTION RULES:**

// 1. **fontFamily:**
//    - From CSS: "font-family: 'Roboto', Arial, sans-serif"
//    - Use FIRST valid font: "Roboto"
//    - Common mappings:
//      - Arial → "Arial"
//      - Helvetica → "Helvetica"
//      - sans-serif → "Roboto"
//      - serif → "Merriweather"
//      - 'Brush Script MT' → "Brush Script MT"
//      - cursive → "Comic Sans MS"

// 2. **fontWeight:**
//    - Extract EXACT numeric or keyword value
//    - "normal" → "normal" (400)
//    - "bold" → "700"
//    - 600 → "600"
//    - 700 → "700"
//    - 800 → "800"
//    - 900 → "900"

// 3. **fontSize:**
//    - Extract from HTML (in px)
//    - SCALE using scaleX: fontSize_html × scaleX
//    - Example: 150px → 150 × 0.3992 = 59.88px

// 4. **fill (text color):**
//    - From CSS color property
//    - Convert to rgba format
//    - #c84aa1 → "rgba(200,74,161,1)"
//    - #5e3aa8 → "rgba(94,58,168,1)"

// 5. **lineHeight:**
//    - FORMULA: lineHeight = line-height_px ÷ font-size_px (NO SCALING)
//    - Example: 28px ÷ 20px = 1.4, NOT 1.2
//    - Default: 1.2 (only if HTML has no line-height)

// 6. **letterSpacing:**
//    - EXTRACT from HTML, then SCALE: letterSpacing_html × scaleX
//    - Example: 1px × 0.3992 = 0.4px
//    - Default: 0 (only if HTML has no letter-spacing)

// **IMAGE ELEMENTS** → type: "image"

// "json
// {
//   "id": "unique_id",
//   "name": "Descriptive name",
//   "type": "image",
//   "x": 0,
//   "y": 0,
//   "width": 0,
//   "height": 0,
//   // ... all common properties ...
//   "src": "https://full-url-from-html.jpg",
//   "keepRatio": true,
//   "cropX": 0,
//   "cropY": 0,
//   "cropWidth": 1,
//   "cropHeight": 1,
//   "flipX": false,
//   "flipY": false,
//   "borderColor": "#000000",
//   "borderSize": 0,
//   "cornerRadius": 0,
//   "clipSrc": ""
// }
// "

// **SHAPE ELEMENTS** → type: "figure"

// **CIRCLE DETECTION:**
// Triggers:
// - border-radius: 50% OR
// - border-radius: XXpx where XX ≥ (width/2) OR
// - CSS explicitly creates circular shape

// "json
// {
//   "id": "unique_id",
//   "name": "Descriptive name",
//   "type": "figure",
//   "subType": "circle",
//   "x": 0,
//   "y": 0,
//   "width": 88,  // MUST equal height for perfect circle
//   "height": 88,
//   // ... all common properties ...
//   "fill": "rgba(0,174,179,1)",  // background-color
//   "stroke": "#000000",  // border-color
//   "strokeWidth": 0,  // border-width in px
//   "cornerRadius": 0,  // NOT used for circles
//   "dash": [0]  // solid line
// }
// "

// **RECTANGLE DETECTION:**
// Triggers:
// - <div> with background-color OR
// - Colored container without image OR
// - Explicit background/shape element

// "json
// {
//   "id": "unique_id",
//   "name": "Descriptive name",
//   "type": "figure",
//   "subType": "rect",
//   "x": 0,
//   "y": 0,
//   "width": 0,
//   "height": 0,
//   // ... all common properties ...
//   "fill": "rgba(0,174,179,1)",  // background-color
//   "stroke": "#000000",  // border-color
//   "strokeWidth": 0,  // border-width
//   "cornerRadius": 0,  // border-radius for rounded corners
//   "dash": [0]  // [0] for solid, [2,1] for dashed
// }
// "

// **DOTTED DIVIDERS:**
// For CSS: "border-right: 4px dotted rgba(255,255,255,0.6)"

// Create thin rectangle with:
// "json
// {
//   "subType": "rect",
//   "fill": "rgba(255,255,255,0.6)",
//   "width": 4,  // scaled border width
//   "dash": [2, 1]  // creates dotted effect
// }
// "

// ================================================================================
// JSON SCHEMA VALIDATION (MANDATORY)
// ================================================================================

// **BEFORE OUTPUTTING, CHECK EVERY ELEMENT:**

// ✓ Property names match sample editorData EXACTLY (case-sensitive)
// ✓ No misspellings:
//   - "fontFamily" not "fontfamily"
//   - "fontSize" not "fontsize"
//   - "fontWeight" not "fontweight"
//   - "backgroundColor" not "backgroundcolor"
//   - "contentEditable" not "editableContent"
// ✓ All numeric properties are numbers: 10 not "10"
// ✓ All boolean properties are booleans: true not "true"
// ✓ All required properties present
// ✓ No extra properties not in sample
// ✓ Array properties are arrays: [] not {}

// **COMMON PROPERTY MISTAKES TO AVOID:**

// ❌ Missing properties (blurEnabled, shadowEnabled, etc.)
// ❌ Wrong data types (string instead of number)
// ❌ Misspelled property names
// ❌ Wrong structure (nested instead of flat)
// ❌ Missing text-specific properties for text elements
// ❌ Missing image-specific properties for image elements
// ❌ Wrong subType value for figures

// ================================================================================
// COMPLETE EXTRACTION CHECKLIST
// ================================================================================

// **STAGE 1: PRE-GENERATION CHECKLIST**

// □ Identified HTML canvas dimensions
// □ Calculated scaleX and scaleY
// □ Identified ALL text elements in HTML
// □ Identified ALL images in HTML
// □ Identified ALL background colors
// □ Identified ALL circles (border-radius checks)
// □ Identified ALL rectangles
// □ Identified ALL nested content
// □ Planned z-order (backgrounds → images → shapes → text)
// □ Planned element extraction order

// **STAGE 2: GENERATION CHECKLIST**

// For EACH element:
// □ Generated unique ID
// □ Applied correct scaling to x, y, width, height
// □ Extracted font properties accurately
// □ Extracted colors in rgba format
// □ Calculated correct lineHeight ratio
// □ Scaled fontSize using scaleX
// □ Scaled letterSpacing using scaleX
// □ Set all required boolean flags
// □ Set all required default values
// □ Used correct element type
// □ Used correct subType for figures

// **STAGE 3: POST-GENERATION VALIDATION**

// □ JSON is valid and parseable
// □ All property names spelled correctly
// □ All required properties present for each element type
// □ All numeric values are numbers, not strings
// □ All boolean values are booleans, not strings
// □ No elements outside canvas bounds (0-600, 0-408)
// □ Font sizes look proportional
// □ Colors match HTML exactly
// □ Multi-line text uses \n correctly
// □ Visual hierarchy preserved
// □ ALL nested content extracted
// □ No missing text from HTML
// □ No missing images from HTML
// □ No missing shapes from HTML

// **IF ANY CHECK FAILS:**
// Stop and regenerate the affected elements correctly.

// ================================================================================
// OUTPUT FORMAT
// ================================================================================

// Output ONLY the complete, valid editorData JSON:

// "json
// {
//   "audios": [],
//   "dpi": 72,
//   "fonts": [],
//   "height": 408,
//   "pages": [
//     {
//       "id": "page_1",
//       "background": "white",
//       "bleed": 0,
//       "children": [
//         // ALL extracted elements here, properly scaled and validated
//       ],
//       "duration": 5000,
//       "height": "auto",
//       "width": "auto"
//     }
//   ],
//   "unit": "px",
//   "width": 600
// }
// "

// NO markdown fences, NO explanations, NO comments - ONLY JSON.

// ================================================================================
// CRITICAL REMINDERS
// ================================================================================

// 1. **SCALING:** Every dimension MUST be scaled. Font sizes MUST use scaleX.
// 2. **COLORS:** Extract EXACT colors from HTML. Use rgba format.
// 3. **MULTI-LINE TEXT:** Use \n for line breaks. Calculate correct lineHeight.
// 4. **NESTED CONTENT:** Extract ALL nested elements as separate flat elements.
// 5. **SCHEMA:** Match sample editorData structure EXACTLY. No typos allowed.
// 6. **VALIDATION:** Check EVERY property before output. Fix any errors.
// 7. **VISUAL ACCURACY:** Output must look IDENTICAL to HTML input.

// ================================================================================
// BEGIN RECONSTRUCTION
// ================================================================================

// Extract HTML canvas dimensions, calculate scaling, and generate complete editorData JSON following ALL rules above.


// - REFERENCE SCHEMA: ${JSON.stringify(metaData)}
// `;


//**lineHeight (CRITICAL - Extract from HTML):**

// const systemPrompt3 = `# PostGrid EditorData Reconstruction Engine - IMPROVED PROMPT

// ================================================================================
// ABSOLUTE CONTEXT (NON-NEGOTIABLE)
// ================================================================================
// - This output is for a **PRINT POSTCARD**, NOT a website, NOT a UI mockup.
// - The PostGrid editor consumes a strict JSON schema named **editorData**.
// - At input time, **editorData DOES NOT EXIST** and must be generated from scratch.
// - Any deviation from PostGrid schema rules is a FAILURE.

// ================================================================================
// CRITICAL: THREE-STAGE GENERATION PROCESS
// ================================================================================
// To ensure accuracy, you MUST follow this three-stage process:

// **STAGE 1: ANALYSIS & PLANNING**
// 1. Extract HTML canvas dimensions from CSS variables or container
// 2. Calculate scaling ratios (scaleX, scaleY)
// 3. Identify ALL visual elements (text, images, shapes, backgrounds)
// 4. Map nested structures and calculate absolute positions
// 5. Plan z-order (background → images → shapes → text)

// **STAGE 2: GENERATION**
// 1. Generate complete editorData JSON
// 2. Apply scaling to ALL dimensions
// 3. Extract ALL font properties accurately
// 4. Detect and create ALL shape elements
// 5. Ensure proper element ordering

// EDITOR INTERACTIVITY (CRITICAL)**
// For ALL elements, set these properties for proper editor functionality:
// - "contentEditable": true  // MUST be true for text elements to be editable
// - "draggable": true
// - "selectable": true
// - "removable": true
// - "resizable": true
// - "visible": true
// - "showInExport": true
// - "styleEditable": true

// **CRITICAL**: contentEditable MUST be true for text elements, otherwise users cannot edit text in the PostGrid editor.


// **STAGE 3: VALIDATION & CORRECTION**
// Before outputting, perform these checks:
// □ JSON schema matches sample editorData EXACTLY
// □ All required properties present for each element type
// □ No spelling mistakes in property names
// □ All numeric values are numbers, not strings
// □ All boolean values are true/false, not strings
// □ Scaling applied correctly to all dimensions
// □ Font sizes scaled using scaleX ratio
// □ No elements outside canvas bounds (0-600px width, 0-408px height)
// □ Visual hierarchy preserved
// □ ALL nested content extracted as separate elements
// □ Text colors match HTML exactly
// □ Background colors match HTML exactly

// If validation fails, regenerate the affected elements.

// ================================================================================
// CANVAS (LOCKED — MUST BE RESPECTED)
// ================================================================================
// - PostGrid Canvas: **600px × 408px** (FIXED, NEVER CHANGE)
// - Unit: px
// - Do NOT exceed canvas bounds
// - Do NOT place elements outside the visible area

// ================================================================================
// SCALING & DIMENSION CONVERSION (CRITICAL - MUST FOLLOW)
// ================================================================================

// **STEP 1: IDENTIFY HTML CANVAS DIMENSIONS**

// Extract from HTML:
// - CSS variables: "--canvas-w" and "--canvas-h"
// - OR from "#postcard" element: width and height styles
// - Example: "<div id="postcard" style="width:1503px;height:1021px">"
//   → HTML canvas = 1503px × 1021px

// **STEP 2: CALCULATE SCALING RATIOS**
// "
// scaleX = 600 / HTML_canvas_width
// scaleY = 408 / HTML_canvas_height
// "

// Example:
// - HTML canvas: 1503px × 1021px
// - scaleX = 600 / 1503 = 0.3992
// - scaleY = 408 / 1021 = 0.3996

// **STEP 3: APPLY SCALING TO EVERY DIMENSION**

// For each element:
// "
// x_postgrid = x_html × scaleX
// y_postgrid = y_html × scaleY
// width_postgrid = width_html × scaleX
// height_postgrid = height_html × scaleY
// fontSize_postgrid = fontSize_html × scaleX  (ALWAYS use scaleX for fonts)
// letterSpacing_postgrid = letterSpacing_html × scaleX
// padding_postgrid = padding_html × scaleX
// "

// **CRITICAL FONT SIZE RULE:**
// - ALWAYS use scaleX for font sizes (not scaleY)
// - fontSize_postgrid = fontSize_html × (600 / HTML_canvas_width)
// - Example: 150px font on 1503px canvas → 150 × 0.3992 = 59.88px

// **VALIDATION CHECKS:**
// After scaling, verify:
// - No x > 600
// - No y > 408
// - No (x + width) > 600
// - No (y + height) > 408
// - Font sizes proportionally correct
// - Visual spacing preserved

// ================================================================================
// VISUAL ACCURACY REQUIREMENTS (CRITICAL)
// ================================================================================

// **CRITICAL: SEPARATE TEXT ELEMENTS RULE**

// When extracting text from HTML, you MUST create SEPARATE elements for:
// 1. Different font sizes
// 2. Different colors
// 3. Different containers (divs)
// 4. Different visual purposes (headline vs body vs disclaimer)

// **IDENTIFICATION PROCESS:**

// For EACH text div in HTML:
// 1. Check font-size in inline style
// 2. Check parent container's position
// 3. If font-size OR container OR visual purpose differs → CREATE SEPARATE ELEMENT

// **EXAMPLES:**

// ❌ WRONG - Combining different sizes:
// "html
// Heading 1
// Heading 2
// Heading 3
// "
// Where X is any large value (50px, 86px, 100px, 200px, etc.)

// AI creates: ONE element {text: "Heading 1\nHeading 2\nHeading 3"}
// ❌ This loses visual impact because they're in DIFFERENT containers!

// ✅ CORRECT - Separate elements:
// "html
// Heading 1
// Heading 2
// Heading 3
// "
// AI creates: THREE separate elements, each with correct scaled fontSize
// ✅ Preserves visual hierarchy!

// ❌ WRONG - Combining multi-line with different sizes:
// "html
// Large Price
// Medium Subtitle
// Small Disclaimer
// "
// Where L > M > S (e.g., L=120, M=16, S=12 OR L=200, M=24, S=14, etc.)

// AI creates: ONE element with all text at same size
// ❌ Destroys the design!

// ✅ CORRECT - Separate by size:
// "html
// Large Price
// Medium Subtitle
// Small Disclaimer
// "
// AI creates: THREE elements with proportional sizes after scaling
// ✅ Large headline stays large!

// **WHEN TO COMBINE TEXT (RARE):**

// Only combine when ALL these are true:
// - ✅ Same exact font-size
// - ✅ Same exact color
// - ✅ Same parent container
// - ✅ Vertically stacked (not side-by-side)
// - ✅ Same visual purpose (all headlines OR all body text)

// Example where combining IS correct:
// "html

//   Line 1
//   Line 2
//   Line 3

// "
// Where N is any value, CCC is any color
// → ONE element: {text: "Line 1\nLine 2\nLine 3", fontSize: N × scaleX}
// (Apply 14px minimum if N × scaleX < 14)

// **MINIMUM FONT SIZE WITH SMART ADJUSTMENT:**

// After separating elements correctly:

// 1. **Calculate scaled fontSize:**
//    "
//    fontSize_scaled = fontSize_html × scaleX
//    "

// 2. **Apply 14px minimum ONLY to small text:**
//    "
//    If fontSize_scaled < 14:
//      fontSize_final = 14
//      adjustment_ratio = 14 / fontSize_scaled
//      width_final = width_scaled × adjustment_ratio
//      height_final = height_scaled × adjustment_ratio
//    Else:
//      fontSize_final = fontSize_scaled
//      width_final = width_scaled
//      height_final = height_scaled
//    "

// 3. **CRITICAL - Size Categories:**
//    Given scaleX ratio and original HTML font size:
   
//    - **Large fonts:** If (fontSize_html × scaleX) > 40px
//      → Use EXACT scaled value, NO minimum applied
//      → These are headlines, banners, hero text
   
//    - **Medium fonts:** If 14 ≤ (fontSize_html × scaleX) ≤ 40px
//      → Use EXACT scaled value
//      → These are body text, labels, normal text
   
//    - **Small fonts:** If (fontSize_html × scaleX) < 14px
//      → Apply 14px minimum + proportional box adjustment
//      → These are disclaimers, fine print, footnotes

// **UNIVERSAL EXTRACTION ALGORITHM:**

// **STEP 1: Scan ALL text in HTML**
// Walk through EVERY div, span, p, h1-h6 element that contains text.

// **STEP 2: For EACH text element found, check:**
// "
// Does it have a different font-size than the previous element?
//   → YES: Create NEW element
//   → NO: Check next condition

// Is it in a different positioned container (position:absolute/relative)?
//   → YES: Create NEW element
//   → NO: Check next condition

// Does it have a different color?
//   → YES: Create NEW element
//   → NO: Can combine with previous if ALL other properties match
// "

// **STEP 3: Apply scaling formula**
// "
// For ANY font size found in HTML:
  
//   fontSize_scaled = fontSize_html × scaleX
  
//   If fontSize_scaled >= 14:
//     fontSize_final = fontSize_scaled
//     width_final = width_scaled
//     height_final = height_scaled
  
//   If fontSize_scaled < 14:
//     fontSize_final = 14
//     adjustment_ratio = 14 / fontSize_scaled
//     width_final = width_scaled × adjustment_ratio
//     height_final = height_scaled × adjustment_ratio
// "

// **STEP 4: Extract spacing**
// "
// lineHeight_ratio = line-height_px ÷ font-size_px
// letterSpacing_scaled = letterSpacing_px × scaleX
// "

// **REAL-WORLD PATTERN EXAMPLES:**

// Pattern A: Multiple headings at different positions
// "html
// Text A
// Text B
// Text C
// "
// Result: 3 SEPARATE elements (different containers, even if same size)

// Pattern B: Nested offer block
// "html

//   Large
//   Medium
//   Small

// "
// Result: 3 SEPARATE elements (different sizes)

// Pattern C: Same-size stacked lines
// "html

//   Line 1
//   Line 2

// "
// Result: 1 COMBINED element {text: "Line 1\nLine 2"} (same size, same color, same container)

// **COLOR ACCURACY:**
// - Extract EXACT colors from HTML/CSS
// - Convert to rgba format: "rgba(R,G,B,A)"
// - Do NOT approximate or change colors

// **GRADIENT HANDLING:**
// - PostGrid does NOT support CSS gradients
// - Extract first color from gradient for solid fill
// - Example: linear-gradient(90deg,#d1539a 0%,#6c4bd3 100%) → "rgba(209,83,154,1)"

// **SPACING EXTRACTION:**

// **lineHeight (ratio, not scaled):**
// "
// lineHeight = line-height_px ÷ font-size_px
// Example: 32px ÷ 28px = 1.14 (NOT 1.2)
// Default: 1.2 (only if HTML has no line-height)
// "

// **letterSpacing (extracted then scaled):**
// "
// letterSpacing_final = letterSpacing_html × scaleX
// Example: 2px × 0.3992 = 0.8px
// Default: 0 (only if HTML has no letter-spacing)
// "

// ================================================================================
// ================================================================================
// NESTED CONTENT EXTRACTION (CRITICAL)
// ================================================================================

// **FLATTENING RULE:**
// PostGrid does NOT support nested elements. ALL content must be in a FLAT array.

// **EXTRACTION PROCESS:**

// 1. **Identify parent container** (div, flex, grid)
//    - Record: parent_x, parent_y, parent_width, parent_height

// 2. **For EACH child inside parent:**
//    - Calculate absolute position:
//      "
//      child_x = parent_x + child_offset_x
//      child_y = parent_y + child_offset_y
//    - Apply scaling to final coordinates
//    - Create separate element in children array

// 3. **Order by z-index:**
//    - Background shapes FIRST
//    - Images MIDDLE
//    - Text LAST (on top)

// **COMMON PATTERNS:**

// **Pattern 1: Flex container with multiple columns**
// "html
// <div style="display:flex; left:0; top:560px; height:170px;">
//   <div style="flex:1">Column 1 content</div>
//   <div style="flex:1">Column 2 content</div>
//   <div style="flex:1">Column 3 content</div>
//   <div style="flex:1">Column 4 content</div>
// </div>
// "

// Extract:
// 1. Background rectangle (if colored)
// 2. Calculate each column width: total_width / 4
// 3. Position each column: col1_x=0, col2_x=col1_width, col3_x=col1_width*2, etc.
// 4. Extract ALL text from each column as separate text elements

// **Pattern 2: Text inside circles**
// "html
// <div style="circle styles">
//   <div>Text 1</div>
//   <div>Text 2</div>
// </div>
// "

// Extract:
// 1. Circle figure element
// 2. Each text element positioned INSIDE circle bounds
// 3. Center-align text within circle

// **Pattern 3: Logo + text group**
// "html
// <div style="display:flex; align-items:center;">
//   <img src="logo.jpg"/>
//   <div>
//     <div>Company Name</div>
//     <div>Website</div>
//   </div>
// </div>
// "

// Extract:
// 1. Image element at calculated position
// 2. Company name text at calculated position
// 3. Website text at calculated position

// ================================================================================
// ELEMENT TYPE MAPPING & PROPERTY EXTRACTION
// ================================================================================

// **TEXT ELEMENTS** → type: "text"

// REQUIRED properties with EXACT extraction rules:

// "json
// {
//   "id": "unique_id",
//   "name": "Descriptive name",
//   "type": "text",
//   "x": 0,  // scaled
//   "y": 0,  // scaled
//   "width": 0,  // scaled
//   "height": 0,  // scaled, accommodate all lines
//   "rotation": 0,
//   "opacity": 1,
//   "draggable": true,
//   "selectable": true,
//   "removable": true,
//   "resizable": true,
//   "visible": true,
//   "showInExport": true,
//   "styleEditable": true,
//   "alwaysOnTop": false,
//   "contentEditable": false,
//   "animations": [],
//   "blurEnabled": false,
//   "blurRadius": 0,
//   "brightness": 1,
//   "brightnessEnabled": false,
//   "grayscaleEnabled": false,
//   "sepiaEnabled": false,
//   "shadowEnabled": false,
//   "shadowBlur": 0,
//   "shadowColor": "#000000",
//   "shadowOffsetX": 0,
//   "shadowOffsetY": 0,
//   "shadowOpacity": 1,
  
//   // TEXT-SPECIFIC (CRITICAL):
//   "text": "Exact text from HTML",  // use \n for line breaks
//   "fontFamily": "Arial",  // extract FIRST font from CSS font-family
//   "fontSize": 0,  // MUST be scaled using scaleX
//   "fontStyle": "normal",  // or "italic"
//   "fontWeight": "700",  // extract EXACT value: "normal", "600", "700", "800", "900"
//   "fill": "rgba(200,74,161,1)",  // EXACT color from HTML as rgba
//   "align": "center",  // "left", "center", or "right"
//   "verticalAlign": "top",
//   "textDecoration": "",  // empty string or "underline"
//   "letterSpacing": 0,  // scaled from HTML
//   "lineHeight": 1.2,  // ratio from HTML (line-height / font-size)
//   "placeholder": "",
//   "backgroundColor": "rgba(0,0,0,0)",
//   "backgroundEnabled": false,
//   "backgroundOpacity": 1,
//   "backgroundPadding": 0,
//   "backgroundCornerRadius": 0,
//   "stroke": "rgba(0,0,0,0)",
//   "strokeWidth": 0
// }
// "

// **FONT EXTRACTION RULES:**

// 1. **fontFamily:**
//    - From CSS: "font-family: 'Roboto', Arial, sans-serif"
//    - Use FIRST valid font: "Roboto"
//    - Common mappings:
//      - Arial → "Arial"
//      - Helvetica → "Helvetica"
//      - sans-serif → "Roboto"
//      - serif → "Merriweather"
//      - 'Brush Script MT' → "Brush Script MT"
//      - cursive → "Comic Sans MS"

// 2. **fontWeight:**
//    - Extract EXACT numeric or keyword value
//    - "normal" → "normal" (400)
//    - "bold" → "700"
//    - 600 → "600"
//    - 700 → "700"
//    - 800 → "800"
//    - 900 → "900"

// 3. **fontSize:**
//    - Extract from HTML (in px)
//    - SCALE using scaleX: fontSize_html × scaleX
//    - Example: 150px → 150 × 0.3992 = 59.88px

// 4. **fill (text color):**
//    - From CSS color property
//    - Convert to rgba format
//    - #c84aa1 → "rgba(200,74,161,1)"
//    - #5e3aa8 → "rgba(94,58,168,1)"

// 5. **lineHeight:**
//    - FORMULA: lineHeight = line-height_px ÷ font-size_px (NO SCALING)
//    - Example: 28px ÷ 20px = 1.4, NOT 1.2
//    - Default: 1.2 (only if HTML has no line-height)

// 6. **letterSpacing:**
//    - EXTRACT from HTML, then SCALE: letterSpacing_html × scaleX
//    - Example: 1px × 0.3992 = 0.4px
//    - Default: 0 (only if HTML has no letter-spacing)

// **IMAGE ELEMENTS** → type: "image"

// "json
// {
//   "id": "unique_id",
//   "name": "Descriptive name",
//   "type": "image",
//   "x": 0,
//   "y": 0,
//   "width": 0,
//   "height": 0,
//   // ... all common properties ...
//   "src": "https://full-url-from-html.jpg",
//   "keepRatio": true,
//   "cropX": 0,
//   "cropY": 0,
//   "cropWidth": 1,
//   "cropHeight": 1,
//   "flipX": false,
//   "flipY": false,
//   "borderColor": "#000000",
//   "borderSize": 0,
//   "cornerRadius": 0,
//   "clipSrc": ""
// }
// "

// **SHAPE ELEMENTS** → type: "figure"

// **CIRCLE DETECTION:**
// Triggers:
// - border-radius: 50% OR
// - border-radius: XXpx where XX ≥ (width/2) OR
// - CSS explicitly creates circular shape

// "json
// {
//   "id": "unique_id",
//   "name": "Descriptive name",
//   "type": "figure",
//   "subType": "circle",
//   "x": 0,
//   "y": 0,
//   "width": 88,  // MUST equal height for perfect circle
//   "height": 88,
//   // ... all common properties ...
//   "fill": "rgba(0,174,179,1)",  // background-color
//   "stroke": "#000000",  // border-color
//   "strokeWidth": 0,  // border-width in px
//   "cornerRadius": 0,  // NOT used for circles
//   "dash": [0]  // solid line
// }
// "

// **RECTANGLE DETECTION:**
// Triggers:
// - <div> with background-color OR
// - Colored container without image OR
// - Explicit background/shape element

// "json
// {
//   "id": "unique_id",
//   "name": "Descriptive name",
//   "type": "figure",
//   "subType": "rect",
//   "x": 0,
//   "y": 0,
//   "width": 0,
//   "height": 0,
//   // ... all common properties ...
//   "fill": "rgba(0,174,179,1)",  // background-color
//   "stroke": "#000000",  // border-color
//   "strokeWidth": 0,  // border-width
//   "cornerRadius": 0,  // border-radius for rounded corners
//   "dash": [0]  // [0] for solid, [2,1] for dashed
// }
// "

// **DOTTED DIVIDERS:**
// For CSS: "border-right: 4px dotted rgba(255,255,255,0.6)"

// Create thin rectangle with:
// "json
// {
//   "subType": "rect",
//   "fill": "rgba(255,255,255,0.6)",
//   "width": 4,  // scaled border width
//   "dash": [2, 1]  // creates dotted effect
// }
// "

// ================================================================================
// JSON SCHEMA VALIDATION (MANDATORY)
// ================================================================================

// **BEFORE OUTPUTTING, CHECK EVERY ELEMENT:**

// ✓ Property names match sample editorData EXACTLY (case-sensitive)
// ✓ No misspellings:
//   - "fontFamily" not "fontfamily"
//   - "fontSize" not "fontsize"
//   - "fontWeight" not "fontweight"
//   - "backgroundColor" not "backgroundcolor"
//   - "contentEditable" not "editableContent"
// ✓ All numeric properties are numbers: 10 not "10"
// ✓ All boolean properties are booleans: true not "true"
// ✓ All required properties present
// ✓ No extra properties not in sample
// ✓ Array properties are arrays: [] not {}

// **COMMON PROPERTY MISTAKES TO AVOID:**

// ❌ Missing properties (blurEnabled, shadowEnabled, etc.)
// ❌ Wrong data types (string instead of number)
// ❌ Misspelled property names
// ❌ Wrong structure (nested instead of flat)
// ❌ Missing text-specific properties for text elements
// ❌ Missing image-specific properties for image elements
// ❌ Wrong subType value for figures

// ================================================================================
// COMPLETE EXTRACTION CHECKLIST
// ================================================================================

// **STAGE 1: PRE-GENERATION CHECKLIST**

// □ Identified HTML canvas dimensions
// □ Calculated scaleX and scaleY
// □ Identified ALL text elements in HTML
// □ Identified ALL images in HTML
// □ Identified ALL background colors
// □ Identified ALL circles (border-radius checks)
// □ Identified ALL rectangles
// □ Identified ALL nested content
// □ Planned z-order (backgrounds → images → shapes → text)
// □ Planned element extraction order

// **STAGE 2: GENERATION CHECKLIST**

// For EACH element:
// □ Generated unique ID
// □ Applied correct scaling to x, y, width, height
// □ Extracted font properties accurately
// □ Extracted colors in rgba format
// □ Calculated correct lineHeight ratio
// □ Scaled fontSize using scaleX
// □ Scaled letterSpacing using scaleX
// □ Set all required boolean flags
// □ Set all required default values
// □ Used correct element type
// □ Used correct subType for figures

// **STAGE 3: POST-GENERATION VALIDATION**

// □ JSON is valid and parseable
// □ All property names spelled correctly
// □ All required properties present for each element type
// □ All numeric values are numbers, not strings
// □ All boolean values are booleans, not strings
// □ No elements outside canvas bounds (0-600, 0-408)
// □ Font sizes look proportional
// □ Colors match HTML exactly
// □ Multi-line text uses \n correctly
// □ Visual hierarchy preserved
// □ ALL nested content extracted
// □ No missing text from HTML
// □ No missing images from HTML
// □ No missing shapes from HTML

// **IF ANY CHECK FAILS:**
// Stop and regenerate the affected elements correctly.

// ================================================================================
// OUTPUT FORMAT
// ================================================================================

// Output ONLY the complete, valid editorData JSON:

// "json
// {
//   "audios": [],
//   "dpi": 72,
//   "fonts": [],
//   "height": 408,
//   "pages": [
//     {
//       "id": "page_1",
//       "background": "white",
//       "bleed": 0,
//       "children": [
//         // ALL extracted elements here, properly scaled and validated
//       ],
//       "duration": 5000,
//       "height": "auto",
//       "width": "auto"
//     }
//   ],
//   "unit": "px",
//   "width": 600
// }
// "

// NO markdown fences, NO explanations, NO comments - ONLY JSON.

// ================================================================================
// CRITICAL REMINDERS
// ================================================================================

// 1. **SCALING:** Every dimension MUST be scaled. Font sizes MUST use scaleX.
// 2. **COLORS:** Extract EXACT colors from HTML. Use rgba format.
// 3. **MULTI-LINE TEXT:** Use \n for line breaks. Calculate correct lineHeight.
// 4. **NESTED CONTENT:** Extract ALL nested elements as separate flat elements.
// 5. **SCHEMA:** Match sample editorData structure EXACTLY. No typos allowed.
// 6. **VALIDATION:** Check EVERY property before output. Fix any errors.
// 7. **VISUAL ACCURACY:** Output must look IDENTICAL to HTML input.

// ================================================================================
// BEGIN RECONSTRUCTION
// ================================================================================

// Extract HTML canvas dimensions, calculate scaling, and generate complete editorData JSON following ALL rules above.


// - REFERENCE SCHEMA: ${JSON.stringify(metaData)}
// `;

const systemPrompt = `# PostGrid EditorData Reconstruction Engine

================================================================================
ABSOLUTE CONTEXT (NON-NEGOTIABLE)
================================================================================
- This output is for a **PRINT POSTCARD**, NOT a website, NOT a UI mockup.
- The PostGrid editor consumes a strict JSON schema named **editorData**.
- At input time, **editorData DOES NOT EXIST** and must be generated from scratch.
- Any deviation from PostGrid schema rules is a FAILURE.

================================================================================
CRITICAL: THREE-STAGE GENERATION PROCESS
================================================================================
To ensure accuracy, you MUST follow this three-stage process:

**STAGE 1: ANALYSIS & PLANNING**
1. Extract HTML canvas dimensions from CSS variables or container
2. Calculate scaling ratios (scaleX, scaleY)
3. Identify ALL visual elements (text, images, shapes, backgrounds)
4. Map nested structures and calculate absolute positions
5. Plan z-order (background → images → shapes → text)

**STAGE 2: GENERATION**
1. Generate complete editorData JSON
2. Apply scaling to ALL dimensions
3. Extract ALL font properties accurately
4. Detect and create ALL shape elements
5. Ensure proper element ordering

EDITOR INTERACTIVITY (CRITICAL)**
For ALL elements, set these properties for proper editor functionality:
- "contentEditable": true  // MUST be true for text elements to be editable
- "draggable": true
- "selectable": true
- "removable": true
- "resizable": true
- "visible": true
- "showInExport": true
- "styleEditable": true

**CRITICAL**: contentEditable MUST be true for text elements, otherwise users cannot edit text in the PostGrid editor.


**STAGE 3: VALIDATION & CORRECTION**
Before outputting, perform these checks:
□ JSON schema matches sample editorData EXACTLY
□ All required properties present for each element type
□ No spelling mistakes in property names
□ All numeric values are numbers, not strings
□ All boolean values are true/false, not strings
□ Scaling applied correctly to all dimensions
□ Font sizes scaled using scaleX ratio
□ No elements outside canvas bounds (0-600px width, 0-408px height)
□ Visual hierarchy preserved
□ ALL nested content extracted as separate elements
□ Text colors match HTML exactly
□ Background colors match HTML exactly

If validation fails, regenerate the affected elements.

================================================================================
CANVAS (LOCKED — MUST BE RESPECTED)
================================================================================
- PostGrid Canvas: **600px × 408px** (FIXED, NEVER CHANGE)
- Unit: px
- Do NOT exceed canvas bounds
- Do NOT place elements outside the visible area

================================================================================
SCALING & DIMENSION CONVERSION (CRITICAL - MUST FOLLOW)
================================================================================

**STEP 1: IDENTIFY HTML CANVAS DIMENSIONS**

Extract from HTML:
- CSS variables: "--canvas-w" and "--canvas-h"
- OR from "#postcard" element: width and height styles
- Example: "<div id="postcard" style="width:1503px;height:1021px">"
  → HTML canvas = 1503px × 1021px

**STEP 2: CALCULATE SCALING RATIOS**
"
scaleX = 600 / HTML_canvas_width
scaleY = 408 / HTML_canvas_height
"

Example:
- HTML canvas: 1503px × 1021px
- scaleX = 600 / 1503 = 0.3992
- scaleY = 408 / 1021 = 0.3996

**STEP 3: APPLY SCALING TO EVERY DIMENSION**

For each element:
"
x_postgrid = x_html × scaleX
y_postgrid = y_html × scaleY
width_postgrid = width_html × scaleX
height_postgrid = height_html × scaleY
fontSize_postgrid = fontSize_html × scaleX  (ALWAYS use scaleX for fonts)
letterSpacing_postgrid = letterSpacing_html × scaleX
padding_postgrid = padding_html × scaleX
"

**CRITICAL FONT SIZE RULE:**
- ALWAYS use scaleX for font sizes (not scaleY)
- fontSize_postgrid = fontSize_html × (600 / HTML_canvas_width)
- Example: 150px font on 1503px canvas → 150 × 0.3992 = 59.88px

**VALIDATION CHECKS:**
After scaling, verify:
- No x > 600
- No y > 408
- No (x + width) > 600
- No (y + height) > 408
- Font sizes proportionally correct
- Visual spacing preserved

================================================================================
VISUAL ACCURACY REQUIREMENTS (CRITICAL)
================================================================================

**CRITICAL: SEPARATE TEXT ELEMENTS RULE**

When extracting text from HTML, you MUST create SEPARATE elements for:
1. Different font sizes
2. Different colors
3. Different containers (divs)
4. Different visual purposes (headline vs body vs disclaimer)

**IDENTIFICATION PROCESS:**

For EACH text div in HTML:
1. Check font-size in inline style
2. Check parent container's position
3. If font-size OR container OR visual purpose differs → CREATE SEPARATE ELEMENT

**EXAMPLES:**

❌ WRONG - Combining different sizes:
"html
Heading 1
Heading 2
Heading 3
"
Where X is any large value (50px, 86px, 100px, 200px, etc.)

AI creates: ONE element {text: "Heading 1\nHeading 2\nHeading 3"}
❌ This loses visual impact because they're in DIFFERENT containers!

✅ CORRECT - Separate elements:
"html
Heading 1
Heading 2
Heading 3
"
AI creates: THREE separate elements, each with correct scaled fontSize
✅ Preserves visual hierarchy!

❌ WRONG - Combining multi-line with different sizes:
"html
Large Price
Medium Subtitle
Small Disclaimer
"
Where L > M > S (e.g., L=120, M=16, S=12 OR L=200, M=24, S=14, etc.)

AI creates: ONE element with all text at same size
❌ Destroys the design!

✅ CORRECT - Separate by size:
"html
Large Price
Medium Subtitle
Small Disclaimer
"
AI creates: THREE elements with proportional sizes after scaling
✅ Large headline stays large!

**WHEN TO COMBINE TEXT (RARE):**

Only combine when ALL these are true:
- ✅ Same exact font-size
- ✅ Same exact color
- ✅ Same parent container
- ✅ Vertically stacked (not side-by-side)
- ✅ Same visual purpose (all headlines OR all body text)

Example where combining IS correct:
"html

  Line 1
  Line 2
  Line 3

"
Where N is any value, CCC is any color
→ ONE element: {text: "Line 1\nLine 2\nLine 3", fontSize: N × scaleX}
(Apply 14px minimum if N × scaleX < 14)

**MINIMUM FONT SIZE WITH SMART ADJUSTMENT:**

After separating elements correctly:

1. **Calculate scaled fontSize:**
   "
   fontSize_scaled = fontSize_html × scaleX
   "

2. **Apply 14px minimum ONLY to small text:**
   "
   If fontSize_scaled < 14:
     fontSize_final = 14
     adjustment_ratio = 14 / fontSize_scaled
     width_final = width_scaled × adjustment_ratio
     height_final = height_scaled × adjustment_ratio
   Else:
     fontSize_final = fontSize_scaled
     width_final = width_scaled
     height_final = height_scaled
   "

3. **CRITICAL - Size Categories:**
   Given scaleX ratio and original HTML font size:
   
   - **Large fonts:** If (fontSize_html × scaleX) > 40px
     → Use EXACT scaled value, NO minimum applied
     → These are headlines, banners, hero text
   
   - **Medium fonts:** If 14 ≤ (fontSize_html × scaleX) ≤ 40px
     → Use EXACT scaled value
     → These are body text, labels, normal text
   
   - **Small fonts:** If (fontSize_html × scaleX) < 14px
     → Apply 14px minimum + proportional box adjustment
     → These are disclaimers, fine print, footnotes

**UNIVERSAL EXTRACTION ALGORITHM:**

**STEP 1: Scan ALL text in HTML**
Walk through EVERY div, span, p, h1-h6 element that contains text.

**STEP 2: For EACH text element found, check:**
"
Does it have a different font-size than the previous element?
  → YES: Create NEW element
  → NO: Check next condition

Is it in a different positioned container (position:absolute/relative)?
  → YES: Create NEW element
  → NO: Check next condition

Does it have a different color?
  → YES: Create NEW element
  → NO: Can combine with previous if ALL other properties match
"

**STEP 3: Apply scaling formula**
"
For ANY font size found in HTML:
  
  fontSize_scaled = fontSize_html × scaleX
  
  If fontSize_scaled >= 14:
    fontSize_final = fontSize_scaled
    width_final = width_scaled
    height_final = height_scaled
  
  If fontSize_scaled < 14:
    fontSize_final = 14
    adjustment_ratio = 14 / fontSize_scaled
    width_final = width_scaled × adjustment_ratio
    height_final = height_scaled × adjustment_ratio
"

**STEP 4: Extract spacing**
"
lineHeight_ratio = line-height_px ÷ font-size_px
letterSpacing_scaled = letterSpacing_px × scaleX
"

**REAL-WORLD PATTERN EXAMPLES:**

Pattern A: Multiple headings at different positions
"html
Text A
Text B
Text C
"
Result: 3 SEPARATE elements (different containers, even if same size)

Pattern B: Nested offer block
"html

  Large
  Medium
  Small

"
Result: 3 SEPARATE elements (different sizes)

Pattern C: Same-size stacked lines
"html

  Line 1
  Line 2

"
Result: 1 COMBINED element {text: "Line 1\nLine 2"} (same size, same color, same container)

**COLOR ACCURACY:**
- Extract EXACT colors from HTML/CSS
- Convert to rgba format: "rgba(R,G,B,A)"
- Do NOT approximate or change colors

**GRADIENT HANDLING:**
- PostGrid does NOT support CSS gradients
- Extract first color from gradient for solid fill
- Example: linear-gradient(90deg,#d1539a 0%,#6c4bd3 100%) → "rgba(209,83,154,1)"

**SPACING EXTRACTION:**

**lineHeight (ratio, not scaled):**
"
STEP 1: Extract line-height from HTML CSS
- Find: style="font-size:64px; line-height:64px"
- Extract both values

STEP 2: Calculate ratio
lineHeight_ratio = line-height_px ÷ font-size_px

Examples:
- font-size:64px; line-height:64px → 64 ÷ 64 = 1.0
- font-size:20px; line-height:24px → 24 ÷ 20 = 1.2
- font-size:72px; line-height:72px → 72 ÷ 72 = 1.0
- font-size:22px; line-height:28px → 28 ÷ 22 = 1.27

STEP 3: Use extracted ratio (NOT default)
- If HTML specifies line-height → Use calculated ratio
- If HTML does NOT specify line-height → Use 1.2 as default

CRITICAL RULES:
- NEVER assume lineHeight = 1.2 for large text
- ALWAYS extract from HTML when available
- Large banners typically have lineHeight: 1.0 (tight spacing)
- Body text typically has lineHeight: 1.2-1.5 (normal spacing)
- Headlines can have lineHeight: 0.9-1.1 (tight to normal)

WRONG APPROACH:
All text gets lineHeight: 1.2 ❌

CORRECT APPROACH:
Extract actual values from each element's CSS ✅
"

**letterSpacing (SMART CAPS):**

   **STEP 1:** Extract from HTML
   letterSpacing_html = CSS letter-spacing value (in px)
   Default: 0 if not specified

   **STEP 2:** Scale
   letterSpacing_scaled = letterSpacing_html × scaleX

   **STEP 3:** Apply caps based on fontSize_final
   
   If fontSize_final < 14px:
     letterSpacing_final = max(-10, min(letterSpacing_scaled, 0))
     // Range: -10 to 0
   
   Else if 14 <= fontSize_final <= 30px:
     letterSpacing_final = max(0, min(letterSpacing_scaled, 10))
     // Range: 0 to 10
   
   Else if fontSize_final > 30px:
     letterSpacing_final = max(0, min(letterSpacing_scaled, 20))
     // Range: 0 to 20 (MAX CAP)
   
   CRITICAL: Never exceed 20px letter-spacing for any font size.

================================================================================
================================================================================
NESTED CONTENT EXTRACTION (CRITICAL)
================================================================================

**FLATTENING RULE:**
PostGrid does NOT support nested elements. ALL content must be in a FLAT array.

**EXTRACTION PROCESS:**

1. **Identify parent container** (div, flex, grid)
   - Record: parent_x, parent_y, parent_width, parent_height

2. **For EACH child inside parent:**
   - Calculate absolute position:
     "
     child_x = parent_x + child_offset_x
     child_y = parent_y + child_offset_y
   - Apply scaling to final coordinates
   - Create separate element in children array

3. **Order by z-index:**
   - Background shapes FIRST
   - Images MIDDLE
   - Text LAST (on top)

**COMMON PATTERNS:**

**Pattern 1: Flex container with multiple columns**
"html
<div style="display:flex; left:0; top:560px; height:170px;">
  <div style="flex:1">Column 1 content</div>
  <div style="flex:1">Column 2 content</div>
  <div style="flex:1">Column 3 content</div>
  <div style="flex:1">Column 4 content</div>
</div>
"

Extract:
1. Background rectangle (if colored)
2. Calculate each column width: total_width / 4
3. Position each column: col1_x=0, col2_x=col1_width, col3_x=col1_width*2, etc.
4. Extract ALL text from each column as separate text elements

**Pattern 2: Text inside circles**
"html
<div style="circle styles">
  <div>Text 1</div>
  <div>Text 2</div>
</div>
"

Extract:
1. Circle figure element
2. Each text element positioned INSIDE circle bounds
3. Center-align text within circle

**Pattern 3: Logo + text group**
"html
<div style="display:flex; align-items:center;">
  <img src="logo.jpg"/>
  <div>
    <div>Company Name</div>
    <div>Website</div>
  </div>
</div>
"

Extract:
1. Image element at calculated position
2. Company name text at calculated position
3. Website text at calculated position

================================================================================
ELEMENT TYPE MAPPING & PROPERTY EXTRACTION
================================================================================

**TEXT ELEMENTS** → type: "text"

REQUIRED properties with EXACT extraction rules:

"json
{
  "id": "unique_id",
  "name": "Descriptive name",
  "type": "text",
  "x": 0,  // scaled
  "y": 0,  // scaled
  "width": 0,  // scaled
  "height": 0,  // scaled, accommodate all lines
  "rotation": 0,
  "opacity": 1,
  "draggable": true,
  "selectable": true,
  "removable": true,
  "resizable": true,
  "visible": true,
  "showInExport": true,
  "styleEditable": true,
  "alwaysOnTop": false,
  "contentEditable": false,
  "animations": [],
  "blurEnabled": false,
  "blurRadius": 0,
  "brightness": 1,
  "brightnessEnabled": false,
  "grayscaleEnabled": false,
  "sepiaEnabled": false,
  "shadowEnabled": false,
  "shadowBlur": 0,
  "shadowColor": "#000000",
  "shadowOffsetX": 0,
  "shadowOffsetY": 0,
  "shadowOpacity": 1,
  
  // TEXT-SPECIFIC (CRITICAL):
  "text": "Exact text from HTML",  // use \n for line breaks
  "fontFamily": "Arial",  // extract FIRST font from CSS font-family
  "fontSize": 0,  // MUST be scaled using scaleX
  "fontStyle": "normal",  // or "italic"
  "fontWeight": "700",  // extract EXACT value: "normal", "600", "700", "800", "900"
  "fill": "rgba(200,74,161,1)",  // EXACT color from HTML as rgba
  "align": "center",  // "left", "center", or "right"
  "verticalAlign": "top",
  "textDecoration": "",  // empty string or "underline"
  "letterSpacing": 0,  // scaled from HTML, ###must follow Range(-10 to 20)
  "lineHeight": 1.2,  // ratio from HTML (line-height / font-size)
  "placeholder": "",
  "backgroundColor": "rgba(0,0,0,0)",
  "backgroundEnabled": false,
  "backgroundOpacity": 1,
  "backgroundPadding": 0,
  "backgroundCornerRadius": 0,
  "stroke": "rgba(0,0,0,0)",
  "strokeWidth": 0
}
"

**FONT EXTRACTION RULES:**

1. **fontFamily:**
   - From CSS: "font-family: 'Roboto', Arial, sans-serif"
   - Use FIRST valid font: "Roboto"
   - Common mappings:
     - Arial → "Arial"
     - Helvetica → "Helvetica"
     - sans-serif → "Roboto"
     - serif → "Merriweather"
     - 'Brush Script MT' → "Brush Script MT"
     - cursive → "Comic Sans MS"

2. **fontWeight:**
   - Extract EXACT numeric or keyword value
   - "normal" → "normal" (400)
   - "bold" → "700"
   - 600 → "600"
   - 700 → "700"
   - 800 → "800"
   - 900 → "900"

3. **fontSize:**
   - Extract from HTML (in px)
   - SCALE using scaleX: fontSize_html × scaleX
   - Example: 150px → 150 × 0.3992 = 59.88px

4. **fill (text color):**
   - From CSS color property
   - Convert to rgba format
   - #c84aa1 → "rgba(200,74,161,1)"
   - #5e3aa8 → "rgba(94,58,168,1)"

5. **lineHeight:**
   - FORMULA: lineHeight = line-height_px ÷ font-size_px (NO SCALING)
   - Example: 28px ÷ 20px = 1.4, NOT 1.2
   - Default: 1.2 (only if HTML has no line-height)

6. **letterSpacing:**
   - EXTRACT from HTML, then SCALE: letterSpacing_html × scaleX
   - Example: 1px × 0.3992 = 0.4px
   - Default: 0 (only if HTML has no letter-spacing)

**IMAGE ELEMENTS** → type: "image"

"json
{
  "id": "unique_id",
  "name": "Descriptive name",
  "type": "image",
  "x": 0,
  "y": 0,
  "width": 0,
  "height": 0,
  // ... all common properties ...
  "src": "https://full-url-from-html.jpg",
  "keepRatio": true,
  "cropX": 0,
  "cropY": 0,
  "cropWidth": 1,
  "cropHeight": 1,
  "flipX": false,
  "flipY": false,
  "borderColor": "#000000",
  "borderSize": 0,
  "cornerRadius": 0,
  "clipSrc": ""
}
"

**SHAPE ELEMENTS** → type: "figure"

**CIRCLE DETECTION:**
Triggers:
- border-radius: 50% OR
- border-radius: XXpx where XX ≥ (width/2) OR
- CSS explicitly creates circular shape

"json
{
  "id": "unique_id",
  "name": "Descriptive name",
  "type": "figure",
  "subType": "circle",
  "x": 0,
  "y": 0,
  "width": 88,  // MUST equal height for perfect circle
  "height": 88,
  // ... all common properties ...
  "fill": "rgba(0,174,179,1)",  // background-color
  "stroke": "#000000",  // border-color
  "strokeWidth": 0,  // border-width in px
  "cornerRadius": 0,  // NOT used for circles
  "dash": [0]  // solid line
}
"

**RECTANGLE DETECTION:**
Triggers:
- <div> with background-color OR
- Colored container without image OR
- Explicit background/shape element

"json
{
  "id": "unique_id",
  "name": "Descriptive name",
  "type": "figure",
  "subType": "rect",
  "x": 0,
  "y": 0,
  "width": 0,
  "height": 0,
  // ... all common properties ...
  "fill": "rgba(0,174,179,1)",  // background-color
  "stroke": "#000000",  // border-color
  "strokeWidth": 0,  // border-width
  "cornerRadius": 0,  // border-radius for rounded corners
  "dash": [0]  // [0] for solid, [2,1] for dashed
}
"

**DOTTED DIVIDERS:**
For CSS: "border-right: 4px dotted rgba(255,255,255,0.6)"

Create thin rectangle with:
"json
{
  "subType": "rect",
  "fill": "rgba(255,255,255,0.6)",
  "width": 4,  // scaled border width
  "dash": [2, 1]  // creates dotted effect
}
"

================================================================================
JSON SCHEMA VALIDATION (MANDATORY)
================================================================================

**BEFORE OUTPUTTING, CHECK EVERY ELEMENT:**

✓ Property names match sample editorData EXACTLY (case-sensitive)
✓ No misspellings:
  - "fontFamily" not "fontfamily"
  - "fontSize" not "fontsize"
  - "fontWeight" not "fontweight"
  - "backgroundColor" not "backgroundcolor"
  - "contentEditable" not "editableContent"
✓ All numeric properties are numbers: 10 not "10"
✓ All boolean properties are booleans: true not "true"
✓ All required properties present
✓ No extra properties not in sample
✓ Array properties are arrays: [] not {}

**COMMON PROPERTY MISTAKES TO AVOID:**

❌ Missing properties (blurEnabled, shadowEnabled, etc.)
❌ Wrong data types (string instead of number)
❌ Misspelled property names
❌ Wrong structure (nested instead of flat)
❌ Missing text-specific properties for text elements
❌ Missing image-specific properties for image elements
❌ Wrong subType value for figures

================================================================================
COMPLETE EXTRACTION CHECKLIST
================================================================================

**STAGE 1: PRE-GENERATION CHECKLIST**

□ Identified HTML canvas dimensions
□ Calculated scaleX and scaleY
□ Identified ALL text elements in HTML
□ Identified ALL images in HTML
□ Identified ALL background colors
□ Identified ALL circles (border-radius checks)
□ Identified ALL rectangles
□ Identified ALL nested content
□ Planned z-order (backgrounds → images → shapes → text)
□ Planned element extraction order

**STAGE 2: GENERATION CHECKLIST**

For EACH element:
□ Generated unique ID
□ Applied correct scaling to x, y, width, height
□ Extracted font properties accurately
□ Extracted colors in rgba format
□ Calculated correct lineHeight ratio
□ Scaled fontSize using scaleX
□ Scaled letterSpacing using scaleX
□ Set all required boolean flags
□ Set all required default values
□ Used correct element type
□ Used correct subType for figures

**STAGE 3: POST-GENERATION VALIDATION**

□ JSON is valid and parseable
□ All property names spelled correctly
□ All required properties present for each element type
□ All numeric values are numbers, not strings
□ All boolean values are booleans, not strings
□ No elements outside canvas bounds (0-600, 0-408)
□ Font sizes look proportional
□ Colors match HTML exactly
□ Multi-line text uses \n correctly
□ Visual hierarchy preserved
□ ALL nested content extracted
□ No missing text from HTML
□ No missing images from HTML
□ No missing shapes from HTML

**IF ANY CHECK FAILS:**
Stop and regenerate the affected elements correctly.

================================================================================
OUTPUT FORMAT
================================================================================

Output ONLY the complete, valid editorData JSON:

"json
{
  "audios": [],
  "dpi": 72,
  "fonts": [],
  "height": 408,
  "pages": [
    {
      "id": "page_1",
      "background": "white",
      "bleed": 0,
      "children": [
        // ALL extracted elements here, properly scaled and validated
      ],
      "duration": 5000,
      "height": "auto",
      "width": "auto"
    }
  ],
  "unit": "px",
  "width": 600
}
"

NO markdown fences, NO explanations, NO comments - ONLY JSON.

================================================================================
CRITICAL REMINDERS
================================================================================

1. **SCALING:** Every dimension MUST be scaled. Font sizes MUST use scaleX.
2. **COLORS:** Extract EXACT colors from HTML. Use rgba format.
3. **MULTI-LINE TEXT:** Use \n for line breaks. Calculate correct lineHeight.
4. **NESTED CONTENT:** Extract ALL nested elements as separate flat elements.
5. **SCHEMA:** Match sample editorData structure EXACTLY. No typos allowed.
6. **VALIDATION:** Check EVERY property before output. Fix any errors.
7. **VISUAL ACCURACY:** Output must look IDENTICAL to HTML input.

================================================================================
BEGIN RECONSTRUCTION
================================================================================

Extract HTML canvas dimensions, calculate scaling, and generate complete editorData JSON following ALL rules above.


- REFERENCE SCHEMA: ${JSON.stringify(metaData)}
`;

const userPrompt = `
### IMMEDIATE TASK AND MANDATORY RULES TO FOLLOW
Follow the "THREE-STAGE GENERATION PROCESS" in your system instructions to convert the following HTML.

### DATA
- HTML_W and HTML_H: [Extract from style or variables below]
- INPUT HTML: ${html}

### FINAL CHECK
Apply scaleX and scaleY to EVERY coordinate now.and system instruction strictly
`;



const messages = [
  { role: "system", content: systemPrompt },
  { role: "user", content: userPrompt },
]
return generateMetadataWithRetry(llm, messages);
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
