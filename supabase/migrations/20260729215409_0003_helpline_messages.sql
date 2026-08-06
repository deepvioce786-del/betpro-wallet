/*
# Helpline Messages Table + Admin Online Status

1. New Tables
- `helpline_messages`
  - `id` (uuid, primary key)
  - `registration_id` (uuid, FK to user_registrations.id, identifies which user the message belongs to)
  - `sender` (text: 'user' or 'admin', who sent the message)
  - `message` (text, the message content)
  - `is_read` (boolean, default false, tracks if the message has been read)
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `helpline_messages`.
- All data access goes through edge functions using the service role key (bypasses RLS).
- Policies added for authenticated users to read their own messages as a safety net.

3. Config Changes
- Inserts `admin_last_seen` key into `app_config` (stores ISO timestamp of admin's last activity).
- Admin is considered "online" if `admin_last_seen` is within the last 3 minutes.

4. Index
- Index on `registration_id` for fast message lookups per user.
- Index on `created_at` for chronological ordering.
*/

CREATE TABLE IF NOT EXISTS helpline_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES user_registrations(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user', 'admin')),
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_helpline_messages_registration_id ON helpline_messages(registration_id);
CREATE INDEX IF NOT EXISTS idx_helpline_messages_created_at ON helpline_messages(created_at);

ALTER TABLE helpline_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_helpline_messages" ON helpline_messages;
CREATE POLICY "select_own_helpline_messages" ON helpline_messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_registrations ur
      WHERE ur.id = helpline_messages.registration_id
      AND ur.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_helpline_messages" ON helpline_messages;
CREATE POLICY "insert_own_helpline_messages" ON helpline_messages FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_registrations ur
      WHERE ur.id = helpline_messages.registration_id
      AND ur.auth_user_id = auth.uid()
      AND helpline_messages.sender = 'user'
    )
  );

-- Insert admin_last_seen config if not exists
INSERT INTO app_config (key, value)
SELECT 'admin_last_seen', '1970-01-01T00:00:00.000Z'
WHERE NOT EXISTS (
  SELECT 1 FROM app_config WHERE key = 'admin_last_seen'
);
