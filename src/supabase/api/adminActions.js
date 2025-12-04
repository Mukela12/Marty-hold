// Admin Actions - Real Database Operations
// Phase 2: Campaign approval, rejection, pause, delete, and provider connection

import { supabase } from '../integration/client';

// ============================================
// CAMPAIGN ACTIONS
// ============================================

/**
 * Approve a campaign and charge the user
 * CRITICAL: This function now integrates with Stripe billing
 */
export const approveCampaign = async (campaignId, adminId) => {
  try {
    console.log('[Admin Actions] Approving campaign with billing:', campaignId);

    // Import campaign service for billing
    const { default: campaignService } = await import('./campaignService.js');

    // First, check if user has payment method
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('user_id, campaign_name, postcards_sent, total_recipients, payment_status')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Error fetching campaign:', campaignError);
      return { success: false, error: 'Campaign not found' };
    }

    // Check if user has payment method
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('user_id', campaign.user_id)
      .single();

    if (!customer) {
      return {
        success: false,
        error: 'User has no payment method on file. Please ask them to add a payment method in Settings → Billing before approving.',
        needsPaymentMethod: true
      };
    }

    const { data: paymentMethod } = await supabase
      .from('payment_methods')
      .select('id')
      .eq('customer_id', customer.id)
      .eq('is_default', true)
      .single();

    if (!paymentMethod) {
      return {
        success: false,
        error: 'User has no default payment method. Please ask them to add a payment method before approving.',
        needsPaymentMethod: true
      };
    }

    // Calculate cost for confirmation
    const postcardCount = campaign.postcards_sent || campaign.total_recipients || 0;
    const estimatedCost = postcardCount * 3.00;

    console.log(`[Admin Actions] Campaign: ${campaign.campaign_name}`);
    console.log(`[Admin Actions] Postcards: ${postcardCount}`);
    console.log(`[Admin Actions] Estimated cost: $${estimatedCost.toFixed(2)}`);

    // CHARGE THE CAMPAIGN
    try {
      const chargeResult = await campaignService.chargeCampaignOnApproval(campaignId, adminId);

      console.log('[Admin Actions] Charge result:', chargeResult);

      if (chargeResult.success) {
        if (chargeResult.status === 'succeeded') {
          // Payment succeeded - campaign is approved and paid
          await supabase
            .from('campaigns')
            .update({
              approval_status: 'approved',
              status: 'active'
            })
            .eq('id', campaignId);

          // Log admin activity
          await logAdminActivity(adminId, 'campaign_approved', 'campaign', campaignId, {
            campaign_name: campaign.campaign_name,
            amount_charged: chargeResult.amount,
            transaction_id: chargeResult.transactionId
          });

          return {
            success: true,
            message: `Campaign approved and charged $${chargeResult.amount.toFixed(2)}`,
            campaign: campaign,
            transaction: {
              id: chargeResult.transactionId,
              amount: chargeResult.amount,
              status: 'succeeded'
            }
          };

        } else if (chargeResult.status === 'requires_action') {
          // Payment requires 3D Secure authentication
          // Campaign stays in pending_review until user completes authentication

          await logAdminActivity(adminId, 'campaign_approval_pending', 'campaign', campaignId, {
            campaign_name: campaign.campaign_name,
            reason: 'Payment requires 3D Secure authentication',
            action_url: chargeResult.actionUrl
          });

          return {
            success: true,
            message: 'Payment requires authentication. User will be notified via email to complete 3D Secure.',
            requiresAction: true,
            actionUrl: chargeResult.actionUrl,
            campaign: campaign
          };

        } else if (chargeResult.status === 'processing') {
          // Payment is processing - webhook will update when complete

          await logAdminActivity(adminId, 'campaign_approval_processing', 'campaign', campaignId, {
            campaign_name: campaign.campaign_name,
            transaction_id: chargeResult.transactionId
          });

          return {
            success: true,
            message: 'Payment is processing. Campaign will be automatically approved when payment completes.',
            processing: true,
            campaign: campaign
          };

        } else {
          // Unknown status
          throw new Error(chargeResult.message || 'Unknown payment status');
        }

      } else {
        // Charge failed
        throw new Error(chargeResult.error || 'Payment failed');
      }

    } catch (chargeError) {
      // Payment failed - log error and return user-friendly message
      console.error('[Admin Actions] Payment error:', chargeError);

      await logAdminActivity(adminId, 'campaign_approval_failed', 'campaign', campaignId, {
        campaign_name: campaign.campaign_name,
        error: chargeError.message,
        reason: 'Payment failed'
      });

      // Get user-friendly error message
      const userFriendlyError = chargeError.userFriendlyMessage ||
        campaignService.getUserFriendlyPaymentError(chargeError.message) ||
        chargeError.message;

      return {
        success: false,
        error: userFriendlyError,
        technicalError: chargeError.message,
        paymentFailed: true
      };
    }

  } catch (error) {
    console.error('Error in approveCampaign:', error);
    return {
      success: false,
      error: error.message || 'Failed to approve campaign'
    };
  }
};

/**
 * Reject a campaign with a reason
 */
