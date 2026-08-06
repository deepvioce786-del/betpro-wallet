/*
# Add WhatsApp Support Number to App Config

1. Purpose
   - Adds a `whatsapp_support_number` row to the existing `app_config` table so the admin
     can change the WhatsApp support number from the admin panel without editing source code.
   - The number is stored as a plain phone-number string (digits only, e.g. "923473669083").
   - The frontend WhatsApp help button will fetch this value dynamically and update for all users.

2. Changes
   - Inserts a new row into `app_config` with key = `whatsapp_support_number`
     and value = the current default number "923473669083" (migrated from hardcoded source).
   - Uses `ON CONFLICT DO NOTHING` so re-running the migration is safe.

3. Security
   - No new tables created; `app_config` already has RLS enabled.
   - The row is read by the public user-api edge function (anon role) and
     written only by the admin-api edge function (admin-authenticated).
   - No policy changes needed — existing access patterns apply.
*/

INSERT INTO app_config (key, value)
VALUES ('whatsapp_support_number', '923473669083')
ON CONFLICT (key) DO NOTHING;
