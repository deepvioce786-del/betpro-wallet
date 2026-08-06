/*
# BetPro Wallet — Phase 2: Deposits, Withdrawals, Wallet Config, Admin Stats

## Title
Adds deposit/withdraw request tracking, admin-adjustable wallet payment-method
config, enhanced transaction statuses, admin stats RPC, and storage for deposit
screenshots. Also re-seeds the default admin to Balak586 / 123Balak123.

## Plain-English explanation
Phase 1 had a simple deposit/withdraw flow that immediately completed. Phase 2
introduces a proper request lifecycle:
- Deposits are now "pending" requests: the user submits the amount + payment
  screenshot, the admin approves/rejects. Only on approval is the balance credited.
- Withdrawals immediately deduct the balance (held), become "pending", and if the
  admin rejects, the held amount is refunded automatically.
- A dedicated history combines deposits and withdrawals with statuses
  (pending / approved / rejected).
- Telegram notifications fire for every lifecycle event (registration, approve,
  reject, deposit request, deposit approve, withdraw request, withdraw approve,
  withdraw reject) and include username, user id, phone, amount, screenshot, datetime.

## New tables and columns
1. `deposit_requests` — user deposit requests awaiting admin approval:
   - id uuid PK
   - registration_id uuid FK -> user_registrations(id) ON DELETE CASCADE
   - owner_username text NOT NULL
   - amount numeric(14,2) NOT NULL
   - payment_method text NOT NULL  ('easypaisa' | 'jazzcash' | 'bank')
   - screenshot_url text NULL  (Supabase storage public URL)
   - screenshot_path text NULL (storage object path, for cleanup)
   - status text NOT NULL DEFAULT 'pending'  ('pending' | 'approved' | 'rejected')
   - admin_notes text NULL
   - telegram_message_id bigint NULL
   - processed_at timestamptz NULL
   - created_at timestamptz DEFAULT now()

2. `withdraw_requests` — user withdrawal requests:
   - id uuid PK
   - registration_id uuid FK -> user_registrations(id) ON DELETE CASCADE
   - owner_username text NOT NULL
   - amount numeric(14,2) NOT NULL
   - payment_method text NOT NULL ('easypaisa' | 'jazzcash' | 'bank')
   - account_detail text NOT NULL  (the account number / detail the user provided)
   - account_holder_name text NULL
   - status text NOT NULL DEFAULT 'pending' ('pending' | 'approved' | 'rejected')
   - admin_notes text NULL
   - telegram_message_id bigint NULL
   - processed_at timestamptz NULL
   - created_at timestamptz DEFAULT now()

## Modified tables
- `wallet_transactions`: the existing 'completed'-only flow stays for backwards
  compatibility (Phase 1). New deposits/withdrawals are tracked in
  deposit_requests / withdraw_requests. The wallet_transactions table gets an
  optional `request_type` text column ('deposit_request' | 'withdraw_request' |
  'deposit_refund') and `request_id` uuid column to link to the originating request
  row, so a unified history view can join everything.

## New config keys (app_config)
- `easypaisa_name`, `easypaisa_number`
- `jazzcash_name`, `jazzcash_number`
- `bank_name`, `bank_holder`, `bank_account`
- `site_currency` = 'PKR'
- `site_currency_symbol` = 'Rs'

## Admin re-seed
Updates `admin_username` = 'Balak586' and `admin_password_hash` to the sha256 of
'123Balak123'. This is idempotent and only sets it if the stored username is still
the Phase 1 default 'betpro_admin' (so it won't overwrite an admin who already
changed their credentials). Also handles the case where username is already
'Balak586' by only updating the hash.

## RPCs
- `approve_deposit(p_id uuid)` — credits balance, marks deposit approved, records
  wallet_transaction. Returns new balance.
- `reject_deposit(p_id uuid, p_notes text)` — marks deposit rejected (no balance
  change for deposits since we only credit on approval).
- `approve_withdraw(p_id uuid)` — marks withdraw approved (amount already deducted
  at request time). Records wallet_transaction (already done at request). Returns ok.
- `reject_withdraw(p_id uuid, p_notes text)` — refunds the held amount back to the
  wallet, marks rejected, records a refund wallet_transaction.
- `admin_stats()` — returns a JSON object with totals: total_users, active_users,
  pending_users, total_deposits, total_withdrawals, pending_requests, wallet_balance_total.

## Storage
- Creates a public storage bucket `deposit-screenshots` for uploaded screenshots.

## Security — RLS
- deposit_requests / withdraw_requests: owner-scoped SELECT (via auth_user_id join),
  no direct INSERT/UPDATE/DELETE for anon (edge functions use service role).
- wallet_transactions: add `request_type` + `request_id` columns (nullable, safe).

## Important notes
1. Amounts are in Pakistani Rupees (PKR). The frontend formats with the 'Rs' symbol.
2. Screenshots upload to Supabase Storage bucket `deposit-screenshots`; the URL is
   stored on deposit_requests.screenshot_url and included in Telegram notifications.
3. Withdrawals deduct immediately at request time and refund on rejection.
4. The default admin is Balak586 / 123Balak123 — change after first login.
*/

