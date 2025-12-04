-- Migration: Create transactions and pending_charges tables for Stripe payment tracking
-- Created: 2025-01-27
-- Purpose: Track all Stripe charges, refunds, and batch pending charges for new mover additions

-- ============================================================================
-- TRANSACTIONS TABLE
-- ============================================================================
-- Stores all completed and attempted Stripe charges
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,

  -- Stripe IDs
  stripe_payment_intent_id TEXT UNIQUE NOT NULL,
  stripe_charge_id TEXT,
  stripe_customer_id TEXT NOT NULL,

  -- Amount Information
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  amount_dollars DECIMAL(10, 2) NOT NULL CHECK (amount_dollars >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',

  -- Status Information
  status TEXT NOT NULL CHECK (status IN ('processing', 'succeeded', 'failed', 'refunded', 'partially_refunded')),

  -- Billing Context
  billing_reason TEXT NOT NULL CHECK (billing_reason IN ('campaign_approval', 'new_mover_addition', 'manual_charge', 'retry')),
  new_mover_count INTEGER CHECK (new_mover_count >= 0),

  -- Payment Method Information
  payment_method_last4 TEXT,
  payment_method_brand TEXT,

  -- Failure Information
  failure_code TEXT,
  failure_message TEXT,

  -- Receipt and Refund
  receipt_url TEXT,
  refunded_at TIMESTAMPTZ,
  refund_reason TEXT,
  refund_amount_cents INTEGER CHECK (refund_amount_cents >= 0),

  -- Test Mode Flag
  is_test_mode BOOLEAN NOT NULL DEFAULT false,

  -- Additional Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR TRANSACTIONS
-- ============================================================================
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_campaign_id ON transactions(campaign_id);
CREATE INDEX idx_transactions_stripe_payment_intent ON transactions(stripe_payment_intent_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_is_test_mode ON transactions(is_test_mode);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_billing_reason ON transactions(billing_reason);

-- ============================================================================
-- PENDING_CHARGES TABLE
-- ============================================================================
-- Stores new mover additions that need to be charged in daily batch
CREATE TABLE IF NOT EXISTS pending_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign Keys
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Charge Details
  new_mover_count INTEGER NOT NULL CHECK (new_mover_count > 0),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  amount_dollars DECIMAL(10, 2) NOT NULL CHECK (amount_dollars > 0),

  -- Billing Context
  billing_reason TEXT NOT NULL DEFAULT 'new_mover_addition',

  -- Scheduling
  scheduled_for DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Processing Status
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  transaction_id UUID REFERENCES transactions(id),

  -- Test Mode Flag
  is_test_mode BOOLEAN NOT NULL DEFAULT false,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PENDING_CHARGES
-- ============================================================================
CREATE INDEX idx_pending_charges_campaign_id ON pending_charges(campaign_id);
CREATE INDEX idx_pending_charges_user_id ON pending_charges(user_id);
CREATE INDEX idx_pending_charges_scheduled_for ON pending_charges(scheduled_for);
CREATE INDEX idx_pending_charges_processed ON pending_charges(processed) WHERE NOT processed;
CREATE INDEX idx_pending_charges_transaction_id ON pending_charges(transaction_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_charges ENABLE ROW LEVEL SECURITY;

-- Transactions Policies
-- Users can view their own transactions
CREATE POLICY "Users can view own transactions"
  ON transactions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users cannot insert, update, or delete transactions (only via Edge Functions with service role)
CREATE POLICY "Service role can manage transactions"
  ON transactions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Admins can view all transactions (handled via service role queries from admin dashboard)

-- Pending Charges Policies
-- Users can view their own pending charges
CREATE POLICY "Users can view own pending charges"
  ON pending_charges
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can manage all pending charges
CREATE POLICY "Service role can manage pending charges"
  ON pending_charges
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================================================
-- TRIGGER: Update updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_transactions_updated_at
  BEFORE UPDATE ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pending_charges_updated_at
  BEFORE UPDATE ON pending_charges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ADD COLUMNS TO CAMPAIGNS TABLE
-- ============================================================================
-- Add payment tracking columns to campaigns if they don't exist
DO $$
BEGIN
  -- approved_by: UUID of admin who approved the campaign
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN approved_by UUID REFERENCES auth.users(id);
  END IF;

  -- approved_at: Timestamp when campaign was approved
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'approved_at'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;

  -- payment_requires_action: Flag for 3D Secure authentication needed
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'payment_requires_action'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN payment_requires_action BOOLEAN DEFAULT false;
  END IF;

  -- payment_action_url: URL for user to complete 3D Secure
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'campaigns' AND column_name = 'payment_action_url'
  ) THEN
    ALTER TABLE campaigns ADD COLUMN payment_action_url TEXT;
  END IF;
END $$;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================
COMMENT ON TABLE transactions IS 'Stores all Stripe payment transactions including charges, failures, and refunds';
COMMENT ON COLUMN transactions.billing_reason IS 'Why this charge was created: campaign_approval, new_mover_addition, manual_charge, or retry';
COMMENT ON COLUMN transactions.is_test_mode IS 'True if this was a test mode transaction using Stripe test keys';
COMMENT ON COLUMN transactions.metadata IS 'Additional JSON data about the transaction';

COMMENT ON TABLE pending_charges IS 'Batches new mover additions to be charged daily at 2am UTC';
COMMENT ON COLUMN pending_charges.scheduled_for IS 'Date when this charge should be processed';
COMMENT ON COLUMN pending_charges.processed IS 'True after daily cron has processed this charge';

COMMENT ON COLUMN campaigns.approved_by IS 'User ID of admin who approved this campaign';
COMMENT ON COLUMN campaigns.approved_at IS 'Timestamp when campaign was approved by admin';
COMMENT ON COLUMN campaigns.payment_requires_action IS 'True if payment requires 3D Secure authentication from user';
COMMENT ON COLUMN campaigns.payment_action_url IS 'Stripe URL for user to complete payment authentication';
