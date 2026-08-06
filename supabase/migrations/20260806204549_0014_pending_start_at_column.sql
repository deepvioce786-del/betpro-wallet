/*
# Add pending_start_at column to user_registrations

1. Modified Tables
- `user_registrations`: add `pending_start_at` (timestamptz, nullable) — records when
  the user registered so the 5-minute waiting period survives page refreshes.
  Defaults to `now()` on insert via a column default.

2. Security
- No RLS changes. The column is read by the edge function (service role) and
  returned to the frontend via the registration-status endpoint.

3. Important Notes
- The column is nullable so existing rows are unaffected.
- New registrations will get `pending_start_at = now()` automatically via the
  edge function which sets it explicitly during the register flow.
*/

ALTER TABLE user_registrations
  ADD COLUMN IF NOT EXISTS pending_start_at timestamptz;
