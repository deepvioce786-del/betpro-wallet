import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  corsHeaders, json, sha256Hex, randomToken,
  getEnv, escHtml, fmtDateTime, getTelegramConfig,
  sendTelegramMessage, editTelegramMessage, validateAdmin, parseError,
} from "../_shared/telegram.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const env = getEnv();
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/admin-api/, "").replace(/^\/+/, "");

    if (req.method === "GET" && (path === "health" || path === "")) {
      return json({ ok: true, service: "admin-api" });
    }

    // POST /admin-api/login
    if (req.method === "POST" && path === "login") {
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      if (!username || !password) return json({ error: "Username and password are required" }, 400);

      const { data: userRow } = await supabase
        .from("app_config").select("value").eq("key", "admin_username").maybeSingle();
      const storedUsername = userRow?.value || "";
      if (storedUsername.toLowerCase() !== username.toLowerCase())
        return json({ error: "Invalid credentials" }, 401);

      const { data: passRow } = await supabase
        .from("app_config").select("value").eq("key", "admin_password_hash").maybeSingle();
      const storedHash = passRow?.value || "";
      const providedHash = await sha256Hex(password);
      if (providedHash !== storedHash) return json({ error: "Invalid credentials" }, 401);

      const token = randomToken();
      const tokenHash = await sha256Hex(token);
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error: sErr } = await supabase.from("admin_sessions")
        .insert({ token_hash: tokenHash, username: storedUsername, expires_at: expiresAt });
      if (sErr) return json({ error: sErr.message }, 500);
      return json({ ok: true, token, username: storedUsername, expiresAt });
    }

    // POST /admin-api/logout
    if (req.method === "POST" && path === "logout") {
      const auth = req.headers.get("Authorization") || "";
      const token = auth.replace(/^Bearer\s+/i, "").trim();
      if (token) {
        const th = await sha256Hex(token);
        await supabase.from("admin_sessions").delete().eq("token_hash", th);
      }
      return json({ ok: true });
    }

    // ---- All routes below require admin auth ----

    // GET /admin-api/stats
    if (req.method === "GET" && path === "stats") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const { data, error } = await supabase.rpc("admin_stats");
      if (error) return json({ error: error.message }, 500);
      return json({ stats: data });
    }

    // GET /admin-api/registrations?status=...
    if (req.method === "GET" && path === "registrations") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const status = url.searchParams.get("status") || undefined;
      let q = supabase.from("user_registrations")
        .select("id, full_name, username, phone_number, password_plain, status, admin_decision_at, admin_notes, expires_at, created_at, wallet_account_id")
        .order("created_at", { ascending: false }).limit(300);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ registrations: data || [] });
    }

    // GET /admin-api/users — approved users with wallet info (for user management)
    if (req.method === "GET" && path === "users") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const search = url.searchParams.get("search") || undefined;
      let q = supabase.from("user_registrations")
        .select("id, full_name, username, phone_number, password_plain, status, created_at, wallet_account_id, wallet_accounts!wallet_accounts_registration_id_fkey(id, balance, is_active)")
        .eq("status", "approved")
        .order("created_at", { ascending: false });
      if (search) q = q.or(`username.ilike.%${search}%,full_name.ilike.%${search}%,phone_number.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ users: data || [] });
    }

    // POST /admin-api/approve (user registration)
    if (req.method === "POST" && path === "approve") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const registrationId = String(body.registrationId || "");
      if (!registrationId) return json({ error: "registrationId is required" }, 400);

      const { data: walletId, error: rpcErr } = await supabase.rpc("approve_registration", { p_reg_id: registrationId });
      if (rpcErr) return json({ error: rpcErr.message }, 500);

      const { data: reg } = await supabase
        .from("user_registrations").select("id, username, full_name, auth_user_id, phone_number, telegram_message_id")
        .eq("id", registrationId).maybeSingle();
      if (reg && !reg.auth_user_id) {
        const authEmail = `${reg.username.toLowerCase()}@betpro-wallet.app`;
        const rp = randomToken();
        const { data: signUp, error: signUpErr } = await supabase.auth.admin.createUser({
          email: authEmail, password: rp, email_confirm: true,
          user_metadata: { username: reg.username, full_name: reg.full_name },
        });
        if (!signUpErr && signUp) {
          await supabase.from("user_registrations").update({ auth_user_id: signUp.user.id }).eq("id", reg.id);
        }
      }

      // Telegram: User Approved notification
      if (reg) {
        const tg = await getTelegramConfig(supabase);
        if (tg.botToken && tg.chatId && reg.telegram_message_id) {
          const newText =
            `🆕 <b>New User Registration</b>\n\n` +
            `👤 <b>Name:</b> ${escHtml(reg.full_name)}\n` +
            `🔑 <b>Username:</b> ${escHtml(reg.username)}\n` +
            `📞 <b>Phone:</b> ${escHtml(reg.phone_number)}\n\n` +
            `✅ <b>APPROVED</b> — account activated\n` +
            `🕐 ${fmtDateTime()}`;
          await editTelegramMessage(tg.botToken, tg.chatId, reg.telegram_message_id, newText);
        }
      }
      return json({ ok: true, walletId });
    }

    // POST /admin-api/reject (user registration)
    if (req.method === "POST" && path === "reject") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const registrationId = String(body.registrationId || "");
      const notes = body.notes ? String(body.notes) : null;
      if (!registrationId) return json({ error: "registrationId is required" }, 400);

      const { error: rpcErr } = await supabase.rpc("reject_registration", { p_reg_id: registrationId, p_notes: notes });
      if (rpcErr) return json({ error: rpcErr.message }, 500);

      const { data: reg } = await supabase
        .from("user_registrations").select("username, full_name, phone_number, telegram_message_id")
        .eq("id", registrationId).maybeSingle();
      if (reg) {
        const tg = await getTelegramConfig(supabase);
        if (tg.botToken && tg.chatId && reg.telegram_message_id) {
          const newText =
            `🆕 <b>New User Registration</b>\n\n` +
            `👤 <b>Name:</b> ${escHtml(reg.full_name)}\n` +
            `🔑 <b>Username:</b> ${escHtml(reg.username)}\n` +
            `📞 <b>Phone:</b> ${escHtml(reg.phone_number)}\n\n` +
            `❌ <b>REJECTED</b>\n` +
            `🕐 ${fmtDateTime()}`;
          await editTelegramMessage(tg.botToken, tg.chatId, reg.telegram_message_id, newText);
        }
      }
      return json({ ok: true });
    }

    // ---- Deposit requests ----

    // GET /admin-api/deposits?status=...
    if (req.method === "GET" && path === "deposits") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const status = url.searchParams.get("status") || undefined;
      let q = supabase.from("deposit_requests")
        .select("id, owner_username, amount, payment_method, screenshot_url, status, admin_notes, created_at, processed_at, registration_id")
        .order("created_at", { ascending: false }).limit(200);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ deposits: data || [] });
    }

    // POST /admin-api/deposit-approve
    if (req.method === "POST" && path === "deposit-approve") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const id = String(body.id || "");
      if (!id) return json({ error: "id is required" }, 400);

      const { data: newBalance, error: rpcErr } = await supabase.rpc("approve_deposit", { p_id: id });
      if (rpcErr) return json({ error: rpcErr.message }, 500);

      // Telegram: Deposit Approved
      const { data: dep } = await supabase
        .from("deposit_requests").select("owner_username, amount, telegram_message_id, registration_id")
        .eq("id", id).maybeSingle();
      if (dep) {
        const { data: reg } = await supabase
          .from("user_registrations").select("phone_number").eq("id", dep.registration_id).maybeSingle();
        const tg = await getTelegramConfig(supabase);
        if (tg.botToken && tg.chatId && dep.telegram_message_id) {
          const newText =
            `💰 <b>Deposit Request</b>\n\n` +
            `👤 <b>Username:</b> ${escHtml(dep.owner_username)}\n` +
            `💵 <b>Amount:</b> Rs ${Number(dep.amount).toFixed(2)}\n\n` +
            `✅ <b>DEPOSIT APPROVED</b> — balance credited\n` +
            `🕐 ${fmtDateTime()}`;
          await editTelegramMessage(tg.botToken, tg.chatId, dep.telegram_message_id, newText);
        }
        if (tg.botToken && tg.chatId) {
          await sendTelegramMessage(tg.botToken, tg.chatId,
            `✅ <b>Deposit Approved</b>\n👤 ${escHtml(dep.owner_username)}\n💵 Rs ${Number(dep.amount).toFixed(2)}\n📞 ${escHtml(reg?.phone_number || "N/A")}\n🕐 ${fmtDateTime()}`);
        }
      }
      // Update referral event if this is the referred user's first approved deposit
      if (dep) {
        const { data: refEvent } = await supabase
          .from("referral_events")
          .select("id")
          .eq("referred_username", dep.owner_username)
          .is("first_deposit_at", null)
          .maybeSingle();
        if (refEvent) {
          await supabase.from("referral_events").update({
            first_deposit_amount: dep.amount,
            first_deposit_at: new Date().toISOString(),
            status: Number(dep.amount) >= 3000 ? "qualified" : "pending",
            updated_at: new Date().toISOString(),
          }).eq("id", refEvent.id);
        }
      }
      return json({ ok: true, newBalance });
    }

    // POST /admin-api/deposit-reject
    if (req.method === "POST" && path === "deposit-reject") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const id = String(body.id || "");
      const notes = body.notes ? String(body.notes) : null;
      if (!id) return json({ error: "id is required" }, 400);

      const { error: rpcErr } = await supabase.rpc("reject_deposit", { p_id: id, p_notes: notes });
      if (rpcErr) return json({ error: rpcErr.message }, 500);

      const { data: dep } = await supabase
        .from("deposit_requests").select("owner_username, amount, telegram_message_id, registration_id")
        .eq("id", id).maybeSingle();
      if (dep) {
        const { data: reg } = await supabase
          .from("user_registrations").select("phone_number").eq("id", dep.registration_id).maybeSingle();
        const tg = await getTelegramConfig(supabase);
        if (tg.botToken && tg.chatId && dep.telegram_message_id) {
          const newText =
            `💰 <b>Deposit Request</b>\n\n` +
            `👤 <b>Username:</b> ${escHtml(dep.owner_username)}\n` +
            `💵 <b>Amount:</b> Rs ${Number(dep.amount).toFixed(2)}\n\n` +
            `❌ <b>DEPOSIT REJECTED</b>\n` +
            `🕐 ${fmtDateTime()}`;
          await editTelegramMessage(tg.botToken, tg.chatId, dep.telegram_message_id, newText);
        }
        if (tg.botToken && tg.chatId) {
          await sendTelegramMessage(tg.botToken, tg.chatId,
            `❌ <b>Deposit Rejected</b>\n👤 ${escHtml(dep.owner_username)}\n💵 Rs ${Number(dep.amount).toFixed(2)}\n📞 ${escHtml(reg?.phone_number || "N/A")}\n🕐 ${fmtDateTime()}`);
        }
      }
      return json({ ok: true });
    }

    // ---- Withdraw requests ----

    // GET /admin-api/withdrawals?status=...
    if (req.method === "GET" && path === "withdrawals") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const status = url.searchParams.get("status") || undefined;
      let q = supabase.from("withdraw_requests")
        .select("id, owner_username, amount, payment_method, account_detail, account_holder_name, status, admin_notes, created_at, processed_at, registration_id")
        .order("created_at", { ascending: false }).limit(200);
      if (status) q = q.eq("status", status);
      const { data, error } = await q;
      if (error) return json({ error: error.message }, 500);
      return json({ withdrawals: data || [] });
    }

    // POST /admin-api/withdraw-approve
    if (req.method === "POST" && path === "withdraw-approve") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const id = String(body.id || "");
      if (!id) return json({ error: "id is required" }, 400);

      const { error: rpcErr } = await supabase.rpc("approve_withdraw", { p_id: id });
      if (rpcErr) return json({ error: rpcErr.message }, 500);

      const { data: wd } = await supabase
        .from("withdraw_requests").select("owner_username, amount, telegram_message_id, registration_id")
        .eq("id", id).maybeSingle();
      if (wd) {
        const { data: reg } = await supabase
          .from("user_registrations").select("phone_number").eq("id", wd.registration_id).maybeSingle();
        const tg = await getTelegramConfig(supabase);
        if (tg.botToken && tg.chatId && wd.telegram_message_id) {
          const newText =
            `💸 <b>Withdrawal Request</b>\n\n` +
            `👤 <b>Username:</b> ${escHtml(wd.owner_username)}\n` +
            `💵 <b>Amount:</b> Rs ${Number(wd.amount).toFixed(2)}\n\n` +
            `✅ <b>WITHDRAW APPROVED</b>\n` +
            `🕐 ${fmtDateTime()}`;
          await editTelegramMessage(tg.botToken, tg.chatId, wd.telegram_message_id, newText);
        }
        if (tg.botToken && tg.chatId) {
          await sendTelegramMessage(tg.botToken, tg.chatId,
            `✅ <b>Withdrawal Approved</b>\n👤 ${escHtml(wd.owner_username)}\n💵 Rs ${Number(wd.amount).toFixed(2)}\n📞 ${escHtml(reg?.phone_number || "N/A")}\n🕐 ${fmtDateTime()}`);
        }
      }
      return json({ ok: true });
    }

    // POST /admin-api/withdraw-reject
    if (req.method === "POST" && path === "withdraw-reject") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const id = String(body.id || "");
      const notes = body.notes ? String(body.notes) : null;
      if (!id) return json({ error: "id is required" }, 400);

      const { data: newBalance, error: rpcErr } = await supabase.rpc("reject_withdraw", { p_id: id, p_notes: notes });
      if (rpcErr) return json({ error: rpcErr.message }, 500);

      const { data: wd } = await supabase
        .from("withdraw_requests").select("owner_username, amount, telegram_message_id, registration_id")
        .eq("id", id).maybeSingle();
      if (wd) {
        const { data: reg } = await supabase
          .from("user_registrations").select("phone_number").eq("id", wd.registration_id).maybeSingle();
        const tg = await getTelegramConfig(supabase);
        if (tg.botToken && tg.chatId && wd.telegram_message_id) {
          const newText =
            `💸 <b>Withdrawal Request</b>\n\n` +
            `👤 <b>Username:</b> ${escHtml(wd.owner_username)}\n` +
            `💵 <b>Amount:</b> Rs ${Number(wd.amount).toFixed(2)}\n\n` +
            `❌ <b>WITHDRAW REJECTED</b> — amount refunded\n` +
            `🕐 ${fmtDateTime()}`;
          await editTelegramMessage(tg.botToken, tg.chatId, wd.telegram_message_id, newText);
        }
        if (tg.botToken && tg.chatId) {
          await sendTelegramMessage(tg.botToken, tg.chatId,
            `❌ <b>Withdrawal Rejected</b>\n👤 ${escHtml(wd.owner_username)}\n💵 Rs ${Number(wd.amount).toFixed(2)}\n📞 ${escHtml(reg?.phone_number || "N/A")}\n🤑 Amount refunded to wallet\n🕐 ${fmtDateTime()}`);
        }
      }
      return json({ ok: true, newBalance });
    }

    // ---- User management ----

    // POST /admin-api/update-username { registrationId, newUsername }
    if (req.method === "POST" && path === "update-username") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const registrationId = String(body.registrationId || "");
      const newUsername = String(body.newUsername || "").trim();
      if (!registrationId) return json({ error: "registrationId is required" }, 400);
      if (!newUsername || newUsername.length < 3) return json({ error: "Username must be at least 3 characters" }, 400);

      // Fetch the auth_user_id before renaming so we can update the Auth email
      const { data: regRow, error: fetchErr } = await supabase
        .from("user_registrations")
        .select("auth_user_id")
        .eq("id", registrationId)
        .maybeSingle();
      if (fetchErr) return json({ error: fetchErr.message }, 500);

      const { data, error: rpcErr } = await supabase.rpc("update_user_username", {
        p_reg_id: registrationId, p_new_username: newUsername,
      });
      if (rpcErr) return json({ error: rpcErr.message }, 500);

      const newEmail = `${newUsername.toLowerCase()}@betpro-wallet.app`;

      if (regRow?.auth_user_id) {
        // If a different/orphaned auth account already holds the new email, remove it
        // so updateUserById can assign the email to the correct user.
        const { data: list } = await supabase.auth.admin.listUsers();
        const clash = (list?.users || []).find((u) => u.email === newEmail && u.id !== regRow.auth_user_id);
        if (clash) {
          await supabase.auth.admin.deleteUser(clash.id);
        }
        const { error: authErr } = await supabase.auth.admin.updateUserById(regRow.auth_user_id, { email: newEmail, email_confirm: true });
        if (authErr) return json({ error: `Username updated in DB but auth email update failed: ${authErr.message}` }, 500);
      } else {
        // No auth account yet — clear any orphaned auth account holding the new email
        // so the user's first sign-in can create a fresh account without a collision.
        const { data: list } = await supabase.auth.admin.listUsers();
        const clash = (list?.users || []).find((u) => u.email === newEmail);
        if (clash) {
          await supabase.auth.admin.deleteUser(clash.id);
        }
      }

      return json({ ok: true, username: data });
    }

    // POST /admin-api/change-user-password { registrationId, newPassword }
    if (req.method === "POST" && path === "change-user-password") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const registrationId = String(body.registrationId || "");
      const newPassword = String(body.newPassword || "");
      if (!registrationId) return json({ error: "registrationId is required" }, 400);
      if (newPassword.length < 8) return json({ error: "Password must be at least 8 characters" }, 400);
      if (!/[a-zA-Z]/.test(newPassword)) return json({ error: "Password must contain at least one alphabet letter" }, 400);
      if (/^\d+$/.test(newPassword)) return json({ error: "Password cannot contain only numbers" }, 400);

      const passwordHash = await sha256Hex(newPassword);
      const { error: updErr } = await supabase
        .from("user_registrations")
        .update({ password_hash: passwordHash, password_plain: newPassword })
        .eq("id", registrationId);
      if (updErr) return json({ error: updErr.message }, 500);

      return json({ ok: true });
    }

    // POST /admin-api/user-suspend  { walletId }
    if (req.method === "POST" && path === "user-suspend") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const walletId = String(body.walletId || "");
      if (!walletId) return json({ error: "walletId is required" }, 400);
      const { error } = await supabase.from("wallet_accounts").update({ is_active: false }).eq("id", walletId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // POST /admin-api/user-activate { walletId }
    if (req.method === "POST" && path === "user-activate") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const walletId = String(body.walletId || "");
      if (!walletId) return json({ error: "walletId is required" }, 400);
      const { error } = await supabase.from("wallet_accounts").update({ is_active: true }).eq("id", walletId);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // POST /admin-api/adjust-balance { walletId, amount, action: 'add'|'remove', note }
    if (req.method === "POST" && path === "adjust-balance") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const walletId = String(body.walletId || "");
      const amount = Number(body.amount);
      const action = String(body.action || "");
      const note = body.note ? String(body.note) : `Admin ${action} balance`;
      if (!walletId) return json({ error: "walletId is required" }, 400);
      if (!Number.isFinite(amount) || amount <= 0) return json({ error: "amount must be positive" }, 400);
      if (action !== "add" && action !== "remove") return json({ error: "action must be add or remove" }, 400);

      const type = action === "add" ? "deposit" : "withdraw";
      const { data: newBalance, error: rpcErr } = await supabase.rpc("record_transaction", {
        p_wallet_id: walletId, p_type: type, p_amount: amount, p_note: note,
      });
      if (rpcErr) return json({ error: rpcErr.message }, 500);
      return json({ ok: true, newBalance });
    }

    // GET /admin-api/user-transactions?walletId=...
    if (req.method === "GET" && path === "user-transactions") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const walletId = url.searchParams.get("walletId");
      if (!walletId) return json({ error: "walletId is required" }, 400);
      const { data, error } = await supabase.from("wallet_transactions")
        .select("id, type, amount, status, note, request_type, created_at")
        .eq("wallet_account_id", walletId)
        .order("created_at", { ascending: false }).limit(100);
      if (error) return json({ error: error.message }, 500);
      return json({ transactions: data || [] });
    }

    // GET /admin-api/all-transactions — all deposit + withdraw requests for admin
    if (req.method === "GET" && path === "all-transactions") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const [depRes, wdRes] = await Promise.all([
        supabase.from("deposit_requests")
          .select("id, owner_username, amount, payment_method, status, created_at, processed_at")
          .order("created_at", { ascending: false }).limit(200),
        supabase.from("withdraw_requests")
          .select("id, owner_username, amount, payment_method, status, created_at, processed_at")
          .order("created_at", { ascending: false }).limit(200),
      ]);
      const deposits = (depRes.data || []).map((d: Record<string, unknown>) => ({ ...d, type: "deposit" }));
      const withdrawals = (wdRes.data || []).map((w: Record<string, unknown>) => ({ ...w, type: "withdraw" }));
      const all = [...deposits, ...withdrawals].sort(
        (a, b) => new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime()
      );
      return json({ transactions: all });
    }

    // ---- Config / Wallet management ----

    // GET /admin-api/config
    if (req.method === "GET" && path === "config") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const { data, error } = await supabase.from("app_config")
        .select("key, value")
        .in("key", [
          "admin_username", "telegram_bot_token", "telegram_chat_id", "default_wallet_balance",
          "easypaisa_name", "easypaisa_number", "jazzcash_name", "jazzcash_number",
          "bank_name", "bank_holder", "bank_account", "site_currency", "site_currency_symbol",
          "whatsapp_support_number",
        ]);
      if (error) return json({ error: error.message }, 500);
      const map: Record<string, string> = {};
      for (const row of data || []) map[row.key] = row.value || "";
      return json({
        adminUsername: map.admin_username || "",
        telegramBotToken: map.telegram_bot_token || "",
        telegramChatId: map.telegram_chat_id || "",
        defaultWalletBalance: map.default_wallet_balance || "0.00",
        easypaisa: { name: map.easypaisa_name || "", number: map.easypaisa_number || "" },
        jazzcash: { name: map.jazzcash_name || "", number: map.jazzcash_number || "" },
        bank: { name: map.bank_name || "", holder: map.bank_holder || "", account: map.bank_account || "" },
        currency: map.site_currency || "PKR",
        currencySymbol: map.site_currency_symbol || "Rs",
        whatsappSupportNumber: map.whatsapp_support_number || "",
      });
    }

    // POST /admin-api/config — update telegram + wallet payment config + admin creds
    if (req.method === "POST" && path === "config") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);

      const updates: { key: string; value: string }[] = [];
      const setIf = (cond: boolean, key: string, val: string) => {
        if (cond && typeof val === "string") updates.push({ key, value: val.trim() });
      };
      setIf(true, "telegram_bot_token", body.telegramBotToken);
      setIf(true, "telegram_chat_id", body.telegramChatId);
      setIf(true, "default_wallet_balance", body.defaultWalletBalance);
      setIf(true, "easypaisa_name", body.easypaisaName);
      setIf(true, "easypaisa_number", body.easypaisaNumber);
      setIf(true, "jazzcash_name", body.jazzcashName);
      setIf(true, "jazzcash_number", body.jazzcashNumber);
      setIf(true, "bank_name", body.bankName);
      setIf(true, "bank_holder", body.bankHolder);
      setIf(true, "bank_account", body.bankAccount);
      setIf(true, "whatsapp_support_number", body.whatsappSupportNumber);
      if (typeof body.newAdminUsername === "string" && body.newAdminUsername.trim())
        updates.push({ key: "admin_username", value: body.newAdminUsername.trim() });
      if (typeof body.newAdminPassword === "string" && body.newAdminPassword.length >= 8) {
        const hash = await sha256Hex(body.newAdminPassword);
        updates.push({ key: "admin_password_hash", value: hash });
      }

      for (const u of updates) {
        const { error } = await supabase.from("app_config").update({ value: u.value }).eq("key", u.key);
        if (error) return json({ error: `Failed to update ${u.key}: ${error.message}` }, 500);
      }
      return json({ ok: true, updated: updates.map((u) => u.key) });
    }

    // POST /admin-api/test-telegram — send a test message with current config
    if (req.method === "POST" && path === "test-telegram") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      const tg = await getTelegramConfig(supabase);
      const botToken = body?.botToken ?? tg.botToken;
      const chatId = body?.chatId ?? tg.chatId;
      if (!botToken || !chatId) return json({ error: "Bot token and chat ID are required" }, 400);
      const res = await sendTelegramMessage(botToken, chatId,
        `🧪 <b>Test Connection</b>\n\n✅ BetPro Wallet Telegram bot is working correctly!\n🕐 ${fmtDateTime()}`);
      if (res.error) return json({ error: res.error }, 500);
      return json({ ok: true, messageId: res.message_id });
    }

    // POST /admin-api/set-webhook
    if (req.method === "POST" && path === "set-webhook") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const webhookUrl = String(body.webhookUrl || "").trim();
      if (!webhookUrl) return json({ error: "webhookUrl is required" }, 400);
      const { data: tokenRow } = await supabase.from("app_config").select("value").eq("key", "telegram_bot_token").maybeSingle();
      const botToken = tokenRow?.value || "";
      if (!botToken) return json({ error: "Telegram bot token is not set" }, 400);
      const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl }),
      });
      const data = await res.json();
      if (!data.ok) return json({ error: data.description || "setWebhook failed" }, 500);
      return json({ ok: true, webhookUrl, description: data.description });
    }

    // GET /admin-api/webhook-info
    if (req.method === "GET" && path === "webhook-info") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const { data: tokenRow } = await supabase.from("app_config").select("value").eq("key", "telegram_bot_token").maybeSingle();
      const botToken = tokenRow?.value || "";
      if (!botToken) return json({ error: "Telegram bot token is not set" }, 400);
      const res = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
      const data = await res.json();
      if (!data.ok) return json({ error: data.description || "getWebhookInfo failed" }, 500);
      return json({ ok: true, info: data.result });
    }

    // ---- Helpline ----

    // GET /admin-api/helpline  → all conversations grouped by user
    if (req.method === "GET" && path === "helpline") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);

      const { data: messages, error: msgErr } = await supabase
        .from("helpline_messages")
        .select("id, registration_id, sender, message, is_read, created_at")
        .order("created_at", { ascending: true })
        .limit(2000);
      if (msgErr) return json({ error: msgErr.message }, 500);

      // Get registration info for each unique registration_id
      const regIds = [...new Set((messages || []).map((m: { registration_id: string }) => m.registration_id))];
      const { data: regs } = await supabase
        .from("user_registrations")
        .select("id, username, full_name")
        .in("id", regIds);

      const regMap: Record<string, { username: string; full_name: string }> = {};
      for (const r of regs || []) regMap[r.id] = { username: r.username, full_name: r.full_name };

      // Group messages by registration_id
      const conversations: Array<{
        registration_id: string;
        username: string;
        full_name: string;
        messages: Array<{ id: string; sender: string; message: string; is_read: boolean; created_at: string }>;
        last_message_at: string;
        unread_count: number;
      }> = [];
      const convMap: Record<string, number> = {};
      for (const msg of messages || []) {
        const rid = msg.registration_id;
        if (!(rid in convMap)) {
          convMap[rid] = conversations.length;
          conversations.push({
            registration_id: rid,
            username: regMap[rid]?.username || "unknown",
            full_name: regMap[rid]?.full_name || "Unknown",
            messages: [],
            last_message_at: msg.created_at,
            unread_count: 0,
          });
        }
        const conv = conversations[convMap[rid]];
        conv.messages.push(msg);
        conv.last_message_at = msg.created_at;
        if (msg.sender === "user" && !msg.is_read) conv.unread_count++;
      }

      // Sort conversations by last message time (most recent first)
      conversations.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

      // Update admin_last_seen
      await supabase.from("app_config")
        .update({ value: new Date().toISOString() })
        .eq("key", "admin_last_seen");

      return json({ conversations });
    }

    // POST /admin-api/helpline-reply  { registrationId, message }
    if (req.method === "POST" && path === "helpline-reply") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const registrationId = String(body.registrationId || "");
      const message = String(body.message || "").trim();
      if (!registrationId) return json({ error: "registrationId is required" }, 400);
      if (!message) return json({ error: "message is required" }, 400);

      const { data: msg, error: msgErr } = await supabase
        .from("helpline_messages")
        .insert({ registration_id: registrationId, sender: "admin", message, is_read: false })
        .select("id, sender, message, is_read, created_at")
        .single();
      if (msgErr) return json({ error: msgErr.message }, 500);

      // Mark all user messages in this conversation as read
      await supabase.from("helpline_messages")
        .update({ is_read: true })
        .eq("registration_id", registrationId)
        .eq("sender", "user");

      return json({ ok: true, message: msg });
    }

    // POST /admin-api/helpline-read  { registrationId }  → mark user messages as read
    if (req.method === "POST" && path === "helpline-read") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const registrationId = String(body.registrationId || "");
      if (!registrationId) return json({ error: "registrationId is required" }, 400);

      const { error: updErr } = await supabase.from("helpline_messages")
        .update({ is_read: true })
        .eq("registration_id", registrationId)
        .eq("sender", "user");
      if (updErr) return json({ error: updErr.message }, 500);
      return json({ ok: true });
    }

    // ---- Announcements (admin CRUD) ----

    // GET /admin-api/announcements  → all announcements
    if (req.method === "GET" && path === "announcements") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, body, is_active, is_pinned, created_at, updated_at, created_by")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json({ announcements: data || [] });
    }

    // POST /admin-api/announcements  { title, body, isPinned? }  → create
    if (req.method === "POST" && path === "announcements") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const title = String(body.title || "").trim();
      const bodyText = String(body.body || "").trim();
      if (!title) return json({ error: "title is required" }, 400);
      if (!bodyText) return json({ error: "body is required" }, 400);
      const isPinned = Boolean(body.isPinned || false);
      const { data, error } = await supabase
        .from("announcements")
        .insert({ title, body: bodyText, is_pinned: isPinned, created_by: admin.username || null })
        .select("id, title, body, is_active, is_pinned, created_at, updated_at, created_by")
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, announcement: data });
    }

    // PUT /admin-api/announcements  { id, title, body, isActive }  → update
    if (req.method === "PUT" && path === "announcements") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const id = String(body.id || "");
      if (!id) return json({ error: "id is required" }, 400);
      const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.title !== undefined) update.title = String(body.title).trim();
      if (body.body !== undefined) update.body = String(body.body).trim();
      if (body.isActive !== undefined) update.is_active = Boolean(body.isActive);
      if (body.isPinned !== undefined) update.is_pinned = Boolean(body.isPinned);
      const { data, error } = await supabase
        .from("announcements")
        .update(update)
        .eq("id", id)
        .select("id, title, body, is_active, is_pinned, created_at, updated_at, created_by")
        .single();
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true, announcement: data });
    }

    // DELETE /admin-api/announcements  { id }  → delete
    if (req.method === "DELETE" && path === "announcements") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const id = String(body.id || "");
      if (!id) return json({ error: "id is required" }, 400);
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    // GET /admin-api/referrals  → all referral events
    if (req.method === "GET" && path === "referrals") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const { data, error } = await supabase
        .from("referral_events")
        .select("id, referrer_username, referred_username, first_deposit_amount, first_deposit_at, status, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      return json({ referrals: data || [] });
    }

    // PUT /admin-api/referrals  { id, status }  → update referral status
    if (req.method === "PUT" && path === "referrals") {
      const admin = await validateAdmin(supabase, req);
      if (!admin.ok) return json({ error: "Unauthorized" }, 401);
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const id = String(body.id || "");
      const status = String(body.status || "");
      if (!id) return json({ error: "id is required" }, 400);
      if (!["pending", "qualified", "bonus_given"].includes(status)) return json({ error: "Invalid status" }, 400);
      const { error } = await supabase
        .from("referral_events")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) return json({ error: error.message }, 500);
      return json({ ok: true });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    return json({ error: String(err) || "Internal server error" }, 500);
  }
});
