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
