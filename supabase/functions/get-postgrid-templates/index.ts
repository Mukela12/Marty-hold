// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

Deno.serve(async (req: any) => {
  try {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        }
      });
    };

    /* Here Parsing The Body */
    const body = await req.json();
    const { templateId } = body;

    /* Get Env */
    const SECRET_API_KEY = Deno.env.get('VITE_POSTGRID_KEY');
    
    /* Get Templates From The Postgrid API */
    const response = await fetch(`${Deno.env.get('VITE_POSTGRID_URL')}/templates/${templateId}`, {
      method: 'GET',
      headers: {
        'x-api-key': SECRET_API_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    const getTemplateResponse: any = await response.json();
    return new Response(JSON.stringify({ success: true, data: getTemplateResponse }), {
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
  } catch (exception: any) {
    return new Response(
      JSON.stringify({ success: false, error: exception.message }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  };
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/get-postgrid-templates' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
