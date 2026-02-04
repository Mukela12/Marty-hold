-- Migration: Add PostGrid template ID and postcard tracking
-- Date: 2026-02-04
-- Description: Adds fields for PostGrid template integration and postcard status tracking

-- ============================================================================
-- 1. ADD POSTGRID TEMPLATE ID TO CAMPAIGNS
-- ============================================================================
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS postgrid_template_id TEXT,
ADD COLUMN IF NOT EXISTS postgrid_back_template_id TEXT,
ADD COLUMN IF NOT EXISTS postcard_front_html TEXT,
ADD COLUMN IF NOT EXISTS postcard_back_html TEXT;

COMMENT ON COLUMN campaigns.postgrid_template_id IS 'PostGrid template ID for front of postcard';
COMMENT ON COLUMN campaigns.postgrid_back_template_id IS 'PostGrid template ID for back of postcard (optional)';
COMMENT ON COLUMN campaigns.postcard_front_html IS 'HTML content for front of postcard (fallback if no template)';
COMMENT ON COLUMN campaigns.postcard_back_html IS 'HTML content for back of postcard';

-- ============================================================================
-- 2. ADD POSTCARD STATUS TRACKING TO NEWMOVER TABLE
-- ============================================================================
-- Add additional tracking fields if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'newmover' AND column_name = 'postgrid_status_history') THEN
    ALTER TABLE newmover ADD COLUMN postgrid_status_history JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'newmover' AND column_name = 'delivery_date') THEN
    ALTER TABLE newmover ADD COLUMN delivery_date TIMESTAMP WITH TIME ZONE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'newmover' AND column_name = 'return_reason') THEN
    ALTER TABLE newmover ADD COLUMN return_reason TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'newmover' AND column_name = 'postgrid_tracking_number') THEN
    ALTER TABLE newmover ADD COLUMN postgrid_tracking_number TEXT;
  END IF;
END $$;

COMMENT ON COLUMN newmover.postgrid_status_history IS 'History of PostGrid status changes with timestamps';
COMMENT ON COLUMN newmover.delivery_date IS 'Date postcard was delivered';
COMMENT ON COLUMN newmover.return_reason IS 'Reason if postcard was returned';
COMMENT ON COLUMN newmover.postgrid_tracking_number IS 'USPS tracking number from PostGrid';

-- ============================================================================
-- 3. CREATE POSTCARD EVENTS TABLE FOR WEBHOOK TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS postcard_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  postgrid_postcard_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- 'created', 'ready', 'printing', 'in_transit', 'delivered', 'returned', 'cancelled'
  event_data JSONB,
  campaign_id UUID REFERENCES campaigns(id),
  new_mover_id UUID REFERENCES newmover(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_postcard_events_postgrid_id ON postcard_events(postgrid_postcard_id);
CREATE INDEX IF NOT EXISTS idx_postcard_events_campaign_id ON postcard_events(campaign_id);
CREATE INDEX IF NOT EXISTS idx_postcard_events_event_type ON postcard_events(event_type);
CREATE INDEX IF NOT EXISTS idx_postcard_events_created_at ON postcard_events(created_at DESC);

-- Enable RLS
ALTER TABLE postcard_events ENABLE ROW LEVEL SECURITY;

-- Admins can view all events
CREATE POLICY "Admins can view all postcard events"
  ON postcard_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profile
      WHERE profile.user_id = auth.uid()
      AND profile.role IN ('admin', 'super_admin')
    )
  );

-- Users can view their own campaign events
CREATE POLICY "Users can view own campaign postcard events"
  ON postcard_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = postcard_events.campaign_id
      AND campaigns.user_id = auth.uid()
    )
  );

-- Allow service role to insert (for webhook handler)
CREATE POLICY "Service role can insert postcard events"
  ON postcard_events
  FOR INSERT
  WITH CHECK (true);

GRANT SELECT, INSERT ON postcard_events TO authenticated;
GRANT SELECT, INSERT ON postcard_events TO service_role;

-- ============================================================================
-- 4. ADD CAMPAIGN POSTCARD STATISTICS
-- ============================================================================
ALTER TABLE campaigns
ADD COLUMN IF NOT EXISTS postcards_delivered INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS postcards_in_transit INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS postcards_returned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS postcards_cancelled INTEGER DEFAULT 0;

COMMENT ON COLUMN campaigns.postcards_delivered IS 'Count of postcards successfully delivered';
COMMENT ON COLUMN campaigns.postcards_in_transit IS 'Count of postcards currently in transit';
COMMENT ON COLUMN campaigns.postcards_returned IS 'Count of postcards returned to sender';
COMMENT ON COLUMN campaigns.postcards_cancelled IS 'Count of cancelled postcards';

-- ============================================================================
-- 5. CREATE FUNCTION TO UPDATE CAMPAIGN STATS FROM EVENTS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_campaign_postcard_stats(p_campaign_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE campaigns
  SET
    postcards_delivered = (
      SELECT COUNT(DISTINCT postgrid_postcard_id)
      FROM postcard_events
      WHERE campaign_id = p_campaign_id AND event_type = 'delivered'
    ),
    postcards_in_transit = (
      SELECT COUNT(DISTINCT pe.postgrid_postcard_id)
      FROM postcard_events pe
      WHERE pe.campaign_id = p_campaign_id
      AND pe.event_type = 'in_transit'
      AND NOT EXISTS (
        SELECT 1 FROM postcard_events pe2
        WHERE pe2.postgrid_postcard_id = pe.postgrid_postcard_id
        AND pe2.event_type IN ('delivered', 'returned', 'cancelled')
      )
    ),
    postcards_returned = (
      SELECT COUNT(DISTINCT postgrid_postcard_id)
      FROM postcard_events
      WHERE campaign_id = p_campaign_id AND event_type = 'returned'
    ),
    postcards_cancelled = (
      SELECT COUNT(DISTINCT postgrid_postcard_id)
      FROM postcard_events
      WHERE campaign_id = p_campaign_id AND event_type = 'cancelled'
    ),
    updated_at = NOW()
  WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. CREATE INDEX FOR FASTER POLLING QUERIES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_campaigns_polling ON campaigns(status, polling_enabled, approval_status)
WHERE status = 'active' AND polling_enabled = true AND approval_status = 'approved';

CREATE INDEX IF NOT EXISTS idx_newmover_postcard_sent ON newmover(postcard_sent, campaign_id);
