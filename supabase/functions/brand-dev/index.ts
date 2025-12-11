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
    if (req.method === "OPTIONS") {
      return new Response("ok", {
        headers: { ...corsHeaders },
      });
    }

  try {
    const BRANDDEV_URL = Deno.env.get("BRANDDEV_URL");
    const BRANDDEV_KEY = Deno.env.get("BRANDDEV_KEY");

    if (!BRANDDEV_URL || !BRANDDEV_KEY) {
      console.error("[Config Error] Missing BRANDDEV_URL or BRANDDEV_KEY");
      return jsonResponse(
        { error: "Server configuration error. Contact support." },
        500
      );
    }

    
    const { companyUrl } = await req.json();
    
    if (!companyUrl) {
      return jsonResponse({ error: "companyUrl is required" }, 400);
    }

  
    const apiResponse = await fetch(`${BRANDDEV_URL}?domain=${companyUrl}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${BRANDDEV_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );

    const isJson = apiResponse.headers.get("content-type")?.includes("application/json");
    const result = isJson ? await apiResponse.json() : await apiResponse.text();

    if (!apiResponse.ok) {
      console.error("Brand.dev Error:", result);
      return jsonResponse(
        { error: "Brand.dev API error", details: result },
        apiResponse.status
      );
    }

    return jsonResponse({ data: result }, 200);

  } catch (err: any) {
    console.error("Unexpected Server Error:", err);
    return jsonResponse({ error: "Internal Server Error" }, 500);
  }
});


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

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/brand-dev' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
