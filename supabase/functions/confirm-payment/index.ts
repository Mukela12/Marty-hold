import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Stripe with latest 2025 API version
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
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

  try {
    // ============================================================================
    // AUTHENTICATION
    // ============================================================================
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify JWT and get user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // ============================================================================
    // PARSE REQUEST
    // ============================================================================
    const { paymentIntentId, paymentMethodId, campaignId } = await req.json()

    if (!paymentIntentId) {
      throw new Error('Payment intent ID is required')
    }

    // ============================================================================
    // VALIDATE CAMPAIGN OWNERSHIP (if provided)
    // ============================================================================
    if (campaignId) {
      const { data: campaign, error: campaignError } = await supabaseClient
        .from('campaigns')
        .select('id, user_id')
        .eq('id', campaignId)
        .eq('user_id', user.id)
        .single()

      if (campaignError || !campaign) {
        throw new Error('Campaign not found or unauthorized')
      }
    }

    // ============================================================================
    // RETRIEVE AND VALIDATE PAYMENT INTENT
    // ============================================================================
    // First, retrieve the payment intent to verify ownership
    const existingPaymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

    // Verify the payment intent belongs to this user
    if (existingPaymentIntent.metadata.user_id !== user.id) {
      throw new Error('Unauthorized: Payment intent does not belong to this user')
    }

    // ============================================================================
    // CONFIRM PAYMENT INTENT
    // ============================================================================
    console.log('Confirming payment intent:', paymentIntentId)

    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
      payment_method: paymentMethodId || undefined,
    })

    console.log('Payment intent confirmed:', {
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
    })

    // ============================================================================
    // RETURN RESPONSE
    // ============================================================================
    return new Response(
      JSON.stringify({
        success: true,
        status: paymentIntent.status,
        paymentIntentId: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        chargeId: paymentIntent.charges?.data[0]?.id || null,
        receiptUrl: paymentIntent.charges?.data[0]?.receipt_url || null,
        requiresAction: paymentIntent.status === 'requires_action' || paymentIntent.status === 'requires_source_action',
        actionUrl: paymentIntent.next_action?.redirect_to_url?.url || null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error: any) {
    console.error('Error confirming payment:', error)

    // ============================================================================
    // ERROR HANDLING
    // ============================================================================
    let userFriendlyMessage = 'An error occurred while confirming your payment.'

    if (error.type === 'StripeCardError') {
      switch (error.code) {
        case 'card_declined':
          userFriendlyMessage = 'Your card was declined. Please try a different payment method.'
          break
        case 'insufficient_funds':
          userFriendlyMessage = 'Insufficient funds. Please use a different payment method.'
          break
        default:
          userFriendlyMessage = error.message
      }
    } else if (error.type === 'StripeInvalidRequestError') {
      userFriendlyMessage = 'Invalid payment request. Please contact support.'
    } else if (error.type === 'StripeAPIError') {
      userFriendlyMessage = 'Payment processing is temporarily unavailable. Please try again later.'
    } else if (error.message.includes('Unauthorized')) {
      userFriendlyMessage = error.message
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: userFriendlyMessage,
        errorDetails: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