export const rejectCampaign = async (campaignId, adminId, reason) => {
  try {
    if (!reason || reason.trim().length === 0) {
      return { success: false, error: 'Rejection reason is required' };
    }

    const { data, error } = await supabase
      .from('campaigns')
      .update({
        approval_status: 'rejected',
        rejected_by: adminId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
        status: 'rejected' // Update status field to match approval_status
      })
      .eq('id', campaignId)
      .select()
      .single();

    if (error) {
      console.error('Error rejecting campaign:', error);
      return { success: false, error: error.message };
    }

    // Log admin activity
    await logAdminActivity(adminId, 'campaign_rejected', 'campaign', campaignId, {
      campaign_name: data.campaign_name,
      reason
    });

    return { success: true, campaign: data };
  } catch (error) {
    console.error('Error in rejectCampaign:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Pause an active campaign with a reason
 */
export const pauseCampaign = async (campaignId, adminId, reason) => {
  try {
    if (!reason || reason.trim().length === 0) {
      return { success: false, error: 'Pause reason is required' };
    }

    const { data, error } = await supabase
      .from('campaigns')
      .update({
        paused_by: adminId,
        paused_at: new Date().toISOString(),
        pause_reason: reason,
        status: 'paused'
      })
      .eq('id', campaignId)
      .select()
      .single();

    if (error) {
      console.error('Error pausing campaign:', error);
      return { success: false, error: error.message };
    }

    // Log admin activity
    await logAdminActivity(adminId, 'campaign_paused', 'campaign', campaignId, {
      campaign_name: data.campaign_name,
      reason
    });

    return { success: true, campaign: data };
  } catch (error) {
    console.error('Error in pauseCampaign:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Resume a paused campaign
 */
export const resumeCampaign = async (campaignId, adminId) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .update({
        paused_by: null,
        paused_at: null,
        pause_reason: null,
        status: 'active'
      })
      .eq('id', campaignId)
      .select()
      .single();

    if (error) {
      console.error('Error resuming campaign:', error);
      return { success: false, error: error.message };
    }

    // Log admin activity
    await logAdminActivity(adminId, 'campaign_resumed', 'campaign', campaignId, {
      campaign_name: data.campaign_name
    });

    return { success: true, campaign: data };
  } catch (error) {
    console.error('Error in resumeCampaign:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Soft delete a campaign
 */
export const deleteCampaign = async (campaignId, adminId) => {
  try {
    const { data, error } = await supabase
      .from('campaigns')
      .update({
        deleted_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .select()
      .single();

    if (error) {
      console.error('Error deleting campaign:', error);
      return { success: false, error: error.message };
    }

    // Log admin activity
    await logAdminActivity(adminId, 'campaign_deleted', 'campaign', campaignId, {
      campaign_name: data.campaign_name
    });

    return { success: true, campaign: data };
  } catch (error) {
    console.error('Error in deleteCampaign:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Connect a provider to a campaign
 */
export const connectProvider = async (campaignId, adminId, provider) => {
  try {
    if (!provider || !['lob', 'postgrid', 'clicksend'].includes(provider)) {
      return { success: false, error: 'Invalid provider' };
    }

    const { data, error } = await supabase
      .from('campaigns')
      .update({
        provider,
        provider_connected_at: new Date().toISOString()
      })
      .eq('id', campaignId)
      .select()
      .single();

    if (error) {
      console.error('Error connecting provider:', error);
      return { success: false, error: error.message };
    }

    // Log admin activity
    await logAdminActivity(adminId, 'provider_connected', 'campaign', campaignId, {
      campaign_name: data.campaign_name,
      provider
    });

    return { success: true, campaign: data };
  } catch (error) {
    console.error('Error in connectProvider:', error);
    return { success: false, error: error.message };
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Log admin activity to database
 */
const logAdminActivity = async (adminId, actionType, targetType, targetId, metadata = {}) => {
  try {
    const { error } = await supabase
      .from('admin_activity_logs')
      .insert({
        admin_id: adminId,
        action_type: actionType,
        target_type: targetType,
        target_id: targetId,
        metadata
      });

    if (error) {
      console.error('Error logging admin activity:', error);
    }
  } catch (error) {
    console.error('Error in logAdminActivity:', error);
  }
};

/**
 * Get current admin user ID from session
 */
export const getCurrentAdminId = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      console.error('Error getting current user:', error);
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Error in getCurrentAdminId:', error);
    return null;
  }
};

/**
 * Check if current user is an admin
 */
export const checkIsAdmin = async () => {
  try {
    const userId = await getCurrentAdminId();
    if (!userId) return false;

    const { data, error } = await supabase
      .from('profile')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (error || !data) {
      console.error('Error checking admin role:', error);
      return false;
    }

    return ['admin', 'super_admin'].includes(data.role);
  } catch (error) {
    console.error('Error in checkIsAdmin:', error);
    return false;
  }
};

// Export all functions
export default {
  approveCampaign,
  rejectCampaign,
  pauseCampaign,
  resumeCampaign,
  deleteCampaign,
  connectProvider,
  getCurrentAdminId,
  checkIsAdmin
};
