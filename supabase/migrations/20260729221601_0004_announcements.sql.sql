/*
# Create announcements table for website update notifications

1. New Tables
- `announcements`
  - `id` (uuid, primary key)
  - `title` (text, not null) — short heading of the announcement
  - `body` (text, not null) — full message content
  - `is_active` (boolean, default true) — admin can deactivate without deleting
  - `created_at` (timestamptz, default now())
  - `updated_at` (timestamptz, default now())
  - `created_by` (text, nullable) — admin username who created it

2. Purpose
- Admin publishes announcements (add / edit / delete / toggle active).
- All users see the latest active announcement on their dashboard after login.
- Users can dismiss an announcement; the dismissal is stored client-side
  in localStorage keyed by announcement id so it stays dismissed until a
  new announcement is published.

3. Security
- Enable RLS on `announcements`.
- SELECT: allow anon + authenticated (the app uses the anon key to read
  announcements on the user dashboard; there is no per-user ownership).
- INSERT / UPDATE / DELETE: these are only done through the admin-api edge
  function using the service-role key, which bypasses RLS. No anon/authenticated
  write policies are needed.
- This is intentionally a shared/public read table (announcements are
  broadcast to all users), so `USING (true)` on SELECT is correct.
*/

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by text
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_announcements" ON announcements;
CREATE POLICY "anon_read_announcements" ON announcements FOR SELECT
  TO anon, authenticated USING (true);
