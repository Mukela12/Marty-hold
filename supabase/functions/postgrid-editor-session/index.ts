// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: any) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    };

    // Request Body
    const { templateId } = await req.json();

    // ENV Variables
    const postGridUrl = Deno.env.get("VITE_POSTGRID_URL");
    const postGridKey = Deno.env.get("POSTGRID_API_KEY");

    // Base URL
    const sessionUrl = `${postGridUrl}/template_editor_sessions`;

    const requestParams = {
      template: templateId
    };

    const postGridEditorResponse = await fetch(sessionUrl, {
      method: "POST",
      headers: {
        "x-api-key": postGridKey!,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(requestParams)
    });
    const postGridResponse = await postGridEditorResponse.json();
    
    return new Response(JSON.stringify({ success: true, postGridResponse }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (exception: any) {
    console.error("Error creating editor session:", exception);
    return new Response(JSON.stringify({ success: false, message: exception.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }); 
  };
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/postgrid-editor-session' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
