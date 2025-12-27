-- Supabase Database Schema for Waitlist
-- Run this in your Supabase SQL Editor

-- Create waitlist table
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact TEXT NOT NULL,
  contact_type TEXT CHECK (contact_type IN ('email', 'whatsapp')),
  business_description TEXT,
  language TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  UNIQUE(contact)
);

-- Create index on contact for faster duplicate checks
CREATE INDEX IF NOT EXISTS idx_waitlist_contact ON waitlist(contact);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_waitlist_created_at ON waitlist(created_at DESC);

-- Enable Row Level Security
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Service role full access" ON waitlist;
DROP POLICY IF EXISTS "Public read count only" ON waitlist;

-- Policy: Only service role can insert/update/delete
CREATE POLICY "Service role full access" ON waitlist
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Policy: Prevent public access to data
-- (All access must go through backend API with service role key)
CREATE POLICY "No public access" ON waitlist
  FOR ALL
  TO anon, authenticated
  USING (false);

-- Create a function to get waitlist count (can be called publicly)
CREATE OR REPLACE FUNCTION get_waitlist_count()
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER FROM waitlist;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_waitlist_count() TO anon, authenticated, service_role;

COMMENT ON TABLE waitlist IS 'Stores early access waitlist signups';
COMMENT ON COLUMN waitlist.contact IS 'Email or WhatsApp number';
COMMENT ON COLUMN waitlist.contact_type IS 'Type of contact: email or whatsapp';
COMMENT ON COLUMN waitlist.ip_address IS 'User IP address for abuse prevention';

-- ================================================
-- PHASE 6: Usage Tracking & Abuse Control
-- ================================================

-- Usage limits per user (daily/monthly caps)
CREATE TABLE IF NOT EXISTS usage_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_generates INT DEFAULT 0,
  daily_voice_generates INT DEFAULT 0,
  daily_edits INT DEFAULT 0,
  daily_redesigns INT DEFAULT 0,
  monthly_generates INT DEFAULT 0,
  published_sites INT DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_usage_limits_user_id ON usage_limits(user_id);

-- Usage logs for monitoring and analytics
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  endpoint TEXT NOT NULL,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for usage_logs
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_logs_ip ON usage_logs(ip_address);

-- Blocked IPs table
CREATE TABLE IF NOT EXISTS blocked_ips (
  ip_address TEXT PRIMARY KEY,
  reason TEXT,
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  blocked_by TEXT
);

-- Enable RLS on new tables
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;

-- Service role full access policies
CREATE POLICY "Service role full access" ON usage_limits
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON usage_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access" ON blocked_ips
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can read their own usage
CREATE POLICY "Users can view own usage" ON usage_limits
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

COMMENT ON TABLE usage_limits IS 'Tracks daily/monthly API usage per user';
COMMENT ON TABLE usage_logs IS 'Logs all API calls for monitoring';
COMMENT ON TABLE blocked_ips IS 'IP addresses blocked for abuse';