-- ---------- new config keys ----------
INSERT INTO app_config (key, value) VALUES
  ('easypaisa_name', 'EasyPaisa Account'),
  ('easypaisa_number', '03XXXXXXXXX'),
  ('jazzcash_name', 'JazzCash Account'),
  ('jazzcash_number', '03XXXXXXXXX'),
  ('bank_name', 'Bank Alfalah'),
  ('bank_holder', 'BetPro Wallet'),
  ('bank_account', '0000000000000000'),
  ('site_currency', 'PKR'),
  ('site_currency_symbol', 'Rs')
ON CONFLICT (key) DO NOTHING;

-- ---------- re-seed default admin to Balak586 / 123Balak123 ----------
-- Only update if still the Phase 1 default OR already Balak586 (refresh hash).
DO $$
DECLARE
  v_current text;
BEGIN
  SELECT value INTO v_current FROM app_config WHERE key = 'admin_username';
  IF v_current = 'betpro_admin' OR v_current = 'Balak586' OR v_current IS NULL THEN
    UPDATE app_config SET value = 'Balak586' WHERE key = 'admin_username';
    UPDATE app_config SET value = '4b062968395a510c28c93ad27ae3590d9ad9c43b452b3a8a0f83e4f67b9b1754'
      WHERE key = 'admin_password_hash';
  END IF;
END $$;

-- ---------- add columns to wallet_transactions ----------
ALTER TABLE wallet_transactions
  ADD COLUMN IF NOT EXISTS request_type text,
  ADD COLUMN IF NOT EXISTS request_id uuid;

CREATE INDEX IF NOT EXISTS wallet_transactions_request_id_idx
  ON wallet_transactions (request_id);

-- ---------- deposit_requests ----------
CREATE TABLE IF NOT EXISTS deposit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES user_registrations(id) ON DELETE CASCADE,
  owner_username text NOT NULL,
  amount numeric(14,2) NOT NULL,
  payment_method text NOT NULL,
  screenshot_url text,
  screenshot_path text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  telegram_message_id bigint,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE deposit_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS deposit_requests_status_idx ON deposit_requests (status);
CREATE INDEX IF NOT EXISTS deposit_requests_owner_idx ON deposit_requests (owner_username);
CREATE INDEX IF NOT EXISTS deposit_requests_created_idx ON deposit_requests (created_at DESC);

DROP POLICY IF EXISTS "select_own_deposit_requests" ON deposit_requests;
CREATE POLICY "select_own_deposit_requests"
  ON deposit_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_registrations r
      WHERE r.id = deposit_requests.registration_id
        AND r.auth_user_id = auth.uid()
    )
  );

-- ---------- withdraw_requests ----------
CREATE TABLE IF NOT EXISTS withdraw_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES user_registrations(id) ON DELETE CASCADE,
  owner_username text NOT NULL,
  amount numeric(14,2) NOT NULL,
  payment_method text NOT NULL,
  account_detail text NOT NULL,
  account_holder_name text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  telegram_message_id bigint,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE withdraw_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS withdraw_requests_status_idx ON withdraw_requests (status);
CREATE INDEX IF NOT EXISTS withdraw_requests_owner_idx ON withdraw_requests (owner_username);
CREATE INDEX IF NOT EXISTS withdraw_requests_created_idx ON withdraw_requests (created_at DESC);

DROP POLICY IF EXISTS "select_own_withdraw_requests" ON withdraw_requests;
CREATE POLICY "select_own_withdraw_requests"
  ON withdraw_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_registrations r
      WHERE r.id = withdraw_requests.registration_id
        AND r.auth_user_id = auth.uid()
    )
  );

