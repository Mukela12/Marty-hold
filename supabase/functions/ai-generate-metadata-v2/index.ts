import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { ChatOpenAI } from "npm:@langchain/openai";

// handling the retry part
async function generateMetadataWithRetry(llm: ChatOpenAI, prompt: any[], retries = 2): Promise<any> {
  let lastError: any;
  let currentPrompt = prompt;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await llm.invoke(prompt);
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
// - Output is for a **PRINT POSTCARD (6 x 4 inches)**.
// - NOT a website, NOT a UI mockup, NOT responsive.
// - editorData DOES NOT EXIST at input time.
// - You MUST generate editorData from scratch.
// - Any schema violation or layout overflow is a FAILURE.

// ================================================================================
// CANVAS (PRINT-LOCKED — SINGLE SOURCE OF TRUTH)
// ================================================================================
// - Physical size: 6 x 4 inches
// - DPI: 72
// - Width: 432 px
// - Height: 288 px
// - Unit: px
// - ALL elements MUST be fully inside this area
// - NO overflow, NO clipping, NO scaling outside bounds

// ================================================================================
// PRIMARY OBJECTIVE
// ================================================================================
// Generate a **COMPLETE, VALID, RENDERABLE editorData JSON** that:
// - Fits entirely within 432 x 288
// - Has ZERO overlaps
// - Preserves HTML hierarchy and grouping
// - Is print-safe and editable in PostGrid

// ================================================================================
// INPUT AUTHORITY (STRICT)
// ================================================================================
// 1. HTML INPUT — SOURCE OF TRUTH
//    - Defines text, images, grouping, hierarchy, alignment

// 2. SAMPLE editorData — STRUCTURE ONLY
//    - Learn schema and required flags ONLY
//    - DO NOT copy values, sizes, or proportions

// ================================================================================
// STRICT PROHIBITIONS
// ================================================================================
// DO NOT:
// - Copy IDs or dimensions from sample
// - Invent content not present in HTML
// - Output markdown, comments, or explanations
// - Output partial JSON

// ================================================================================
// MANDATORY OUTPUT RULES
// ================================================================================
// 1. Output ONLY valid JSON
// 2. Exactly ONE page
// 3. x, y, width, height MUST be numbers
// 4. Elements MUST NOT overlap
// 5. Stack order:
//    background → figures → images → text
// 6. ALL editor flags MUST be present:
//    draggable, selectable, removable,
//    resizable, visible, showInExport, styleEditable
// 7. Generate NEW unique IDs for every element

// ================================================================================
// TEXT SIZE & BOUNDING RULES (CRITICAL)
// ================================================================================
// - Text MUST NEVER overflow its bounding box
// - Font size MUST be derived from available space
// - Text boxes MUST be sized using these rules:

// TEXT BOX HEIGHT RULE:
// - height ≥ fontSize × lineCount × 1.3

// TEXT BOX WIDTH RULE:
// - width ≥ 0.6 × fontSize × maxCharsPerLine

// HEADLINE RULES:
// - Max fontSize: 64 px
// - Max text height: 96 px
// - If text length > 8 characters → wrap into multiple lines
// - Headline MUST NOT dominate more than its container

// MINIMUM FONT SIZE:
// - Minimum fontSize allowed: 12 px
// - If content cannot fit → reduce fontSize first, then increase height

// ================================================================================
// LAYOUT SAFETY RULES
// ================================================================================
// - Maintain minimum 12 px padding from canvas edges
// - Avoid tight boxes that risk clipping
// - Prefer vertical stacking over crowding
// - Layout must look balanced and print-safe

// ================================================================================
// ELEMENT EXTRACTION
// ================================================================================
// Reconstruct ALL visible elements from HTML:
// - Text blocks → type: "text"
// - Images → type: "image"
// - Decorative shapes → type: "figure"
// - Frames/containers → type: "guideline"

// DO NOT invent decorative elements.

// ================================================================================
// OUTPUT FORMAT (EXACT)
// ================================================================================
// {
//   "audios": [],
//   "dpi": 72,
//   "fonts": [],
//   "height": 288,
//   "pages": [
//     {
//       "id": "generated_page_id",
//       "background": "white",
//       "bleed": 0,
//       "children": [],
//       "duration": 5000,
//       "height": "auto",
//       "width": "auto"
//     }
//   ],
//   "unit": "px",
//   "width": 432
// }

// ================================================================================
// SAMPLE editorData (STRUCTURE ONLY)
// ================================================================================
// ${metaData}

// ================================================================================
// HTML INPUT (SOURCE OF TRUTH)
// ================================================================================
// ${html}
// `;

// Just replace your current prompt with the improved one

// ======================the long
const systemPrompt = `# PostGrid EditorData Reconstruction Engine - IMPROVED PROMPT

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
================================================================================
MINIMUM FONT SIZE (STRICT PRINT LIMIT)
================================================================================
- The absolute minimum fontSize allowed is **14**.
- If your calculated fontSize (fontSize_html × scaleX) is less than 14, you MUST:
  1. Set "fontSize": 14
  2. Recalculate the bounding box (width/height) to ensure this larger font still fits.
  3. Never output a font size smaller than 14.

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

**MULTI-LINE TEXT HANDLING:**
When HTML shows text stacked vertically (e.g., "HEALTHY\nHAPPY\nSMILES!"):
1. Extract each line as shown in the design
2. Join with "\n" in the text property
3. Calculate correct lineHeight ratio from HTML
4. Adjust element height to accommodate all lines
5. Preserve visual appearance exactly

Example:
"html
<div style="font-size:150px; line-height:140px;">HEALTHY</div>
<div style="font-size:150px; line-height:140px;">HAPPY</div>
<div style="font-size:150px; line-height:140px;">SMILES!</div>
"

Should become:
"json
{
  "text": "HEALTHY\nHAPPY\nSMILES!",
  "fontSize": 59.88,  // scaled from 150px
  "lineHeight": 0.933,  // 140/150 = 0.933
  "height": 180  // sufficient for 3 lines
}
"

**COLOR ACCURACY:**
- Extract EXACT colors from HTML/CSS
- Convert to rgba format: "rgba(R,G,B,A)"
- Do NOT approximate or change colors
- Verify: Pink text in HTML → Pink text in output
- Verify: Purple text in HTML → Purple text in output
- Verify: Teal background in HTML → Teal background in output

**ELEMENT DETECTION:**
Detect and create elements for:
- ALL text blocks (even small disclaimer text)
- ALL images
- ALL background colors (as figure/rect)
- ALL circles (border-radius ≥ 50%)
- ALL decorative shapes
- Dotted dividers (as figure with dash property)

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
  "letterSpacing": 0,  // scaled from HTML
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
   - Calculate ratio from HTML
   - If HTML has line-height: 140px and font-size: 150px
   - lineHeight = 140/150 = 0.933
   - If not specified, use 1.2 as default

6. **letterSpacing:**
   - Extract from CSS letter-spacing
   - SCALE using scaleX
   - Example: 6px → 6 × 0.3992 = 2.4px

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

// CONDENSED POSTGRID PROMPT - Use this in your Supabase function

// const systemPrompt =`# PostGrid Reconstruction Engine (Optimized)
// Strictly convert HTML to PostGrid editorData JSON. Output ONLY JSON.

// ## PHASE 1: MATH & SCALING
// - Canvas: 600x408. 
// - ScaleX = 600 / HTML_W | ScaleY = 408 / HTML_H.
// - pgFontSize = htmlFontSize * ScaleX (Always use ScaleX for fonts).
// - Absolute Positioning: child_x = (parent_left + child_left) * ScaleX.

// ## PHASE 2: ELEMENT EXTRACTION
// - FLATTEN: Convert all nested HTML divs/flexbox into a FLAT array of elements.
// - TEXT: Use \n for multi-line. Calculate lineHeight = (line-height / font-size).
// - FIGURES: subType "circle" if border-radius >= 50%. subType "rect" for backgrounds.
// - IMAGES: keepRatio: true. Use absolute src URLs.
// - COLORS: Convert all CSS colors to rgba(R, G, B, A).

// ## PHASE 3: SCHEMA & VALIDATION
// Ensure EVERY element has these exact keys:
// id, name, type, x, y, width, height, rotation, opacity, visible, showInExport, draggable, resizable, removable, selectable, styleEditable, alwaysOnTop, contentEditable, animations[], blurEnabled, blurRadius, brightness, brightnessEnabled, grayscaleEnabled, sepiaEnabled, shadowEnabled.

// - Validation: No strings for numbers. No strings for booleans.
// - JSON must match Reference Metadata structure exactly.

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
// - Ensure all required properties are present`


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