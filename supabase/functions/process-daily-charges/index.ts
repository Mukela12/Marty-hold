import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize Stripe
const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2024-11-20.acacia',
})

// Initialize Supabase client with service role (bypass RLS)
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

/**
 * DAILY BATCH CHARGE PROCESSOR
 *
 * This Edge Function is designed to be run daily via cron (scheduled at 2am UTC).
 * It processes all pending charges for new mover additions and batches them per campaign.
 *
 * Flow:
 * 1. Query pending_charges WHERE scheduled_for <= today AND processed = false
 * 2. Group charges by campaign_id and user_id
 * 3. For each campaign, create single PaymentIntent for total amount
 * 4. Mark pending_charges as processed
 * 5. Log results
 */

serve(async (req) => {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log('🕐 Starting daily batch charge processing...')

    // ============================================================================
    // FETCH PENDING CHARGES DUE FOR PROCESSING
    // ============================================================================
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD format

    const { data: pendingCharges, error: fetchError } = await supabase
      .from('pending_charges')
      .select(`
        *,
        campaigns!inner(
          id,
          user_id,
          campaign_name,
          payment_status
        )
      `)
      .lte('scheduled_for', today)
      .eq('processed', false)
      .order('campaign_id')

    if (fetchError) {
      console.error('Error fetching pending charges:', fetchError)
      throw fetchError
    }

    if (!pendingCharges || pendingCharges.length === 0) {
      console.log('✅ No pending charges to process today')
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No pending charges to process',
          processed: 0,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log(`📊 Found ${pendingCharges.length} pending charges to process`)

    // ============================================================================
    // GROUP CHARGES BY CAMPAIGN
    // ============================================================================
    const chargesByCampaign = new Map<string, any[]>()

    pendingCharges.forEach((charge) => {
      const campaignId = charge.campaign_id
      if (!chargesByCampaign.has(campaignId)) {
        chargesByCampaign.set(campaignId, [])
      }
      chargesByCampaign.get(campaignId)!.push(charge)
    })

    console.log(`📦 Grouped into ${chargesByCampaign.size} campaigns`)

    // ============================================================================
    // PROCESS EACH CAMPAIGN
    // ============================================================================
    const results = {
      total: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as any[],
    }

    for (const [campaignId, charges] of chargesByCampaign) {
      try {
        await processCampaignCharges(campaignId, charges, supabase, stripe, results)
      } catch (error: any) {
        console.error(`Error processing campaign ${campaignId}:`, error)
        results.errors.push({
          campaignId,
          error: error.message,
        })
      }
    }

    console.log(`✅ Batch processing complete:`, results)

    return new Response(
      JSON.stringify({
        success: true,
        results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('❌ Error in daily batch processing:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

// ============================================================================
// PROCESS CHARGES FOR A SINGLE CAMPAIGN
// ============================================================================
async function processCampaignCharges(
  campaignId: string,
  charges: any[],
  supabase: any,
  stripe: Stripe,
  results: any
) {
  console.log(`\n💳 Processing campaign: ${campaignId}`)
  console.log(`   Charges to combine: ${charges.length}`)

  // Calculate total amount
  const totalAmountCents = charges.reduce((sum, charge) => sum + charge.amount_cents, 0)
  const totalNewMovers = charges.reduce((sum, charge) => sum + charge.new_mover_count, 0)

  console.log(`   Total amount: $${(totalAmountCents / 100).toFixed(2)}`)
  console.log(`   Total new movers: ${totalNewMovers}`)

  // Get campaign and user details
  const firstCharge = charges[0]
  const userId = firstCharge.user_id
  const isTestMode = firstCharge.is_test_mode || false

  // ============================================================================
  // GET CUSTOMER AND PAYMENT METHOD
  // ============================================================================
  const { data: customer, error: customerError } = await supabase
    .from('customers')
    .select('id, stripe_customer_id')
    .eq('user_id', userId)
    .single()

  if (customerError || !customer) {
    console.error('   ❌ Customer not found for user:', userId)
    results.failed++
    return
  }

  const { data: paymentMethod, error: pmError } = await supabase
    .from('payment_methods')
    .select('stripe_payment_method_id, card_last4, card_brand')
    .eq('customer_id', customer.id)
    .eq('is_default', true)
    .single()

  if (pmError || !paymentMethod) {
    console.error('   ❌ No default payment method found')
    results.failed++

    // Mark charges as failed
    for (const charge of charges) {
      await supabase
        .from('pending_charges')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          metadata: { error: 'No default payment method' },
        })
        .eq('id', charge.id)
    }

    // Insert failed transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      campaign_id: campaignId,
      stripe_payment_intent_id: 'failed_no_payment_method',
      stripe_customer_id: customer.stripe_customer_id,
      amount_cents: totalAmountCents,
      amount_dollars: totalAmountCents / 100,
      currency: 'usd',
      status: 'failed',
      billing_reason: 'new_mover_addition',
      new_mover_count: totalNewMovers,
      failure_code: 'no_payment_method',
      failure_message: 'No default payment method on file',
      is_test_mode: isTestMode,
    })

    return
  }

  // ============================================================================
  // CREATE PAYMENT INTENT
  // ============================================================================
  try {
    console.log(`   💰 Creating PaymentIntent...`)

    // Get campaign name for description
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('campaign_name')
      .eq('id', campaignId)
      .single()

    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmountCents,
      currency: 'usd',
      customer: customer.stripe_customer_id,
      payment_method: paymentMethod.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      error_on_requires_action: false,
      description: `New Mover Addition - ${campaign?.campaign_name || 'Campaign'}`,
      metadata: {
        user_id: userId,
        campaign_id: campaignId,
        billing_reason: 'new_mover_addition',
        new_mover_count: totalNewMovers.toString(),
        is_test_mode: isTestMode.toString(),
        charge_count: charges.length.toString(),
      },
    })

    console.log(`   ✅ PaymentIntent created: ${paymentIntent.id}`)
    console.log(`   Status: ${paymentIntent.status}`)

    // ============================================================================
    // HANDLE PAYMENT RESULT
    // ============================================================================
    if (paymentIntent.status === 'succeeded') {
      // Payment succeeded immediately
      console.log(`   ✅ Payment succeeded`)

      const charge = paymentIntent.charges?.data[0]

      // Insert transaction record
      const { data: transaction } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          campaign_id: campaignId,
          stripe_payment_intent_id: paymentIntent.id,
          stripe_charge_id: charge?.id || null,
          stripe_customer_id: customer.stripe_customer_id,
          amount_cents: totalAmountCents,
          amount_dollars: totalAmountCents / 100,
          currency: 'usd',
          status: 'succeeded',
          billing_reason: 'new_mover_addition',
          new_mover_count: totalNewMovers,
          payment_method_last4: paymentMethod.card_last4,
          payment_method_brand: paymentMethod.card_brand,
          receipt_url: charge?.receipt_url || null,
          is_test_mode: isTestMode,
          metadata: paymentIntent.metadata,
        })
        .select()
        .single()

      // Mark all pending charges as processed
      for (const charge of charges) {
        await supabase
          .from('pending_charges')
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
            transaction_id: transaction?.id || null,
          })
          .eq('id', charge.id)
      }

      // Update campaign total cost
      const { data: campaignData } = await supabase
        .from('campaigns')
        .select('total_cost, postcards_sent')
        .eq('id', campaignId)
        .single()

      if (campaignData) {
        await supabase
          .from('campaigns')
          .update({
            total_cost: parseFloat(campaignData.total_cost || 0) + (totalAmountCents / 100),
            postcards_sent: (campaignData.postcards_sent || 0) + totalNewMovers,
            updated_at: new Date().toISOString(),
          })
          .eq('id', campaignId)
      }

      results.succeeded++

    } else if (paymentIntent.status === 'processing') {
      // Payment is processing (will be handled by webhook)
      console.log(`   ⏳ Payment is processing`)

      // Insert transaction with processing status
      const { data: transaction } = await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          campaign_id: campaignId,
          stripe_payment_intent_id: paymentIntent.id,
          stripe_customer_id: customer.stripe_customer_id,
          amount_cents: totalAmountCents,
          amount_dollars: totalAmountCents / 100,
          currency: 'usd',
          status: 'processing',
          billing_reason: 'new_mover_addition',
          new_mover_count: totalNewMovers,
          payment_method_last4: paymentMethod.card_last4,
          payment_method_brand: paymentMethod.card_brand,
          is_test_mode: isTestMode,
          metadata: paymentIntent.metadata,
        })
        .select()
        .single()

      // Mark as processed (webhook will update transaction when complete)
      for (const charge of charges) {
        await supabase
          .from('pending_charges')
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
            transaction_id: transaction?.id || null,
          })
          .eq('id', charge.id)
      }

      results.succeeded++ // Count as success (webhook will handle final status)

    } else {
      // Payment failed or requires action
      console.log(`   ❌ Payment failed or requires action: ${paymentIntent.status}`)

      // Insert failed transaction
      await supabase.from('transactions').insert({
        user_id: userId,
        campaign_id: campaignId,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_customer_id: customer.stripe_customer_id,
        amount_cents: totalAmountCents,
        amount_dollars: totalAmountCents / 100,
        currency: 'usd',
        status: 'failed',
        billing_reason: 'new_mover_addition',
        new_mover_count: totalNewMovers,
        failure_code: paymentIntent.last_payment_error?.code || 'unknown',
        failure_message: paymentIntent.last_payment_error?.message || 'Payment failed',
        payment_method_last4: paymentMethod.card_last4,
        payment_method_brand: paymentMethod.card_brand,
        is_test_mode: isTestMode,
        metadata: paymentIntent.metadata,
      })

      // Mark as processed with error
      for (const charge of charges) {
        await supabase
          .from('pending_charges')
          .update({
            processed: true,
            processed_at: new Date().toISOString(),
            metadata: { error: paymentIntent.last_payment_error?.message || 'Payment failed' },
          })
          .eq('id', charge.id)
      }

      results.failed++
    }

  } catch (error: any) {
    console.error(`   ❌ Error creating payment:`, error.message)

    // Insert failed transaction
    await supabase.from('transactions').insert({
      user_id: userId,
      campaign_id: campaignId,
      stripe_payment_intent_id: 'failed_' + Date.now(),
      stripe_customer_id: customer.stripe_customer_id,
      amount_cents: totalAmountCents,
      amount_dollars: totalAmountCents / 100,
      currency: 'usd',
      status: 'failed',
      billing_reason: 'new_mover_addition',
      new_mover_count: totalNewMovers,
      failure_code: error.code || 'unknown',
      failure_message: error.message,
      is_test_mode: isTestMode,
    })

    // Mark as processed with error
    for (const charge of charges) {
      await supabase
        .from('pending_charges')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
          metadata: { error: error.message },
        })
        .eq('id', charge.id)
    }

    results.failed++
  }

  results.total++
}