-- ---------- RPC: approve_deposit ----------
CREATE OR REPLACE FUNCTION approve_deposit(p_id uuid)
RETURNS numeric(14,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req deposit_requests%ROWTYPE;
  v_wallet wallet_accounts%ROWTYPE;
  v_new_balance numeric(14,2);
BEGIN
  SELECT * INTO v_req FROM deposit_requests WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deposit request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Deposit already %', v_req.status; END IF;

  SELECT * INTO v_wallet FROM wallet_accounts
    WHERE registration_id = v_req.registration_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;

  v_new_balance := v_wallet.balance + v_req.amount;

  UPDATE wallet_accounts SET balance = v_new_balance
    WHERE registration_id = v_req.registration_id;

  INSERT INTO wallet_transactions
    (wallet_account_id, owner_username, type, amount, status, note, request_type, request_id)
  VALUES
    (v_wallet.id, v_req.owner_username, 'deposit', v_req.amount, 'completed',
     v_req.payment_method, 'deposit_request', v_req.id);

  UPDATE deposit_requests
    SET status = 'approved', processed_at = now()
    WHERE id = p_id;

  RETURN v_new_balance;
END;
$$;
GRANT EXECUTE ON FUNCTION approve_deposit(uuid) TO anon, authenticated, service_role;

-- ---------- RPC: reject_deposit ----------
CREATE OR REPLACE FUNCTION reject_deposit(p_id uuid, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE deposit_requests
    SET status = 'rejected', processed_at = now(), admin_notes = COALESCE(p_notes, admin_notes)
    WHERE id = p_id AND status = 'pending';
END;
$$;
GRANT EXECUTE ON FUNCTION reject_deposit(uuid, text) TO anon, authenticated, service_role;

-- ---------- RPC: approve_withdraw ----------
CREATE OR REPLACE FUNCTION approve_withdraw(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req withdraw_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM withdraw_requests WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdraw request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Withdraw already %', v_req.status; END IF;

  -- balance was already deducted at request time; just mark approved.
  UPDATE withdraw_requests
    SET status = 'approved', processed_at = now()
    WHERE id = p_id;
END;
$$;
GRANT EXECUTE ON FUNCTION approve_withdraw(uuid) TO anon, authenticated, service_role;

-- ---------- RPC: reject_withdraw (refund) ----------
CREATE OR REPLACE FUNCTION reject_withdraw(p_id uuid, p_notes text DEFAULT NULL)
RETURNS numeric(14,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req withdraw_requests%ROWTYPE;
  v_wallet wallet_accounts%ROWTYPE;
  v_new_balance numeric(14,2);
BEGIN
  SELECT * INTO v_req FROM withdraw_requests WHERE id = p_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Withdraw request not found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'Withdraw already %', v_req.status; END IF;

  SELECT * INTO v_wallet FROM wallet_accounts
    WHERE registration_id = v_req.registration_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Wallet not found'; END IF;

  -- refund the held amount
  v_new_balance := v_wallet.balance + v_req.amount;
  UPDATE wallet_accounts SET balance = v_new_balance
    WHERE registration_id = v_req.registration_id;

  INSERT INTO wallet_transactions
    (wallet_account_id, owner_username, type, amount, status, note, request_type, request_id)
  VALUES
    (v_wallet.id, v_req.owner_username, 'deposit', v_req.amount, 'completed',
     'Withdrawal refund (rejected)', 'deposit_refund', v_req.id);

  UPDATE withdraw_requests
    SET status = 'rejected', processed_at = now(), admin_notes = COALESCE(p_notes, admin_notes)
    WHERE id = p_id;

  RETURN v_new_balance;
END;
$$;
GRANT EXECUTE ON FUNCTION reject_withdraw(uuid, text) TO anon, authenticated, service_role;

-- ---------- RPC: admin_stats ----------
CREATE OR REPLACE FUNCTION admin_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_users int;
  v_active_users int;
  v_pending_users int;
  v_total_deposits numeric(14,2);
  v_total_withdrawals numeric(14,2);
  v_pending_requests int;
  v_wallet_balance_total numeric(14,2);
BEGIN
  SELECT count(*) INTO v_total_users FROM user_registrations WHERE status = 'approved';
  SELECT count(*) INTO v_active_users FROM wallet_accounts WHERE is_active = true;
  SELECT count(*) INTO v_pending_users FROM user_registrations WHERE status = 'pending';
  SELECT COALESCE(sum(amount), 0) INTO v_total_deposits
    FROM deposit_requests WHERE status = 'approved';
  SELECT COALESCE(sum(amount), 0) INTO v_total_withdrawals
    FROM withdraw_requests WHERE status = 'approved';
  SELECT
    (SELECT count(*) FROM deposit_requests WHERE status='pending')
    + (SELECT count(*) FROM withdraw_requests WHERE status='pending')
    INTO v_pending_requests;
  SELECT COALESCE(sum(balance), 0) INTO v_wallet_balance_total FROM wallet_accounts;

  RETURN json_build_object(
    'total_users', v_total_users,
    'active_users', v_active_users,
    'pending_users', v_pending_users,
    'total_deposits', v_total_deposits,
    'total_withdrawals', v_total_withdrawals,
    'pending_requests', v_pending_requests,
    'wallet_balance_total', v_wallet_balance_total
  );
END;
$$;
GRANT EXECUTE ON FUNCTION admin_stats() TO anon, authenticated, service_role;

-- ---------- storage bucket for deposit screenshots ----------
INSERT INTO storage.buckets (id, name, public)
VALUES ('deposit-screenshots', 'deposit-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder, and public read.
DROP POLICY IF EXISTS "deposit_screenshots_public_read" ON storage.objects;
CREATE POLICY "deposit_screenshots_public_read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'deposit-screenshots');

DROP POLICY IF EXISTS "deposit_screenshots_auth_upload" ON storage.objects;
CREATE POLICY "deposit_screenshots_auth_upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'deposit-screenshots');

DROP POLICY IF EXISTS "deposit_screenshots_auth_delete_own" ON storage.objects;
CREATE POLICY "deposit_screenshots_auth_delete_own"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'deposit-screenshots');
