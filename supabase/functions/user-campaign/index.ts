// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  try{
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: { ...corsHeaders },
      });
    }

      const postGridUrl = Deno.env.get("VITE_POSTGRID_URL");
      const postGridKey = Deno.env.get("VITE_POSTGRID_KEY");
  
      if (!postGridUrl || !postGridKey) {
        throw new Error("Missing PostGrid environment variables");
      }
  
      const { html, name, editorData, editorCollateral, editorCollateralDest, editorPostcardSide } = await req.json();
  
      const response = await fetch(`${postGridUrl}/templates`, {
        method: "POST",
        headers: {
          "x-api-key": postGridKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          description: name,
          html: html,
          metadata: {
            editorData: editorData,
            editorCollateral: editorCollateral,
            editorCollateralDest: editorCollateralDest,
            editorPostcardSide: editorPostcardSide,
          }
        })
      });
  
      const data = await response.json();
  
      return jsonResponse({data}, 201)
    }
  catch(err){
    console.error("Unexpected Server Error:", err);
    return jsonResponse({ error: "Internal Server Error" }, 500);
  }
})
function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/user-campaign' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
