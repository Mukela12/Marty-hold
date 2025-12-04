import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
console.log('[create-customer-portal-session] Stripe key configured:', !!stripeSecretKey)

if (!stripeSecretKey) {
  console.error('[create-customer-portal-session] CRITICAL: STRIPE_SECRET_KEY is not set!')
}

const stripe = new Stripe(stripeSecretKey || '', {
  apiVersion: '2023-10-16',
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('[create-customer-portal-session] Request received')

  try {
    // Get the JWT token from the request
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[create-customer-portal-session] Missing Authorization header')
      throw new Error('Unauthorized: Missing authorization header')
    }

    // Create Supabase client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Extract JWT token from "Bearer <token>" header
    const token = authHeader.replace('Bearer ', '').trim()

    // Verify the JWT and get user (pass token explicitly for Edge Functions)
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      console.error('[create-customer-portal-session] Auth error:', authError)
      throw new Error('Unauthorized: Invalid token')
    }

    console.log('[create-customer-portal-session] Authenticated user:', user.id)

    // Parse request body
    const { returnUrl } = await req.json()

    // Validate input
    if (!returnUrl) {
      console.error('[create-customer-portal-session] Missing return URL')
      throw new Error('Return URL is required')
    }

    console.log('[create-customer-portal-session] Return URL:', returnUrl)

    // Get customer from Supabase database (security check)
    const { data: customer, error: customerError } = await supabaseClient
      .from('customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single()

    if (customerError || !customer) {
      console.error('[create-customer-portal-session] Customer not found:', customerError)
      throw new Error('No customer found for this user. Please add a payment method first.')
    }

    console.log('[create-customer-portal-session] Found customer:', customer.stripe_customer_id)

    // Create Stripe Customer Portal session
    console.log('[create-customer-portal-session] Creating billing portal session')
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.stripe_customer_id,
      return_url: returnUrl,
    })

    console.log('[create-customer-portal-session] Session created:', session.id)

    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('[create-customer-portal-session] Error:', error)
    console.error('[create-customer-portal-session] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })

    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message?.includes('Unauthorized') ? 401 :
               error.message?.includes('No customer found') ? 404 : 500,
      },
    )
  }
})
