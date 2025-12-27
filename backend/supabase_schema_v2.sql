-- ================================================
-- Supabase Schema V2 - Cloudflare & Enhanced Integration
-- Run this in your Supabase SQL Editor
-- ================================================

-- ================================================
-- USERS TABLE (Linked to auth.users)
-- ================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  plan_type TEXT DEFAULT 'free' CHECK (plan_type IN ('free', 'starter', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast auth_id lookups
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can read their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT TO authenticated
  USING (auth.uid() = auth_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE TO authenticated
  USING (auth.uid() = auth_id)
  WITH CHECK (auth.uid() = auth_id);

-- ================================================
-- AUTO-CREATE USER ON SIGNUP (Trigger)
-- ================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (auth_id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  
  -- Also create initial usage limits record
  INSERT INTO public.usage_limits (user_id)
  VALUES (NEW.id);
  
  -- Create initial credits record
  INSERT INTO public.credits (user_id, balance)
  VALUES (NEW.id, 100);  -- Start with 100 free credits
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- WEBSITES TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS websites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'archived')),
  subdomain TEXT UNIQUE,
  live_url TEXT,
  business_json JSONB,
  layout_json JSONB,
  html TEXT,
  description TEXT,
  language TEXT DEFAULT 'en',
  source_type TEXT DEFAULT 'text' CHECK (source_type IN ('text', 'voice', 'redesign')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_websites_owner_id ON websites(owner_id);
CREATE INDEX IF NOT EXISTS idx_websites_subdomain ON websites(subdomain);
CREATE INDEX IF NOT EXISTS idx_websites_status ON websites(status);
CREATE INDEX IF NOT EXISTS idx_websites_created_at ON websites(created_at DESC);

-- Enable RLS
ALTER TABLE websites ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON websites
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can view own websites
CREATE POLICY "Users can view own websites" ON websites
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

-- Users can create websites
CREATE POLICY "Users can create websites" ON websites
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = owner_id);

-- Users can update own websites
CREATE POLICY "Users can update own websites" ON websites
  FOR UPDATE TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Users can delete own websites
CREATE POLICY "Users can delete own websites" ON websites
  FOR DELETE TO authenticated
  USING (auth.uid() = owner_id);

-- ================================================
-- WEBSITE VERSIONS TABLE (Version History)
-- ================================================

CREATE TABLE IF NOT EXISTS website_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  html TEXT NOT NULL,
  business_json JSONB,
  layout_json JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(website_id, version)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_website_versions_website_id ON website_versions(website_id);
CREATE INDEX IF NOT EXISTS idx_website_versions_created_at ON website_versions(created_at DESC);

-- Enable RLS
ALTER TABLE website_versions ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON website_versions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can view versions of own websites
CREATE POLICY "Users can view own website versions" ON website_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites 
      WHERE websites.id = website_versions.website_id 
      AND websites.owner_id = auth.uid()
    )
  );

-- ================================================
-- CREDITS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INT DEFAULT 100,
  lifetime_earned INT DEFAULT 100,
  lifetime_spent INT DEFAULT 0,
  last_purchase_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);

-- Enable RLS
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON credits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can view own credits
CREATE POLICY "Users can view own credits" ON credits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ================================================
-- CREDIT TRANSACTIONS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  balance_after INT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON credit_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON credit_transactions(created_at DESC);

-- Enable RLS
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON credit_transactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can view own transactions
CREATE POLICY "Users can view own transactions" ON credit_transactions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- ================================================
-- CLOUDFLARE DEPLOYMENTS TABLE
-- ================================================

CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
  deployment_id TEXT,  -- Cloudflare deployment ID
  subdomain TEXT NOT NULL,
  live_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'failed', 'deleted')),
  ssl_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deployed_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deployments_website_id ON deployments(website_id);
CREATE INDEX IF NOT EXISTS idx_deployments_subdomain ON deployments(subdomain);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);

-- Enable RLS
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON deployments
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can view deployments of own websites
CREATE POLICY "Users can view own deployments" ON deployments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM websites 
      WHERE websites.id = deployments.website_id 
      AND websites.owner_id = auth.uid()
    )
  );

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Function to get next version number for a website
CREATE OR REPLACE FUNCTION get_next_version(p_website_id UUID)
RETURNS INT
LANGUAGE SQL
AS $$
  SELECT COALESCE(MAX(version), 0) + 1 
  FROM website_versions 
  WHERE website_id = p_website_id;
$$;

-- Function to deduct credits
CREATE OR REPLACE FUNCTION deduct_credits(
  p_user_id UUID,
  p_amount INT,
  p_action TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_balance INT;
  v_new_balance INT;
BEGIN
  -- Get current balance
  SELECT balance INTO v_current_balance
  FROM credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Check if enough credits
  IF v_current_balance IS NULL OR v_current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Calculate new balance
  v_new_balance := v_current_balance - p_amount;
  
  -- Update credits
  UPDATE credits
  SET balance = v_new_balance,
      lifetime_spent = lifetime_spent + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;
  
  -- Log transaction
  INSERT INTO credit_transactions (user_id, amount, balance_after, action, description)
  VALUES (p_user_id, -p_amount, v_new_balance, p_action, p_description);
  
  RETURN TRUE;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_next_version(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION deduct_credits(UUID, INT, TEXT, TEXT) TO service_role;

-- ================================================
-- CREDIT COSTS
-- ================================================

COMMENT ON TABLE credits IS 'User credit balances for API usage';
COMMENT ON TABLE credit_transactions IS 'Credit transaction history';
COMMENT ON TABLE websites IS 'User-generated websites';
COMMENT ON TABLE website_versions IS 'Version history for websites';
COMMENT ON TABLE deployments IS 'Cloudflare deployment records';

-- Credit costs reference (for documentation):
-- Generate website: 10 credits
-- Voice generate: 15 credits
-- Edit section: 2 credits
-- Redesign: 20 credits
-- Publish: 5 credits
