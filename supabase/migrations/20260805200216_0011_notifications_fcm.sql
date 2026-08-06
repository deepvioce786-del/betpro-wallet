-- Notifications table: stores all notifications for users
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES user_registrations(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_registration_id ON notifications(registration_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(registration_id, is_read) WHERE is_read = false;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
  TO authenticated USING (auth.uid()::text = (
    SELECT ur.auth_user_id::text FROM user_registrations ur WHERE ur.id = registration_id
  ));

CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid()::text = (
    SELECT ur.auth_user_id::text FROM user_registrations ur WHERE ur.id = registration_id
  ));

CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
  TO authenticated USING (auth.uid()::text = (
    SELECT ur.auth_user_id::text FROM user_registrations ur WHERE ur.id = registration_id
  ))
  WITH CHECK (auth.uid()::text = (
    SELECT ur.auth_user_id::text FROM user_registrations ur WHERE ur.id = registration_id
  ));

CREATE POLICY "delete_own_notifications" ON notifications FOR DELETE
  TO authenticated USING (auth.uid()::text = (
    SELECT ur.auth_user_id::text FROM user_registrations ur WHERE ur.id = registration_id
  ));

-- FCM device tokens table: stores Firebase Cloud Messaging tokens per user
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES user_registrations(id) ON DELETE CASCADE,
  fcm_token text NOT NULL,
  platform text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (registration_id, fcm_token)
);

CREATE INDEX IF NOT EXISTS idx_fcm_tokens_registration_id ON fcm_tokens(registration_id);

ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_fcm_tokens" ON fcm_tokens FOR SELECT
  TO authenticated USING (auth.uid()::text = (
    SELECT ur.auth_user_id::text FROM user_registrations ur WHERE ur.id = registration_id
  ));

CREATE POLICY "insert_own_fcm_tokens" ON fcm_tokens FOR INSERT
  TO authenticated WITH CHECK (auth.uid()::text = (
    SELECT ur.auth_user_id::text FROM user_registrations ur WHERE ur.id = registration_id
  ));

CREATE POLICY "update_own_fcm_tokens" ON fcm_tokens FOR UPDATE
  TO authenticated USING (auth.uid()::text = (
    SELECT ur.auth_user_id::text FROM user_registrations ur WHERE ur.id = registration_id
  ))
  WITH CHECK (auth.uid()::text = (
    SELECT ur.auth_user_id::text FROM user_registrations ur WHERE ur.id = registration_id
  ));

CREATE POLICY "delete_own_fcm_tokens" ON fcm_tokens FOR DELETE
  TO authenticated USING (auth.uid()::text = (
    SELECT ur.auth_user_id::text FROM user_registrations ur WHERE ur.id = registration_id
  ));

-- Firebase config stored in app_config (admin can set via admin panel)
INSERT INTO app_config (key, value) VALUES
  ('firebase_project_id', ''),
  ('firebase_client_email', ''),
  ('firebase_private_key', ''),
  ('firebase_api_key', ''),
  ('firebase_app_id', ''),
  ('firebase_messaging_sender_id', '')
ON CONFLICT (key) DO NOTHING;
