-- Extend notifications table with rich notification fields
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS icon_url text,
  ADD COLUMN IF NOT EXISTS click_action text,
  ADD COLUMN IF NOT EXISTS campaign_id uuid,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz;

-- Notification campaigns: tracks admin-sent broadcast/individual notifications
CREATE TABLE IF NOT EXISTS notification_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  image_url text,
  icon_url text,
  click_action text DEFAULT '/#/dashboard',
  type text NOT NULL DEFAULT 'general',
  target text NOT NULL DEFAULT 'all', -- 'all' | 'single' | 'selected'
  status text NOT NULL DEFAULT 'sent', -- 'draft' | 'scheduled' | 'sent' | 'failed'
  scheduled_at timestamptz,
  sent_at timestamptz DEFAULT now(),
  total_recipients integer NOT NULL DEFAULT 0,
  successful_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON notification_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON notification_campaigns(created_at DESC);

ALTER TABLE notification_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_campaigns_admin" ON notification_campaigns FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_campaigns_admin" ON notification_campaigns FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_campaigns_admin" ON notification_campaigns FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_campaigns_admin" ON notification_campaigns FOR DELETE
  TO authenticated USING (true);

-- Notification deliveries: per-device delivery tracking
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES notification_campaigns(id) ON DELETE CASCADE,
  notification_id uuid REFERENCES notifications(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES user_registrations(id) ON DELETE CASCADE,
  fcm_token text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'failed' | 'delivered'
  error_message text,
  retry_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliveries_campaign ON notification_deliveries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON notification_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_registration ON notification_deliveries(registration_id);

ALTER TABLE notification_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_deliveries_admin" ON notification_deliveries FOR SELECT
  TO authenticated USING (true);
CREATE POLICY "insert_deliveries_admin" ON notification_deliveries FOR INSERT
  TO authenticated WITH CHECK (true);
CREATE POLICY "update_deliveries_admin" ON notification_deliveries FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "delete_deliveries_admin" ON notification_deliveries FOR DELETE
  TO authenticated USING (true);

-- Add last_active_at to fcm_tokens for online tracking
ALTER TABLE fcm_tokens
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active ON fcm_tokens(is_active) WHERE is_active = true;

-- Seed real Firebase config (overwrites empty placeholders from migration 0011)
INSERT INTO app_config (key, value) VALUES
  ('firebase_project_id', 'bp-wallet-d894b'),
  ('firebase_client_email', 'firebase-adminsdk-fbsvc@bp-wallet-d894b.iam.gserviceaccount.com'),
  ('firebase_private_key', '-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQClj6Lx0DCo4U4E\nqzaQ8r77M9TMevqv/4hEJp758RXEnhjVHzzW75ExfzbzrAqyT/lq8IW4tfOSEXue\n75ViNqTRiWNDSsthajX1gCUWf/oFfyNVkq9XYseypdVlMLAzQGQs/OgQBctwx/fA\n3bSm7TgI3A+9fYLZVbu0hWIczU2xkhSwb5aAIbDO/t3hUX4q0CgPPgomGdzsH0jQ\nHI2nt+C1KRRLK1/+3VFtMPUsAXTnX/JQmMO00yPYroB1PmsPAQ3ypX912aqWqCqT\nG61iUMrHty/ixJwl892hMoAqnwWfn3TU3V2Bp1ab2ynH6GpqKcFUbIQx9FBrZBxj\ndHiAB1fvAgMBAAECggEAPRYrZBeR7K388GIP5xl5+Avex3fUyV16dNLfM4+NnZdL\nyE8XTqLkKqQqrWvcIoC5oYiPfmC8Nzf2KeVyc+N/msSbeHe/ZPkgYa3fgVbE9IQ9\nkFRoF9Edp7/iZcy6Jp7ql2LVaRwKPVm7A1GKV1ENrM8ti5gk0HX+pRPV6JSjxxFs\nVp+QSCTi6ZGqyE2AP456/7a1iNrKekEOO1VqJjwWvGCuz2iq/DokH1f5dcY6+eVB\n/NQ2l8PJK7mweENPoAuXykRjze35cMkF1GDE4UBpzJETQF1itXokfxcFmelPY2ix\n/3g53+VTSGr2HmPrFhNvVP4OabMQ81Qh/euEpugNYQKBgQDSEYHeWovevFfgooGd\nVHptg0InPpbPd5y8FIPTF+JHszOux1j15r5PloqDd8mOLoAnvAYZlPPL2vLxOhBA\nNIHbMJQ29s1nHy3lafhDUMuaVsv6LzaALio4pfglKx31DGhjne22wWhcp+5aCm7W\n5ZRxKbbnG9SLkxTXyc7R0U/R/wKBgQDJwtnJC+Zane0qY01DRd60q0gb3bc11+dt\nK1rX+cudV+MstH6+Gg6i4U9hVC2Pga6+akl5Lo1nAijQPtBei5HdVZ/wnJZlgYJP\nRFGnpCUKBY8jWYoIVLBKDysEt1Wv9nHMc5CDt8ZAv+jN0fh5t8aPCZb4l0c9hR4U\nBEWs7JmaEQKBgCgZS28EXbqwvR2WJ6O+ongRHCmdmvATZwnH6Ln8zybcoDr2tpaJ\n6z4KAHrD/Od1HOV40LlFY5xAOSuu57c5zqfmiARN7DuJChvGtKs02wilFN628HJb\nXZfeppWBu4AxVCPf26aNGLzHGYp6f1nqDQHk8pL/Dv1toAbo8N/AUrpFAoGAeFtz\nPZqKrO3ex9V7BrGMe+xdVLo7i7QjCx280G/kBhWioE1/+fljV8jeaKolj6EF0/Nl\npxOdKKDCJhACjxPlTMrCYW+XzC+ow452w3GI4uSUEbtdO0EB9Pv9Zo/TXue91P/v\napPbgU66GuWxuzJlEXjgBaWAyvM5ESnHQrPVoXECgYApjYZzE8flv2eNT3F6d8oH\nff9rRMoYqY9LdUUAp2cxNO4pJVPhTvl5OJHqDgrqG/nPVXC5nJJehseJFbEXQdtu\nk+qN6RD0QNbQIKotCH8bxwJs9O8l8iCCdwfXyRK++9vM6Cq8VXk6++TaC68fz6YC\n05IhVsg5V21EYwsb/eGgrw==\n-----END PRIVATE KEY-----\n'),
  ('firebase_api_key', 'AIzaSyB3RcOZIOVTtDKDSizS5GZcgSblomYP6O4'),
  ('firebase_app_id', '1:320076277365:web:1dab0a6ad622cf85687a3c'),
  ('firebase_messaging_sender_id', '320076277365')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;