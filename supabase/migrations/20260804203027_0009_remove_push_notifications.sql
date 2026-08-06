-- Remove all push notification tables and config
-- This migration drops tables created by migrations 0007 and 0008

DROP TABLE IF EXISTS push_delivery_log CASCADE;
DROP TABLE IF EXISTS push_subscriptions CASCADE;
DROP TABLE IF EXISTS push_notifications CASCADE;

-- Remove VAPID key config entries
DELETE FROM app_config WHERE key IN ('vapid_public_key', 'vapid_private_key');
