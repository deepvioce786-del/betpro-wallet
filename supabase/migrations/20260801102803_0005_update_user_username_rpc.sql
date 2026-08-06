-- RPC: update_user_username(p_reg_id, p_new_username)
-- Atomically checks uniqueness (case-insensitive, excluding the user's own row)
-- and updates the username across user_registrations, wallet_accounts, and
-- wallet_transactions so the new username appears everywhere on the website.
-- Raises an exception if the new username is already taken by another user.
CREATE OR REPLACE FUNCTION update_user_username(p_reg_id uuid, p_new_username text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_username text;
  v_wallet_id uuid;
BEGIN
  -- Fetch the current username and wallet id
  SELECT username, wallet_account_id INTO v_old_username, v_wallet_id
    FROM user_registrations WHERE id = p_reg_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registration not found';
  END IF;

  -- Uniqueness check: reject if another registration already uses this username
  PERFORM 1 FROM user_registrations
    WHERE lower(username) = lower(p_new_username) AND id <> p_reg_id;
  IF FOUND THEN
    RAISE EXCEPTION 'This username is already taken by another user';
  END IF;

  -- Update the main registration row
  UPDATE user_registrations SET username = p_new_username WHERE id = p_reg_id;

  -- Cascade the new username into wallet_accounts
  IF v_wallet_id IS NOT NULL THEN
    UPDATE wallet_accounts SET owner_username = p_new_username WHERE id = v_wallet_id;
  END IF;

  -- Cascade into wallet_transactions for this user's wallet
  IF v_wallet_id IS NOT NULL THEN
    UPDATE wallet_transactions SET owner_username = p_new_username WHERE wallet_account_id = v_wallet_id;
  END IF;

  RETURN p_new_username;
END;
$$;

GRANT EXECUTE ON FUNCTION update_user_username(uuid, text) TO anon, authenticated, service_role;
