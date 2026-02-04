import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * POSTGRID WEBHOOK HANDLER
 *
 * This Edge Function handles webhook events from PostGrid for postcard status updates.
 * PostGrid sends events when postcards change status:
 * - ready: Postcard is ready for production
 * - printing: Postcard is being printed
 * - processed_for_delivery: Ready for USPS
 * - in_transit: In USPS mail stream
 * - delivered: Successfully delivered
 * - returned: Returned to sender (bad address, etc.)
 * - cancelled: Postcard was cancelled
 *
 * Documentation: https://postgrid.readme.io/docs/webhooks
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-postgrid-signature',
}

// Initialize environment variables
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const postgridWebhookSecret = Deno.env.get('POSTGRID_WEBHOOK_SECRET') || ''

interface PostGridWebhookEvent {
  id: string
  object: string
  type: string // 'postcard.created', 'postcard.updated', etc.
  data: {
    object: PostGridPostcard
    previousAttributes?: Record<string, any>
  }
  createdAt: string
}

interface PostGridPostcard {
  id: string
  object: 'postcard'
  status: string // 'ready', 'printing', 'in_transit', 'delivered', 'returned', 'cancelled'
  live: boolean
  description?: string
  sendDate?: string
  carrierTracking?: string
  metadata?: {
    campaign_id?: string
    user_id?: string
    new_mover_id?: string
    melissa_address_key?: string
  }
  to?: {
    firstName?: string
    lastName?: string
    addressLine1?: string
    city?: string
    provinceOrState?: string
    postalOrZip?: string
  }
  createdAt: string
  updatedAt: string
}

/**
 * Map PostGrid status to friendly display status
 */
function mapStatus(postgridStatus: string): string {
  const statusMap: Record<string, string> = {
    'ready': 'Ready for Printing',
    'printing': 'Printing',
    'processed_for_delivery': 'Processed',
    'in_transit': 'In Transit',
    'delivered': 'Delivered',
    'returned': 'Returned',
    'cancelled': 'Cancelled',
  }
  return statusMap[postgridStatus] || postgridStatus
}

/**
 * Determine if status is a problem that needs admin attention
 */
function isProblematicStatus(status: string): boolean {
  return ['returned', 'cancelled'].includes(status)
}

/**
 * Create admin notification for problematic postcards
 */
async function notifyAdminOfIssue(
  supabase: any,
  postcard: PostGridPostcard,
  eventType: string
): Promise<void> {
  try {
    // Get campaign details
    const campaignId = postcard.metadata?.campaign_id
    if (!campaignId) return

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('campaign_name, user_id')
      .eq('id', campaignId)
      .single()

    if (!campaign) return

    // Get user details
    const { data: user } = await supabase
      .from('profile')
      .select('email, full_name')
      .eq('user_id', campaign.user_id)
      .single()

    // Create admin activity log entry
    await supabase.from('admin_activity_logs').insert({
      admin_id: null, // System-generated
      user_id: campaign.user_id,
      action_type: `postcard_${postcard.status}`,
      target_type: 'postcard',
      target_id: postcard.id,
      metadata: {
        campaign_id: campaignId,
        campaign_name: campaign.campaign_name,
        user_email: user?.email,
        user_name: user?.full_name,
        postcard_id: postcard.id,
        status: postcard.status,
        recipient: postcard.to ? `${postcard.to.firstName} ${postcard.to.lastName}` : 'Unknown',
        address: postcard.to?.addressLine1,
        melissa_address_key: postcard.metadata?.melissa_address_key,
        requires_attention: true,
      },
    })

    console.log(`📢 Admin notified of ${postcard.status} postcard: ${postcard.id}`)
  } catch (error) {
    console.error('Failed to notify admin:', error)
  }
}

/**
 * Create user notification about their campaign postcard
 */
async function notifyUserOfStatus(
  supabase: any,
  postcard: PostGridPostcard,
  status: string
): Promise<void> {
  try {
    const userId = postcard.metadata?.user_id
    const campaignId = postcard.metadata?.campaign_id
    if (!userId || !campaignId) return

    // Only notify users for significant status changes
    const notifiableStatuses = ['delivered', 'returned']
    if (!notifiableStatuses.includes(status)) return

    const { data: campaign } = await supabase
      .from('campaigns')
      .select('campaign_name')
      .eq('id', campaignId)
      .single()

    let title: string
    let message: string

    if (status === 'delivered') {
      title = 'Postcard Delivered!'
      message = `A postcard from your campaign "${campaign?.campaign_name}" has been delivered successfully.`
    } else if (status === 'returned') {
      title = 'Postcard Returned'
      message = `A postcard from your campaign "${campaign?.campaign_name}" was returned. Our team will review the issue.`
    } else {
      return
    }

    await supabase.from('notifications').insert({
      user_id: userId,
      type: `postcard_${status}`,
      title,
      message,
      action_url: `/campaign/${campaignId}/details`,
    })

    console.log(`📬 User ${userId} notified of ${status} postcard`)
  } catch (error) {
    console.error('Failed to notify user:', error)
  }
}

