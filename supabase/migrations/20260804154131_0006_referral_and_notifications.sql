
-- Add referral_code to user_registrations (unique short code per user)
ALTER TABLE user_registrations
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by text;  -- referral_code of the referrer

-- Backfill referral codes for existing users
UPDATE user_registrations
SET referral_code = upper(substring(replace(id::text, '-', ''), 1, 8))
WHERE referral_code IS NULL;

-- Add is_pinned to announcements
ALTER TABLE announcements
  ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;

-- Referral events table: tracks who referred whom, deposit status
CREATE TABLE IF NOT EXISTS referral_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_registration_id uuid NOT NULL REFERENCES user_registrations(id),
  referred_registration_id uuid NOT NULL REFERENCES user_registrations(id),
  referrer_username text NOT NULL,
  referred_username text NOT NULL,
  first_deposit_amount numeric(14,2),
  first_deposit_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'qualified', 'bonus_given')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE referral_events ENABLE ROW LEVEL SECURITY;

-- Admin uses service role (bypasses RLS); anon/authenticated only need SELECT for their own referral
CREATE POLICY "select_own_referrals" ON referral_events
  FOR SELECT TO authenticated
  USING (true);
