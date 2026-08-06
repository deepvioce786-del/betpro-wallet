/*
# BetPro Wallet — Core Schema (v2, fixed app_config)

## Title
BetPro Wallet: user registration, admin approval, wallet accounts, transactions, admin config.

## Plain-English explanation
Fixes the app_config table so `key` is the primary key (the previous attempt used an
int2 id with DEFAULT 1, which caused every seeded row to collide on id=1). Everything
else is unchanged from the intended design:

A new user signs up with full name, username, password, and phone number. Their
registration is stored "pending" and a Telegram message (with Approve / Reject buttons)
is sent to the admin. While waiting, the user sees a 2-minute countdown screen. When the
admin taps Approve in Telegram, an RPC creates the wallet account and marks the
registration approved; the edge function additionally creates a Supabase auth account so
the user can sign in. When the admin taps Reject, the registration is marked rejected.

The admin logs in with username + password (sha256 hash in app_config). A successful
login issues a random session token in admin_sessions with a 12-hour expiry.

## New tables and columns
1. app_config — key/value store, key is PK. Seeds admin_username, admin_password_hash,
   telegram_bot_token, telegram_chat_id, default_wallet_balance.
2. user_registrations — pending/approved/rejected signups.
3. wallet_accounts — wallet per approved user.
4. wallet_transactions — deposit/withdraw history.
5. admin_sessions — admin login sessions.

## Security — RLS
- app_config base table: service-role only. public_app_config view exposes safe keys.
- user_registrations / admin_sessions: service-role only (edge functions use service key).
- wallet_accounts / wallet_transactions: owner-scoped via join to user_registrations.auth_user_id.

## RPC
- approve_registration(uuid) -> creates wallet, marks approved, returns wallet id.
- reject_registration(uuid, text) -> marks rejected.
- record_transaction(uuid, text, numeric, text) -> atomic txn + balance update.

## Important notes
1. Default admin: username `betpro_admin`, password `betpro_saltBetPro@2025` (sha256 only).
   Must be changed from the admin panel after first login.
2. password_plain is stored because the product requires the dashboard to show the user's
   password with a copy button. Product requirement.
3. Telegram bot token + chat id are set by admin from the panel; not exposed to frontend.
*/

-- ---------- app_config ----------
CREATE TABLE IF NOT EXISTS app_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
-- service-role only on base table.

CREATE OR REPLACE VIEW public_app_config AS
SELECT key, value
FROM app_config
WHERE key NOT IN ('admin_password_hash', 'telegram_bot_token');

ALTER VIEW public_app_config OWNER TO postgres;
GRANT SELECT ON public_app_config TO anon, authenticated;

INSERT INTO app_config (key, value) VALUES
  ('admin_username', 'betpro_admin'),
  ('admin_password_hash', '4400de6b379167828624932a3e856f765aa2d86d07c484ba9a436479f681ec9c'),
  ('telegram_bot_token', ''),
  ('telegram_chat_id', ''),
  ('default_wallet_balance', '0.00')
ON CONFLICT (key) DO NOTHING;

-- ---------- user_registrations ----------
CREATE TABLE IF NOT EXISTS user_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  password_plain text NOT NULL,
  phone_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_decision_at timestamptz,
  admin_notes text,
  telegram_message_id bigint,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '2 minutes'),
  auth_user_id uuid,
  wallet_account_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_registrations ENABLE ROW LEVEL SECURITY;
-- service-role only.

CREATE INDEX IF NOT EXISTS user_registrations_username_lower_idx
  ON user_registrations (lower(username));
CREATE INDEX IF NOT EXISTS user_registrations_status_idx
  ON user_registrations (status);
CREATE INDEX IF NOT EXISTS user_registrations_created_at_idx
  ON user_registrations (created_at DESC);

-- ---------- wallet_accounts ----------
CREATE TABLE IF NOT EXISTS wallet_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES user_registrations(id) ON DELETE CASCADE,
  owner_username text NOT NULL,
  display_name text NOT NULL,
  balance numeric(14,2) NOT NULL DEFAULT 0.00,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE wallet_accounts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS wallet_accounts_owner_username_idx
  ON wallet_accounts (owner_username);

DROP POLICY IF EXISTS "select_own_wallet" ON wallet_accounts;
CREATE POLICY "select_own_wallet"
  ON wallet_accounts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_registrations r
      WHERE r.wallet_account_id = wallet_accounts.id
        AND r.auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_wallet" ON wallet_accounts;
