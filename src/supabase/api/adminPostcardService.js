/**
 * Admin Postcard Service
 * Handles postcard tracking and management for admin portal
 */

import { supabase } from '../integration/client';

export const adminPostcardService = {
  /**
   * Get postcard events with filtering
   */
  async getPostcardEvents({
    campaignId = null,
    eventType = null,
    limit = 50,
    offset = 0,
    startDate = null,
    endDate = null,
  } = {}) {
    try {
      let query = supabase
        .from('postcard_events')
        .select(`
          *,
          campaigns:campaign_id (
            id,
            campaign_name,
            user_id
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (campaignId) {
        query = query.eq('campaign_id', campaignId);
      }

      if (eventType) {
        query = query.eq('event_type', eventType);
      }

      if (startDate) {
        query = query.gte('created_at', startDate);
      }

      if (endDate) {
        query = query.lte('created_at', endDate);
      }

      query = query.range(offset, offset + limit - 1);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        success: true,
        events: data || [],
        total: count || 0,
        pagination: {
          limit,
          offset,
          hasMore: (offset + limit) < (count || 0),
        },
      };
    } catch (error) {
      console.error('Error fetching postcard events:', error);
      throw error;
    }
  },

  /**
   * Get postcard delivery statistics
   */
  async getDeliveryStats({ campaignId = null, startDate = null, endDate = null } = {}) {
    try {
      let baseQuery = supabase.from('postcard_events').select('event_type');

      if (campaignId) {
        baseQuery = baseQuery.eq('campaign_id', campaignId);
      }

      if (startDate) {
        baseQuery = baseQuery.gte('created_at', startDate);
      }

      if (endDate) {
        baseQuery = baseQuery.lte('created_at', endDate);
      }

      const { data, error } = await baseQuery;

      if (error) throw error;

      // Count events by type
      const stats = {
        total: data?.length || 0,
        created: 0,
        ready: 0,
        printing: 0,
        in_transit: 0,
        delivered: 0,
        returned: 0,
        cancelled: 0,
      };

      data?.forEach((event) => {
        if (stats.hasOwnProperty(event.event_type)) {
          stats[event.event_type]++;
        }
      });

      // Calculate rates
      const sentCount = stats.created || 1;
      stats.deliveryRate = ((stats.delivered / sentCount) * 100).toFixed(1);
      stats.returnRate = ((stats.returned / sentCount) * 100).toFixed(1);
      stats.inTransitCount = stats.in_transit;

      return {
        success: true,
        stats,
      };
    } catch (error) {
      console.error('Error fetching delivery stats:', error);
      throw error;
    }
  },

  /**
   * Get postcards with issues (returned, cancelled)
   */
  async getProblematicPostcards({ limit = 20, offset = 0 } = {}) {
    try {
      const { data, error, count } = await supabase
        .from('postcard_events')
        .select(`
          *,
          campaigns:campaign_id (
            id,
            campaign_name,
            user_id
          )
        `, { count: 'exact' })
        .in('event_type', ['returned', 'cancelled'])
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Enrich with user info
      const enrichedData = await Promise.all(
        (data || []).map(async (event) => {
          if (event.campaigns?.user_id) {
            const { data: user } = await supabase
              .from('profile')
              .select('email, full_name')
              .eq('user_id', event.campaigns.user_id)
              .single();

            return {
              ...event,
              user: user || null,
            };
          }
          return event;
        })
      );

      return {
        success: true,
        postcards: enrichedData,
        total: count || 0,
      };
    } catch (error) {
      console.error('Error fetching problematic postcards:', error);
      throw error;
    }
  },

  /**
   * Get postcard history for a specific postcard
   */
  async getPostcardHistory(postgridPostcardId) {
    try {
      const { data, error } = await supabase
        .from('postcard_events')
        .select('*')
        .eq('postgrid_postcard_id', postgridPostcardId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return {
        success: true,
        history: data || [],
      };
    } catch (error) {
      console.error('Error fetching postcard history:', error);
      throw error;
    }
  },

  /**
   * Get newmover postcard details
   */
  async getNewMoverPostcardDetails(newMoverId) {
    try {
      const { data, error } = await supabase
        .from('newmover')
        .select(`
          *,
          campaigns:campaign_id (
            id,
            campaign_name,
            user_id
          )
        `)
        .eq('id', newMoverId)
        .single();

      if (error) throw error;

      return {
        success: true,
        mover: data,
      };
    } catch (error) {
      console.error('Error fetching new mover details:', error);
      throw error;
    }
  },

  /**
   * Get campaign postcard summary
   */
  async getCampaignPostcardSummary(campaignId) {
    try {
      // Get campaign with postcard stats
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select(`
          id,
          campaign_name,
          postcards_sent,
          postcards_delivered,
          postcards_in_transit,
          postcards_returned,
          postcards_cancelled,
          total_cost,
          polling_enabled,
          last_polled_at
        `)
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;

      // Get recent events
      const { data: recentEvents } = await supabase
        .from('postcard_events')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get newmovers with postcard info
      const { data: movers, count: moverCount } = await supabase
        .from('newmover')
        .select('id, full_name, postgrid_status, postcard_sent, delivery_date', { count: 'exact' })
        .eq('campaign_id', campaignId)
        .eq('postcard_sent', true);

      return {
        success: true,
        campaign,
        recentEvents: recentEvents || [],
        movers: movers || [],
        totalMovers: moverCount || 0,
      };
    } catch (error) {
      console.error('Error fetching campaign postcard summary:', error);
      throw error;
    }
  },

  /**
   * Retry a failed/returned postcard
   * This creates a note and marks for manual review
   */
  async markForReview(postgridPostcardId, notes) {
    try {
      // Get the event
      const { data: event, error: fetchError } = await supabase
        .from('postcard_events')
        .select('*')
        .eq('postgrid_postcard_id', postgridPostcardId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      // Log admin action
      const { error: logError } = await supabase
        .from('admin_activity_logs')
        .insert({
          admin_id: null, // Will be set by caller
          action_type: 'postcard_marked_for_review',
          target_type: 'postcard',
          target_id: postgridPostcardId,
          metadata: {
            campaign_id: event.campaign_id,
            notes,
            original_status: event.event_type,
          },
        });

      if (logError) throw logError;

      return {
        success: true,
        message: 'Postcard marked for review',
      };
    } catch (error) {
      console.error('Error marking postcard for review:', error);
      throw error;
    }
  },

  /**
   * Subscribe to real-time postcard events
   */
  subscribeToPostcardEvents(callback) {
    const subscription = supabase
      .channel('postcard-events-admin')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'postcard_events',
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return {
      unsubscribe: () => subscription.unsubscribe(),
    };
  },

  /**
   * Fetch PostGrid template details including HTML content
   * @param {string} templateId - PostGrid template ID
   * @returns {Promise<{success: boolean, template?: object, error?: string}>}
   */
  async fetchPostGridTemplate(templateId) {
    try {
      if (!templateId) {
        return { success: false, error: 'Template ID is required' };
      }

      const apiKey = import.meta.env.VITE_POSTGRID_API_KEY;

      const response = await fetch(
        `https://api.postgrid.com/print-mail/v1/templates/${templateId}`,
        {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `Failed to fetch template: ${response.status}`,
        };
      }

      const template = await response.json();

      return {
        success: true,
        template: {
          id: template.id,
          description: template.description,
          html: template.html,
          metadata: template.metadata,
          createdAt: template.createdAt,
          updatedAt: template.updatedAt,
        },
      };
    } catch (error) {
      console.error('Error fetching PostGrid template:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Fetch both front and back PostGrid templates for a campaign
   * @param {string} masterTemplateId - Front template ID
   * @param {string} templateId - Back template ID (optional)
   * @returns {Promise<{success: boolean, frontHtml?: string, backHtml?: string}>}
   */
  async fetchCampaignTemplates(masterTemplateId, templateId) {
    try {
      const results = { success: true, frontHtml: null, backHtml: null };

      // Fetch front template
      if (masterTemplateId) {
        const frontResult = await this.fetchPostGridTemplate(masterTemplateId);
        if (frontResult.success && frontResult.template?.html) {
          results.frontHtml = frontResult.template.html;
        }
      }

      // Fetch back template if different from front
      if (templateId && templateId !== masterTemplateId) {
        const backResult = await this.fetchPostGridTemplate(templateId);
        if (backResult.success && backResult.template?.html) {
          results.backHtml = backResult.template.html;
        }
      }

      return results;
    } catch (error) {
      console.error('Error fetching campaign templates:', error);
      return { success: false, error: error.message };
    }
  },
};

export default adminPostcardService;
