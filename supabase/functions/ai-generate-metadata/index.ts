import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { ChatOpenAI } from "npm:@langchain/openai";

// handling the retry part
async function generateMetadataWithRetry(llm: ChatOpenAI, prompt: string, retries = 2): Promise<any> {
  let lastError: any;
  let currentPrompt = prompt;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await llm.invoke(currentPrompt);
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

const prompt = `You are a **PostGrid EditorData Reconstruction Engine**.
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
SCALING & DIMENSION CONVERSION (CRITICAL - MUST FOLLOW)
================================================================================
**HTML CANVAS vs POSTGRID CANVAS:**
- HTML input uses variable canvas dimensions (commonly 1800px × 1200px or other sizes)
- PostGrid ALWAYS uses: 600px × 408px
- You MUST calculate the scaling ratio and apply it to ALL dimensions

**SCALING CALCULATION (MANDATORY):**
1. Extract HTML canvas dimensions from the CSS variables or container:
   - Look for: --canvas-w, --canvas-h in CSS
   - Or extract from #postcard width/height
   - Example: HTML canvas = 1800px × 1200px

2. Calculate scaling ratios:
   - scaleX = 600 / HTML_canvas_width
   - scaleY = 408 / HTML_canvas_height
   - Example: scaleX = 600/1800 = 0.333, scaleY = 408/1200 = 0.34

3. Apply scaling to EVERY dimension:
   - x_postgrid = x_html × scaleX
   - y_postgrid = y_html × scaleY
   - width_postgrid = width_html × scaleX
   - height_postgrid = height_html × scaleY
   - fontSize_postgrid = fontSize_html × scaleX (use scaleX for font sizes)

**SCALING EXAMPLES:**
HTML: x=180, y=120, width=900, height=240, fontSize=48
HTML canvas: 1800×1200, PostGrid canvas: 600×408
scaleX = 0.333, scaleY = 0.34

PostGrid output:
- x = 180 × 0.333 = 60
- y = 120 × 0.34 = 40.8
- width = 900 × 0.333 = 300
- height = 240 × 0.34 = 81.6
- fontSize = 48 × 0.333 = 16

**FONT SIZE CONVERSION (ABSOLUTELY CRITICAL):**
- ALWAYS scale font sizes using scaleX ratio
- fontSize_postgrid = fontSize_html × (600 / HTML_canvas_width)
- Example: HTML fontSize 112px on 1800px canvas
  → PostGrid fontSize = 112 × (600/1800) = 37.33px
- NEVER use HTML font sizes directly without scaling

**SPACING & PADDING CONVERSION:**
- padding-top, padding-bottom, margin, letter-spacing: scale using scaleX
- line-height: keep as ratio if already a ratio (e.g., 1.2), otherwise scale

**CRITICAL CHECKS BEFORE OUTPUT:**
□ Did I identify the HTML canvas dimensions?
□ Did I calculate scaleX and scaleY correctly?
□ Did I apply scaling to ALL x, y, width, height values?
□ Did I scale ALL font sizes using scaleX?
□ Did I scale letter-spacing, padding values?
□ Do all elements fit within 600×408 bounds?

**COMMON SCALING MISTAKES TO AVOID:**
❌ Using HTML dimensions directly without scaling
❌ Forgetting to scale font sizes
❌ Using wrong scale ratio (e.g., using scaleY for fontSize)
❌ Not scaling padding, margins, letter-spacing
❌ Elements positioned outside 600×408 canvas
❌ Text too large or too small compared to layout

**VALIDATION:**
After scaling, verify:
- No x value > 600
- No y value > 408
- No (x + width) > 600
- No (y + height) > 408
- Font sizes are proportionally correct (not too large/small)
- Visual hierarchy is maintained after scaling

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
   **FLATTEN ALL NESTING**: Extract ALL nested content as separate elements
     - Text inside circles → separate text elements
     - Images inside divs → separate image elements
     - Multiple items in flex/grid → calculate absolute positions for each
     - Calculate absolute coordinates: parent position + child offset
     - NEVER skip nested content
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
NESTED CONTENT EXTRACTION (CRITICAL - MUST NOT BE SKIPPED)
================================================================================
**FLATTENING NESTED ELEMENTS:**
PostGrid does NOT support nested elements. ALL content must be in a FLAT array.

**MANDATORY RULE:**
When HTML has elements nested inside containers (e.g., text inside circles, images inside divs):
1. Extract the CONTAINER as one element (e.g., circle figure)
2. Extract EACH CHILD as a SEPARATE element at the SAME level
3. Position child elements using ABSOLUTE coordinates relative to canvas
4. Calculate child positions: parent_x + child_offset_x, parent_y + child_offset_y
5. NEVER skip nested content - ALL visible text and images MUST become elements

**COMMON NESTING PATTERNS TO DETECT:**

**Pattern 1: Text inside Circles/Shapes**
HTML structure:
<div style="circle styles...">
  <div>Text 1</div>
  <div>Text 2</div>
  <div>Text 3</div>
</div>

PostGrid output:
- ONE figure element (subType: "circle") for the circle
- THREE separate text elements positioned INSIDE the circle bounds
- Calculate text x/y by adding circle's x/y + text's offset from circle top-left

**Pattern 2: Images inside Containers**
HTML structure:
"
<div style="position:absolute; left:100px; top:50px;">
  <img src="..." style="width:200px; height:150px;"/>
</div>
"

PostGrid output:
- ONE image element at x=100, y=50, width=200, height=150
- NO separate div element (container is just positioning)

**Pattern 3: Multiple Elements in Flex/Grid Containers**
HTML structure:
"
<div style="display:flex; left:100px; top:200px; gap:20px;">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
"

PostGrid output:
- Calculate ABSOLUTE position for each item:
  - Item 1: x = 100
  - Item 2: x = 100 + item1_width + gap = 100 + width + 20
  - Item 3: x = 100 + item1_width + gap + item2_width + gap
- Extract each as SEPARATE element with absolute coordinates

**EXTRACTION WORKFLOW FOR NESTED CONTENT:**

STEP 1: Identify parent container position (left, top, right, bottom)
STEP 2: For EACH child inside:
  a) Calculate child's absolute position:
     - child_x = parent_x + child's_left_offset
     - child_y = parent_y + child's_top_offset
  b) Apply scaling to final coordinates
  c) Create separate element in children array

STEP 3: Order elements by z-index:
  - Parent shapes FIRST (backgrounds, circles, rectangles)
  - Child content AFTER (text, images)

**CRITICAL CHECKS:**
□ Did I find ALL text inside shapes/containers?
□ Did I extract nested images separately?
□ Did I calculate absolute positions for all nested elements?
□ Are text elements positioned INSIDE their parent circles/shapes?
□ Did I apply scaling to nested element positions?

**EXAMPLE: Circle with Text Inside**

HTML (at 1500px × 972px canvas):
"html
<div style="position:absolute; left:120px; top:470px; width:220px; height:220px; border-radius:50%; background:#16b8b1;">
  <div style="margin-top:8px; font-size:14px;">NEW PATIENT SPECIAL</div>
  <div style="margin-top:10px; font-size:42px;">FREE</div>
  <div style="margin-top:6px; font-size:18px;">WHITENING</div>
</div>
"

PostGrid output (scaled to 600×408):
scaleX = 600/1500 = 0.4, scaleY = 408/972 = 0.42

1. Circle figure:
   - x = 120 × 0.4 = 48
   - y = 470 × 0.42 = 197.4
   - width = height = 220 × 0.4 = 88
   - subType: "circle"

2. Text element 1 ("NEW PATIENT SPECIAL"):
   - x = (120 + horizontal_center_offset) × 0.4 ≈ 48 + (88/2 - text_width/2)
   - y = (470 + 8) × 0.42 ≈ 200.76
   - fontSize = 14 × 0.4 = 5.6
   - align: "center"

3. Text element 2 ("FREE"):
   - x = (120 + horizontal_center_offset) × 0.4
   - y = (470 + 8 + 14 + 10) × 0.42 ≈ 211
   - fontSize = 42 × 0.4 = 16.8
   - align: "center"

4. Text element 3 ("WHITENING"):
   - x = (120 + horizontal_center_offset) × 0.4
   - y = (470 + 8 + 14 + 10 + 42 + 6) × 0.42 ≈ 227
   - fontSize = 18 × 0.4 = 7.2
   - align: "center"

**COMMON MISTAKES THAT CAUSE DISAPPEARED CONTENT:**
❌ Only extracting the circle, forgetting the text inside
❌ Not calculating absolute positions for nested elements
❌ Skipping flex/grid children
❌ Missing images inside divs
❌ Not applying scaling to nested element positions
❌ Wrong z-order (text behind shapes instead of in front)

================================================================================ 
ELEMENT TYPE MAPPING & EXTRACTION RULES
================================================================================ 
**TEXT ELEMENTS** → type: "text"
  REQUIRED properties:
  • text: exact content from HTML
  • fontFamily: Extract from CSS font-family (use Google Fonts or web-safe fonts)
    - If font-family contains multiple fonts, use the FIRST valid font
    - Common mappings: Arial → "Arial", sans-serif → "Roboto", serif → "Merriweather"
    - 'Brush Script MT','Segoe Script' → "Brush Script MT"
    - cursive → "Comic Sans MS"
  • fontSize: MUST BE SCALED from HTML
    - Formula: fontSize_html × (600 / HTML_canvas_width)
    - Example: 112px on 1800px canvas → 112 × (600/1800) = 37.33px
  • fill: rgba format from CSS color (e.g., "rgba(71,88,103,1)")
  • fontWeight: Extract exact value from CSS
    - "normal" (400), "600", "700" (bold), "800", "900"
    - Convert numeric weights: 600 → "600", 700 → "700", 800 → "800"
  • fontStyle: "normal" or "italic"
  • textDecoration: "" (empty string) or "underline"
  • align: "left", "center", or "right" (extract from text-align)
  • letterSpacing: MUST BE SCALED
    - Formula: letterSpacing_html × (600 / HTML_canvas_width)
    - Default: 0 if not specified
  • lineHeight: Keep as ratio (e.g., 1.15, 1.2, 1.25) if specified as ratio



**IMAGE ELEMENTS** → type: "image"
  REQUIRED properties:
  • src: full URL from HTML src or background-image
  • width, height: numeric pixel dimensions
  • keepRatio: true (always set to true)
  • cropX, cropY, cropWidth, cropHeight: use 0, 0, 1, 1 for no cropping

**SHAPE ELEMENTS** → type: "figure"
  CRITICAL: Detect shapes from HTML/CSS properties:
  
  **CIRCLES** (subType: "circle"):
  • Trigger: border-radius ≥ 50% OR border-radius in px ≥ (width/2)
  • Properties:
    - fill: background-color as "rgba(R,G,B,A)"
    - stroke: border-color as hex (default: "#0c0c0c")
    - strokeWidth: border-width in px (default: 0)
    - width, height: MUST be equal for perfect circles
    - cornerRadius: 0 (circles don't use this property)
  
  **RECTANGLES** (subType: "rect"):
  • Trigger: <div>, <span> with background-color AND no image
  • Properties:
    - fill: background-color as "rgba(R,G,B,A)"
    - stroke: border-color as hex
    - strokeWidth: border-width in px
    - cornerRadius: border-radius in px (for rounded rectangles)
    - dash: [0] for solid, or extract from border-style if dashed

  
  
  **EXTRACTION RULES FOR SHAPES:**
  1. Check EVERY element with background-color, border, or border-radius
  2. Elements with border-radius: 50% or high px values MUST become circles
  3. Colored <div> containers without images MUST become rectangles
  4. Extract exact RGB values from CSS (convert gradients to solid color)
  5. Preserve stroke colors and widths from CSS borders

**GUIDELINES** → type: "guideline"
  • Only for safe zones and postal zones (12px and 24px margins)
  • color: "rgba(R,G,B,0.3)" for semi-transparent guides

  
================================================================================
DIMENSION EXTRACTION & SCALING WORKFLOW
================================================================================
**STEP 1: Identify HTML Canvas Size**
- Look for CSS variables: --canvas-w and --canvas-h
- Or extract from #postcard div: width and height styles
- Record: HTML_width and HTML_height

**STEP 2: Calculate Scale Ratios**
- scaleX = 600 / HTML_width
- scaleY = 408 / HTML_height

**STEP 3: For EACH Element in HTML:**
1. Extract original dimensions:
   - position: absolute → get left, top, right (if used)
   - width, height from inline styles
   - font-size from inline styles

2. Convert to PostGrid coordinates:
   - x = left × scaleX (or calculate from right if used)
   - y = top × scaleY
   - width = width_html × scaleX
   - height = height_html × scaleY
   - fontSize = fontSize_html × scaleX

3. Extract all font properties EXACTLY:
   - font-family: use FIRST font in the stack
   - font-weight: extract exact value (600, 700, 800, etc.)
   - font-style: normal/italic
   - color: convert to rgba(R,G,B,A) format
   - line-height: keep as ratio (1.15, 1.2, 1.25)
   - letter-spacing: scale by scaleX
   - text-align: convert to "left"/"center"/"right"

**STEP 4: Verify Scaled Output**
- All x + width ≤ 600
- All y + height ≤ 408
- Font sizes look proportional
- Spacing is preserved
================================================================================ 
FONT & SHAPE EXTRACTION CHECKLIST (MANDATORY)
================================================================================ 
Before generating output, you MUST:

**For EVERY text element:**
☑ Extract font-family from CSS (first valid font in the stack)
☑ Extract font-weight (normal/bold)
☑ Extract font-style (normal/italic)
☑ Extract text-decoration (empty string or "underline")
☑ Convert font-size to numeric pixels
☑ Extract color as rgba() format
☑ Extract letter-spacing (default 0 if not specified)
☑ Extract line-height (default 1.2 if not specified)

**For EVERY shape/background element:**
☑ Identify if it's a circle (border-radius ≥ 50%) → subType: "circle"
☑ Identify if it's a rectangle (has background-color) → subType: "rect"
☑ Extract fill color from background-color as rgba()
☑ Extract stroke color from border-color
☑ Extract strokeWidth from border-width (px value)
☑ For circles: ensure width === height
☑ Extract cornerRadius from border-radius for rectangles
☑ Check for dashed borders → set dash: [2, 1]

**COMMON MISTAKES TO AVOID:**
❌ Ignoring font-weight/font-style from CSS
❌ Missing circles because border-radius wasn't checked
❌ Not converting background-color to rgba() format
❌ Forgetting to extract border properties for stroke/strokeWidth
❌ Using generic fonts instead of actual CSS font-family values

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
JSON VALIDATION & STRUCTURE COMPLIANCE (CRITICAL)
================================================================================
Before outputting the final JSON, you MUST perform these validation checks:

**STRUCTURE VALIDATION:**
1. Verify the JSON follows the EXACT schema from the sample editorData:${metaData}
2. Check that ALL property names match the sample EXACTLY (case-sensitive)
3. Confirm no properties are misspelled or renamed
4. Ensure no extra properties are added that don't exist in the sample
5. Verify the nesting hierarchy matches: editorData → pages → children

**REQUIRED TOP-LEVEL PROPERTIES:**
✓ audios (array)
✓ dpi (number)
✓ fonts (array)
✓ height (number: 408)
✓ pages (array with exactly 1 page object)
✓ unit (string: "px")
✓ width (number: 600)

**REQUIRED PAGE PROPERTIES:**
✓ id (unique string)
✓ background (string)
✓ bleed (number: 0)
✓ children (array of element objects)
✓ duration (number: 5000)
✓ height (string: "auto")
✓ width (string: "auto")

**REQUIRED ELEMENT PROPERTIES (check EVERY element in children array):**
For ALL element types:
✓ id, name, type
✓ x, y, width, height (all numeric)
✓ rotation, opacity (numeric)
✓ draggable, selectable, removable, resizable, visible, showInExport, styleEditable (all boolean)
✓ alwaysOnTop, contentEditable (boolean)
✓ animations (array)
✓ blurEnabled, blurRadius, brightness, brightnessEnabled (blur/brightness properties)
✓ grayscaleEnabled, sepiaEnabled (filter properties)
✓ shadowEnabled, shadowBlur, shadowColor, shadowOffsetX, shadowOffsetY, shadowOpacity (shadow properties)

For type: "text" elements:
✓ text, fontFamily, fontSize, fontStyle, fontWeight
✓ fill, align, verticalAlign, textDecoration
✓ letterSpacing, lineHeight
✓ placeholder
✓ backgroundColor, backgroundEnabled, backgroundOpacity, backgroundPadding, backgroundCornerRadius
✓ stroke, strokeWidth

For type: "image" elements:
✓ src, keepRatio
✓ cropX, cropY, cropWidth, cropHeight
✓ flipX, flipY
✓ borderColor, borderSize, cornerRadius, clipSrc

For type: "figure" elements:
✓ subType ("circle" or "rect")
✓ fill, stroke, strokeWidth
✓ cornerRadius, dash

For type: "guideline" elements:
✓ color

**SPELLING CHECK (COMMON MISTAKES):**
❌ "colour" → ✓ "color"
❌ "fontsize" → ✓ "fontSize"
❌ "fontstyle" → ✓ "fontStyle"
❌ "fontweight" → ✓ "fontWeight"
❌ "textalign" → ✓ "align"
❌ "backgroundcolor" → ✓ "backgroundColor"
❌ "bordercolor" → ✓ "borderColor"
❌ "shadowcolor" → ✓ "shadowColor"
❌ "editableContent" → ✓ "contentEditable"
❌ "isVisible" → ✓ "visible"
❌ "canDrag" → ✓ "draggable"
❌ "canSelect" → ✓ "selectable"
❌ "canRemove" → ✓ "removable"
❌ "canResize" → ✓ "resizable"

**SELF-CHECK BEFORE OUTPUT:**
□ Every property name matches the sample editorData exactly
□ No camelCase errors (e.g., fontfamily vs fontFamily)
□ All numeric properties are numbers, not strings
□ All boolean properties are true/false, not "true"/"false"
□ All required properties exist for each element type
□ No undefined or null values where not allowed
□ Array properties are arrays [], not objects {}
□ The JSON is valid and parseable
□ **ALL NESTED CONTENT HAS BEEN EXTRACTED (text inside circles, images inside divs, flex children)**
□ **Text elements positioned correctly INSIDE their parent shapes**
□ **Z-order is correct (shapes first, then text on top)**
□ **No visible content from HTML is missing in the output**

**IF VALIDATION FAILS:**
- DO NOT output invalid JSON
- Review the sample editorData structure again
- Regenerate the element with correct property names
- Ensure all required properties are present

================================================================================
HTML INPUT (SOURCE OF TRUTH)
================================================================================
${html}
`
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
