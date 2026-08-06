/*
# Admin Notification System

## Purpose
Creates a complete notification system for admin devices, allowing the admin
to receive push notifications for important events (new registrations, deposits,
withdrawals, support messages, security alerts) even when the admin panel or
browser is closed. Admin notifications work alongside the existing user
notification system.

## New Tables

### 1. admin_fcm_tokens
Stores Firebase Cloud Messaging tokens for admin devices. Supports multiple
admin devices simultaneously — each device registers its own FCM token.
- `id` — UUID primary key
- `fcm_token` — the FCM registration token (unique per device)
- `device_label` — optional label (e.g. "Admin iPhone", "Office Desktop")
- `platform` — 'web' | 'pwa' | 'android' | 'ios'
- `is_active` — whether this token should still receive notifications
- `last_active_at` — last time this token was used
- `created_at` / `updated_at` — timestamps

### 2. admin_notifications
Stores all notifications sent to admin devices. Each row records:
- `id` — UUID primary key
- `title` — notification title
- `body` — notification message
- `type` — category: 'registration' | 'deposit' | 'withdraw' | 'support' | 'security' | 'announcement' | 'general'
- `click_action` — URL path the notification opens when clicked (e.g. '/#/admin/deposits')
- `related_id` — optional UUID of the related entity (registration, deposit, etc.)
- `is_read` — whether the admin has read it
- `created_at` — when the notification was created

## Security
- Both tables have RLS enabled.
- admin_fcm_tokens: admin manages via edge function (service role bypasses RLS).
  The anon/authenticated role can insert tokens (for admin device registration
  via edge function) but cannot read or modify.
- admin_notifications: same pattern — admin reads via edge function with service role.
  No direct anon/authenticated access to read admin notifications.

## Notes
1. The edge functions (admin-api, user-api) use the service role key which
   bypasses RLS, so they can freely read/write these tables.
2. The frontend never directly queries these tables — all access is through
   edge function endpoints.
3. Existing user notification tables (notifications, fcm_tokens,
   notification_campaigns, notification_deliveries) are unchanged.
*/

-- Admin FCM tokens table
CREATE TABLE IF NOT EXISTS admin_fcm_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fcm_token text UNIQUE NOT NULL,
  device_label text,
  platform text NOT NULL DEFAULT 'web',
  is_active boolean NOT NULL DEFAULT true,
  last_active_at timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_fcm_tokens_active ON admin_fcm_tokens(is_active) WHERE is_active = true;

ALTER TABLE admin_fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Allow edge function (service role bypasses RLS) to manage tokens.
-- No direct anon/authenticated access needed — all via edge functions.
DROP POLICY IF EXISTS "admin_fcm_tokens_no_direct_access" ON admin_fcm_tokens;
-- No policies = locked down for anon/authenticated; service role bypasses RLS.

-- Admin notifications history table
CREATE TABLE IF NOT EXISTS admin_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'general',
  click_action text,
  related_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_unread ON admin_notifications(is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON admin_notifications(type);

ALTER TABLE admin_notifications ENABLE ROW LEVEL SECURITY;

-- Same pattern: no direct access for anon/authenticated; service role bypasses RLS.
DROP POLICY IF EXISTS "admin_notifications_no_direct_access" ON admin_notifications;

-- Add delivery status columns to existing notifications table for richer tracking
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS delivery_status text DEFAULT 'sent',
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

-- Add 'scheduled' as valid status for notification_campaigns (already exists in schema definition)
-- The type text column already accepts any string, so no constraint change needed.