/**
 * Update newmover record with postcard status
 */
async function updateNewMoverStatus(
  supabase: any,
  postcard: PostGridPostcard
): Promise<void> {
  const newMoverId = postcard.metadata?.new_mover_id
  if (!newMoverId) {
    console.log('   ⚠️ No new_mover_id in postcard metadata')
    return
  }

  try {
    // Get current status history
    const { data: currentMover } = await supabase
      .from('newmover')
      .select('postgrid_status_history')
      .eq('id', newMoverId)
      .single()

    const statusHistory = currentMover?.postgrid_status_history || []
    statusHistory.push({
      status: postcard.status,
      timestamp: new Date().toISOString(),
      postgrid_updated_at: postcard.updatedAt,
    })

    // Build update object
    const updateData: any = {
      postgrid_status: postcard.status,
      postgrid_status_history: statusHistory,
    }

    // Add tracking number if available
    if (postcard.carrierTracking) {
      updateData.postgrid_tracking_number = postcard.carrierTracking
    }

    // Add delivery date if delivered
    if (postcard.status === 'delivered') {
      updateData.delivery_date = new Date().toISOString()
    }

    // Add return reason if returned
    if (postcard.status === 'returned') {
      updateData.return_reason = 'Address undeliverable or refused'
    }

    await supabase
      .from('newmover')
      .update(updateData)
      .eq('id', newMoverId)

    console.log(`   ✅ Updated newmover ${newMoverId} status to: ${postcard.status}`)
  } catch (error) {
    console.error(`   ❌ Failed to update newmover ${newMoverId}:`, error)
  }
}

/**
 * Update campaign statistics
 */
async function updateCampaignStats(
  supabase: any,
  campaignId: string
): Promise<void> {
  try {
    // Call the SQL function to recalculate stats
    await supabase.rpc('update_campaign_postcard_stats', { p_campaign_id: campaignId })
    console.log(`   📊 Updated campaign ${campaignId} statistics`)
  } catch (error) {
    // If function doesn't exist yet, manually update
    console.log(`   ⚠️ Stats function not available, skipping stats update`)
  }
}

/**
 * Main webhook handler
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    console.log('🔔 PostGrid webhook received')

    // Parse webhook payload
    const payload: PostGridWebhookEvent = await req.json()
    console.log(`   Event type: ${payload.type}`)
    console.log(`   Postcard ID: ${payload.data.object.id}`)
    console.log(`   Status: ${payload.data.object.status}`)

    const postcard = payload.data.object
    const eventType = payload.type
    const campaignId = postcard.metadata?.campaign_id

    // ========================================================================
    // 1. LOG THE EVENT TO POSTCARD_EVENTS TABLE
    // ========================================================================
    const eventData = {
      postgrid_postcard_id: postcard.id,
      event_type: postcard.status,
      event_data: {
        postgrid_event_type: eventType,
        status: postcard.status,
        live: postcard.live,
        sendDate: postcard.sendDate,
        carrierTracking: postcard.carrierTracking,
        previousStatus: payload.data.previousAttributes?.status,
        updatedAt: postcard.updatedAt,
      },
      campaign_id: campaignId || null,
      new_mover_id: postcard.metadata?.new_mover_id || null,
    }

    const { error: eventError } = await supabase
      .from('postcard_events')
      .insert(eventData)

    if (eventError) {
      console.error('   ❌ Failed to log event:', eventError)
    } else {
      console.log(`   📝 Logged event: ${postcard.status}`)
    }

    // ========================================================================
    // 2. UPDATE NEWMOVER RECORD
    // ========================================================================
    await updateNewMoverStatus(supabase, postcard)

    // ========================================================================
    // 3. UPDATE CAMPAIGN STATISTICS
    // ========================================================================
    if (campaignId) {
      await updateCampaignStats(supabase, campaignId)
    }

    // ========================================================================
    // 4. HANDLE PROBLEMATIC STATUSES (returned, cancelled)
    // ========================================================================
    if (isProblematicStatus(postcard.status)) {
      console.log(`   ⚠️ Problematic status detected: ${postcard.status}`)
      await notifyAdminOfIssue(supabase, postcard, eventType)
      await notifyUserOfStatus(supabase, postcard, postcard.status)
    }

    // ========================================================================
    // 5. NOTIFY USER OF DELIVERY
    // ========================================================================
    if (postcard.status === 'delivered') {
      await notifyUserOfStatus(supabase, postcard, 'delivered')
    }

    console.log('✅ Webhook processed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Webhook processed',
        postcard_id: postcard.id,
        status: postcard.status,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('❌ Webhook processing error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