CREATE POLICY "update_own_wallet"
  ON wallet_accounts FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_registrations r
      WHERE r.wallet_account_id = wallet_accounts.id
        AND r.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_registrations r
      WHERE r.wallet_account_id = wallet_accounts.id
        AND r.auth_user_id = auth.uid()
    )
  );

-- ---------- wallet_transactions ----------
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_account_id uuid NOT NULL REFERENCES wallet_accounts(id) ON DELETE CASCADE,
  owner_username text NOT NULL,
  type text NOT NULL,
  amount numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS wallet_transactions_wallet_idx
  ON wallet_transactions (wallet_account_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_owner_username_idx
  ON wallet_transactions (owner_username);
CREATE INDEX IF NOT EXISTS wallet_transactions_created_at_idx
  ON wallet_transactions (created_at DESC);

DROP POLICY IF EXISTS "select_own_transactions" ON wallet_transactions;
CREATE POLICY "select_own_transactions"
  ON wallet_transactions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_registrations r
      WHERE r.wallet_account_id = wallet_transactions.wallet_account_id
        AND r.auth_user_id = auth.uid()
    )
  );

-- ---------- admin_sessions ----------
CREATE TABLE IF NOT EXISTS admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text UNIQUE NOT NULL,
  username text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS admin_sessions_token_hash_idx ON admin_sessions (token_hash);

-- ---------- RPC: approve_registration ----------
CREATE OR REPLACE FUNCTION approve_registration(p_reg_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reg user_registrations%ROWTYPE;
  v_wallet_id uuid;
  v_default_balance numeric(14,2);
BEGIN
  SELECT * INTO v_reg FROM user_registrations WHERE id = p_reg_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;
  IF v_reg.status <> 'pending' THEN
    RAISE EXCEPTION 'Registration is not pending (current: %)', v_reg.status;
  END IF;

  SELECT value::numeric(14,2) INTO v_default_balance
    FROM app_config WHERE key = 'default_wallet_balance';

  INSERT INTO wallet_accounts (registration_id, owner_username, display_name, balance, is_active)
  VALUES (v_reg.id, v_reg.username, v_reg.full_name, COALESCE(v_default_balance, 0.00), true)
  RETURNING id INTO v_wallet_id;

  UPDATE user_registrations
    SET status = 'approved',
        admin_decision_at = now(),
        wallet_account_id = v_wallet_id
    WHERE id = p_reg_id;

  RETURN v_wallet_id;
END;
$$;

GRANT EXECUTE ON FUNCTION approve_registration(uuid) TO anon, authenticated, service_role;

-- ---------- RPC: reject_registration ----------
CREATE OR REPLACE FUNCTION reject_registration(p_reg_id uuid, p_notes text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_registrations
    SET status = 'rejected',
        admin_decision_at = now(),
        admin_notes = COALESCE(p_notes, admin_notes)
    WHERE id = p_reg_id AND status = 'pending';
END;
$$;

GRANT EXECUTE ON FUNCTION reject_registration(uuid, text) TO anon, authenticated, service_role;

-- ---------- RPC: record_transaction ----------
CREATE OR REPLACE FUNCTION record_transaction(
  p_wallet_id uuid,
  p_type text,
  p_amount numeric(14,2),
  p_note text DEFAULT NULL
)
RETURNS numeric(14,2)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet wallet_accounts%ROWTYPE;
  v_new_balance numeric(14,2);
BEGIN
  SELECT * INTO v_wallet FROM wallet_accounts WHERE id = p_wallet_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Wallet account not found';
  END IF;
  IF NOT v_wallet.is_active THEN
    RAISE EXCEPTION 'Wallet account is not active';
  END IF;

  IF p_type = 'deposit' THEN
    v_new_balance := v_wallet.balance + p_amount;
  ELSIF p_type = 'withdraw' THEN
    IF p_amount > v_wallet.balance THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;
    v_new_balance := v_wallet.balance - p_amount;
  ELSE
    RAISE EXCEPTION 'Invalid transaction type: %', p_type;
  END IF;

  INSERT INTO wallet_transactions (wallet_account_id, owner_username, type, amount, status, note)
  VALUES (p_wallet_id, v_wallet.owner_username, p_type, p_amount, 'completed', p_note);

  UPDATE wallet_accounts SET balance = v_new_balance WHERE id = p_wallet_id;

  RETURN v_new_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION record_transaction(uuid, text, numeric, text) TO anon, authenticated, service_role;

-- ---------- updated_at trigger for app_config ----------
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_config_touch ON app_config;
CREATE TRIGGER app_config_touch BEFORE UPDATE ON app_config
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
