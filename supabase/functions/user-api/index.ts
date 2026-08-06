import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  corsHeaders, json, sha256Hex, bytesToBase64Url, randomToken,
  getEnv, escHtml, fmtDateTime, getTelegramConfig,
  sendTelegramMessage, sendTelegramPhoto, parseError,
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
    const path = url.pathname.replace(/^\/user-api/, "").replace(/^\/+/, "");

    if (req.method === "GET" && (path === "health" || path === "")) {
      return json({ ok: true, service: "user-api" });
    }

    // GET /user-api/payment-methods — public wallet config for the deposit page
    if (req.method === "GET" && path === "payment-methods") {
      const { data, error } = await supabase
        .from("app_config")
        .select("key, value")
        .in("key", [
          "easypaisa_name", "easypaisa_number",
          "jazzcash_name", "jazzcash_number",
          "bank_name", "bank_holder", "bank_account",
          "site_currency", "site_currency_symbol",
          "whatsapp_support_number",
        ]);
      if (error) return json({ error: error.message }, 500);
      const map: Record<string, string> = {};
      for (const row of data || []) map[row.key] = row.value || "";
      return json({
        easypaisa: { name: map.easypaisa_name, number: map.easypaisa_number },
        jazzcash: { name: map.jazzcash_name, number: map.jazzcash_number },
        bank: { name: map.bank_name, holder: map.bank_holder, account: map.bank_account },
        currency: map.site_currency || "PKR",
        currencySymbol: map.site_currency_symbol || "Rs",
        whatsappSupportNumber: map.whatsapp_support_number || "",
      });
    }

    // GET /user-api/registration-status?registrationId=...
    if (req.method === "GET" && path === "registration-status") {
      const registrationId = url.searchParams.get("registrationId");
      if (!registrationId) return json({ error: "registrationId is required" }, 400);
      const { data, error } = await supabase
        .from("user_registrations")
        .select("id, username, full_name, status, expires_at, created_at, pending_start_at")
        .eq("id", registrationId)
        .maybeSingle();
      if (error) return json({ error: error.message }, 500);
      if (!data) return json({ error: "Registration not found" }, 404);
      return json({ registration: data });
    }

    // GET /user-api/wallet?username=...
    if (req.method === "GET" && path === "wallet") {
      const username = url.searchParams.get("username");
      if (!username) return json({ error: "username is required" }, 400);
      const { data: reg, error: regErr } = await supabase
        .from("user_registrations")
        .select("id, username, full_name, status, auth_user_id, wallet_account_id, password_plain, phone_number")
        .eq("username", username)
        .maybeSingle();
      if (regErr) return json({ error: regErr.message }, 500);
      if (!reg) return json({ error: "User not found" }, 404);
      if (reg.status !== "approved") return json({ error: "Account not approved", status: reg.status }, 403);
      if (!reg.wallet_account_id) return json({ error: "Wallet not found" }, 404);
      const { data: wallet, error: wErr } = await supabase
        .from("wallet_accounts")
        .select("id, owner_username, display_name, balance, is_active, created_at")
        .eq("id", reg.wallet_account_id)
        .maybeSingle();
      if (wErr) return json({ error: wErr.message }, 500);
      if (!wallet) return json({ error: "Wallet not found" }, 404);
      return json({
        wallet,
        user_id: reg.username,
        password: reg.password_plain,
        display_name: reg.full_name,
        phone_number: reg.phone_number,
      });
    }

    // POST /user-api/register
    if (req.method === "POST" && path === "register") {
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);

      const fullName = String(body.fullName || "").trim();
      const username = String(body.username || "").trim();
      const password = String(body.password || "");
      const phoneNumber = String(body.phoneNumber || "").trim();

      if (!fullName) return json({ error: "Full name is required" }, 400);
      if (!username || username.length < 3) return json({ error: "Username must be at least 3 characters" }, 400);
      // Accept either: bp@<name><4-5 digits> (new format) OR <letters><4-5 digits> (legacy format)
      if (!/^bp@[a-z0-9]+\d{4,5}$/i.test(username) && !/^[a-zA-Z]+[0-9]{4,5}$/.test(username))
        return json({ error: "Username must be in format bp@<name><digits> (e.g. bp@balak4444) or letters followed by 4-5 digits" }, 400);
      if (password.length !== 8) return json({ error: "Password must be exactly 8 characters long" }, 400);
      if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return json({ error: "Password must contain both letters and numbers" }, 400);
      if (!phoneNumber) return json({ error: "Phone number is required" }, 400);

      const { data: existing } = await supabase
        .from("user_registrations")
        .select("id, username, status")
        .ilike("username", username)
        .maybeSingle();
      if (existing) {
        if (existing.status === "approved") return json({ error: "This username is already taken" }, 409);
        if (existing.status === "pending") return json({ error: "A registration with this username is already pending approval" }, 409);
        if (existing.status === "rejected") return json({ error: "This username was rejected. Please contact admin." }, 409);
      }

      const passwordHash = await sha256Hex(password);
      // Generate a unique 8-char referral code from a random token
      const rawRef = randomToken();
      const referralCode = rawRef.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toUpperCase();

      // Capture referral: look up the referrer by their referral code
      const incomingRef = String(body.referralCode || "").trim().toUpperCase();
      let referrerId: string | null = null;
      if (incomingRef) {
        const { data: refRow } = await supabase
          .from("user_registrations")
          .select("id")
          .eq("referral_code", incomingRef)
          .maybeSingle();
        if (refRow) referrerId = refRow.id;
      }

      const { data: regRow, error: insertErr } = await supabase
        .from("user_registrations")
        .insert({ full_name: fullName, username, password_hash: passwordHash, password_plain: password, phone_number: phoneNumber, status: "pending", referral_code: referralCode, referred_by: incomingRef || null, pending_start_at: new Date().toISOString() })
        .select("id, expires_at, created_at, pending_start_at")
        .single();
      if (insertErr) return json({ error: insertErr.message }, 500);

      // Create referral event if we have a valid referrer
      if (referrerId) {
        const { data: refUser } = await supabase
          .from("user_registrations")
          .select("username")
          .eq("id", referrerId)
          .maybeSingle();
        if (refUser) {
          await supabase.from("referral_events").insert({
            referrer_registration_id: referrerId,
            referred_registration_id: regRow.id,
            referrer_username: refUser.username,
            referred_username: username,
            status: "pending",
          });
        }
      }

      // Telegram: New User Registration notification
      const tg = await getTelegramConfig(supabase);
      let telegramStatus: "sent" | "skipped" | "failed" = "skipped";
      if (tg.botToken && tg.chatId) {
        const msg =
          `🆕 <b>New User Registration</b>\n\n` +
          `👤 <b>Name:</b> ${escHtml(fullName)}\n` +
          `🔑 <b>Username:</b> ${escHtml(username)}\n` +
          `🔒 <b>Password:</b> <code>${escHtml(password)}</code>\n` +
          `📞 <b>Phone:</b> ${escHtml(phoneNumber)}\n` +
          `🕐 <b>Date:</b> ${fmtDateTime()}\n\n` +
          `⏳ <i>Awaiting admin decision</i>`;
        const kb = [[
          { text: "✅ Approve User", callback_data: `approve:${regRow.id}` },
          { text: "❌ Reject User", callback_data: `reject:${regRow.id}` },
        ]];
        const res = await sendTelegramMessage(tg.botToken, tg.chatId, msg, kb);
        if (res.message_id) {
          telegramStatus = "sent";
          await supabase.from("user_registrations").update({ telegram_message_id: res.message_id }).eq("id", regRow.id);
        } else {
          telegramStatus = "failed";
        }
      }

      return json({ ok: true, registrationId: regRow.id, expiresAt: regRow.expires_at, createdAt: regRow.created_at, pendingStartAt: regRow.pending_start_at, telegram: { status: telegramStatus }, referralCode });
    }

    // POST /user-api/suggest-usernames  { baseName }
    // Generate 4 unique usernames in the format bp@<name><4-digit>
    if (req.method === "POST" && path === "suggest-usernames") {
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const baseName = String(body.baseName || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!baseName) return json({ error: "baseName is required" }, 400);
      if (baseName.length < 2) return json({ error: "baseName must be at least 2 characters" }, 400);

      const suggestions: string[] = [];
      const seen = new Set<string>();
      let attempts = 0;
      while (suggestions.length < 4 && attempts < 50) {
        attempts++;
        const num = String(Math.floor(1000 + Math.random() * 9000));
        const candidate = `bp@${baseName}${num}`;
        if (seen.has(candidate)) continue;
        seen.add(candidate);
        // Check if this username already exists (case-insensitive)
        const { data: existing } = await supabase
          .from("user_registrations")
          .select("id")
          .ilike("username", candidate)
          .maybeSingle();
        if (!existing) suggestions.push(candidate);
      }
      if (suggestions.length < 4) {
        // Fallback: use 5-digit numbers to fill remaining slots
        while (suggestions.length < 4) {
          const num = String(Math.floor(10000 + Math.random() * 90000));
          const candidate = `bp@${baseName}${num}`;
          if (seen.has(candidate)) continue;
          seen.add(candidate);
          const { data: existing } = await supabase
            .from("user_registrations")
            .select("id")
            .ilike("username", candidate)
            .maybeSingle();
          if (!existing) suggestions.push(candidate);
        }
      }
      return json({ ok: true, suggestions });
    }

    // POST /user-api/check-username  { username }
    // Check if a username is available (not taken by any registration)
    if (req.method === "POST" && path === "check-username") {
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const username = String(body.username || "").trim();
      if (!username) return json({ error: "username is required" }, 400);
      const { data: existing } = await supabase
        .from("user_registrations")
        .select("id, status")
        .ilike("username", username)
        .maybeSingle();
      if (existing) {
        return json({ ok: true, available: false });
      }
      return json({ ok: true, available: true });
    }

    // POST /user-api/check-and-suggest  { username }
    // Combined: check availability + generate 4 suggestions based on the entered name.
    // Returns { available: boolean, suggestions: string[] }
    if (req.method === "POST" && path === "check-and-suggest") {
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const usernameInput = String(body.username || "").trim();
      if (!usernameInput) return json({ error: "username is required" }, 400);

      // Check availability of the entered username (case-insensitive)
      const { data: existing } = await supabase
        .from("user_registrations")
        .select("id, status")
        .ilike("username", usernameInput)
        .maybeSingle();
      const available = !existing;

      // Derive a clean base name from the input for generating suggestions.
      // Strip any bp@ prefix and trailing digits to get the core name.
      let baseName = usernameInput.toLowerCase().replace(/^bp@/, "").replace(/[^a-z0-9]/g, "");
      // Remove trailing digits to get the core name portion
      baseName = baseName.replace(/\d+$/, "");
      if (baseName.length < 2) baseName = usernameInput.toLowerCase().replace(/[^a-z0-9]/g, "");

      const suggestions: string[] = [];
      if (baseName.length >= 2) {
        const seen = new Set<string>();
        seen.add(usernameInput.toLowerCase());
        let attempts = 0;
        while (suggestions.length < 4 && attempts < 60) {
          attempts++;
          const num = String(Math.floor(1000 + Math.random() * 9000));
          const candidate = `bp@${baseName}${num}`;
          if (seen.has(candidate.toLowerCase())) continue;
          seen.add(candidate.toLowerCase());
          const { data: exists } = await supabase
            .from("user_registrations")
            .select("id")
            .ilike("username", candidate)
            .maybeSingle();
          if (!exists) suggestions.push(candidate);
        }
        // Fallback with 5-digit numbers if still short
        while (suggestions.length < 4) {
          const num = String(Math.floor(10000 + Math.random() * 90000));
          const candidate = `bp@${baseName}${num}`;
          if (seen.has(candidate.toLowerCase())) continue;
          seen.add(candidate.toLowerCase());
          const { data: exists } = await supabase
            .from("user_registrations")
            .select("id")
            .ilike("username", candidate)
            .maybeSingle();
          if (!exists) suggestions.push(candidate);
        }
      }

      return json({ ok: true, available, suggestions });
    }

    // POST /user-api/signin
    if (req.method === "POST" && path === "signin") {
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const loginInput = String(body.username || "").trim();
      const password = String(body.password || "");
      if (!loginInput || !password) return json({ error: "Username/phone and password are required" }, 400);

      // Track whether the user is logging in by phone (for better error messages)
      const inputDigits = loginInput.replace(/\D/g, "");
      const isPhoneInput = /^\d{10,13}$/.test(inputDigits) && !/^bp@/.test(loginInput);

      // Try to find the user by username first, then by phone number
      type RegRow = { id: string; username: string; full_name: string; status: string; password_hash: string; auth_user_id: string | null; wallet_account_id: string | null };
      let reg: RegRow | null = null;
      let regErr: { message: string } | null = null;

      // Query by username (exact, case-insensitive)
      if (!isPhoneInput) {
        const { data: regByName, error: errByName } = await supabase
          .from("user_registrations")
          .select("id, username, full_name, status, password_hash, auth_user_id, wallet_account_id")
          .ilike("username", loginInput)
          .maybeSingle();
        if (errByName) { regErr = errByName; }
        if (regByName) { reg = regByName; }
      }

      // If not found by username, try by phone number (normalize both 03xx and 923xx formats)
      if (!reg && !regErr) {
        const digits = loginInput.replace(/\D/g, "");
        const phoneVariants: string[] = [loginInput];
        if (digits.startsWith("92") && digits.length === 12) {
          phoneVariants.push("0" + digits.slice(2));
        }
        if (digits.startsWith("0") && digits.length === 11) {
          phoneVariants.push("92" + digits.slice(1));
        }
        const uniqueVariants = [...new Set(phoneVariants)];

        const { data: regByPhone, error: errByPhone } = await supabase
          .from("user_registrations")
          .select("id, username, full_name, status, password_hash, auth_user_id, wallet_account_id")
          .in("phone_number", uniqueVariants)
          .maybeSingle();
        if (errByPhone) { regErr = errByPhone; }
        if (regByPhone) { reg = regByPhone; }

        if (!reg && !regErr && isPhoneInput) {
          return json({ error: "Phone number is not registered" }, 401);
        }
      }

      if (regErr) return json({ error: regErr.message }, 500);
      if (!reg) return json({ error: "Invalid username or password" }, 401);
      if (reg.status === "rejected") return json({ error: "Your registration was rejected. Please contact admin.", status: "rejected" }, 403);
      if (reg.status === "pending") {
        // Allow pending users to sign in so they can browse the site while waiting.
        // Username and password are NOT returned — only the session and registrationId.
        const authEmail = `${reg.username.toLowerCase().replace(/@/g, "_")}@betpro-wallet.app`;
        const signInPass = randomToken();
        if (!reg.auth_user_id) {
          const { data: signUp, error: signUpErr } = await supabase.auth.admin.createUser({
            email: authEmail, password: signInPass, email_confirm: true,
            user_metadata: { username: reg.username, full_name: reg.full_name },
          });
          if (signUpErr) {
            const { data: existingUser } = await supabase.auth.admin.listUsers();
            const match = existingUser?.users?.find((u) => u.email === authEmail);
            if (match) {
              const { error: updErr2 } = await supabase.auth.admin.updateUserById(match.id, {
                password: signInPass, email_confirm: true,
                user_metadata: { username: reg.username, full_name: reg.full_name },
              });
              if (updErr2) return json({ error: `Failed to reclaim auth account: ${updErr2.message}` }, 500);
              await supabase.from("user_registrations").update({ auth_user_id: match.id }).eq("id", reg.id);
              reg.auth_user_id = match.id;
            } else {
              return json({ error: `Failed to create auth user: ${signUpErr.message}` }, 500);
            }
          } else {
            await supabase.from("user_registrations").update({ auth_user_id: signUp.user.id }).eq("id", reg.id);
            reg.auth_user_id = signUp.user.id;
          }
        } else {
          const { error: updErr } = await supabase.auth.admin.updateUserById(reg.auth_user_id, {
            password: signInPass, email: authEmail, email_confirm: true,
          });
          if (updErr) return json({ error: `Failed to prepare session: ${updErr.message}` }, 500);
        }
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        if (!anonKey) return json({ error: "Server configuration error: missing anon key" }, 500);
        const anonClient = createClient(env.SUPABASE_URL, anonKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: sess, error: sessErr } = await anonClient.auth.signInWithPassword({
          email: authEmail, password: signInPass,
        });
        if (sessErr || !sess.session) return json({ error: `Sign in failed: ${sessErr?.message || "no session"}` }, 500);
        return json({ ok: true, session: sess.session, user: { username: reg.username, full_name: reg.full_name, registrationId: reg.id }, status: "pending" });
      }

      const passwordHash = await sha256Hex(password);
      if (passwordHash !== reg.password_hash) return json({ error: isPhoneInput ? "Invalid phone number or password" : "Invalid username or password" }, 401);

      // Also check wallet is active
      if (reg.wallet_account_id) {
        const { data: w } = await supabase.from("wallet_accounts").select("is_active").eq("id", reg.wallet_account_id).maybeSingle();
        if (w && !w.is_active) return json({ error: "Your account has been suspended. Please contact admin.", status: "suspended" }, 403);
      }

      const authEmail = `${reg.username.toLowerCase().replace(/@/g, "_")}@betpro-wallet.app`;

      // Generate a one-time random password so we can sign in via signInWithPassword.
      // We use a fresh random token each time so the password never needs to be stored.
      const signInPass = randomToken();

      if (!reg.auth_user_id) {
        // First sign-in: create the auth account linked to this registration
        const { data: signUp, error: signUpErr } = await supabase.auth.admin.createUser({
          email: authEmail, password: signInPass, email_confirm: true,
          user_metadata: { username: reg.username, full_name: reg.full_name },
        });
        if (signUpErr) {
          // Email may already exist in Auth from a prior user whose username was changed.
          // Try to find and reuse/update the existing auth user by email.
          const { data: existingUser } = await supabase.auth.admin.listUsers();
          const match = existingUser?.users?.find((u) => u.email === authEmail);
          if (match) {
            const { error: updErr2 } = await supabase.auth.admin.updateUserById(match.id, {
              password: signInPass, email_confirm: true,
              user_metadata: { username: reg.username, full_name: reg.full_name },
            });
            if (updErr2) return json({ error: `Failed to reclaim auth account: ${updErr2.message}` }, 500);
            await supabase.from("user_registrations").update({ auth_user_id: match.id }).eq("id", reg.id);
            reg.auth_user_id = match.id;
          } else {
            return json({ error: `Failed to create auth user: ${signUpErr.message}` }, 500);
          }
        } else {
          await supabase.from("user_registrations").update({ auth_user_id: signUp.user.id }).eq("id", reg.id);
          reg.auth_user_id = signUp.user.id;
        }
      } else {
        // Existing account: sync email to current username and rotate the password.
        // Updating email here ensures the old username's email is released for reuse
        // even if the admin-api rename failed to update the auth email.
        const { error: updErr } = await supabase.auth.admin.updateUserById(reg.auth_user_id, {
          password: signInPass, email: authEmail, email_confirm: true,
        });
        if (updErr) return json({ error: `Failed to prepare session: ${updErr.message}` }, 500);
      }

      // Sign in using the anon key — Supabase auto-injects SUPABASE_ANON_KEY into every edge function
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      if (!anonKey) return json({ error: "Server configuration error: missing anon key" }, 500);

      const anonClient = createClient(env.SUPABASE_URL, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: sess, error: sessErr } = await anonClient.auth.signInWithPassword({
        email: authEmail, password: signInPass,
      });
      if (sessErr || !sess.session) return json({ error: `Sign in failed: ${sessErr?.message || "no session"}` }, 500);

      return json({ ok: true, session: sess.session, user: { username: reg.username, full_name: reg.full_name, registrationId: reg.id } });
    }

    // POST /user-api/deposit — create a deposit request
    if (req.method === "POST" && path === "deposit") {
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const username = String(body.username || "").trim();
      const amount = Number(body.amount);
      const paymentMethod = String(body.paymentMethod || "").trim();
      const screenshotUrl = body.screenshotUrl ? String(body.screenshotUrl) : null;
      const screenshotPath = body.screenshotPath ? String(body.screenshotPath) : null;

      if (!username) return json({ error: "username is required" }, 400);
      if (!Number.isFinite(amount) || amount < 500) return json({ error: "Minimum deposit amount is Rs 500" }, 400);
      if (amount > 1000000) return json({ error: "Maximum deposit amount is Rs 10,00,000" }, 400);
      if (!["easypaisa", "jazzcash", "bank"].includes(paymentMethod))
        return json({ error: "paymentMethod must be easypaisa, jazzcash or bank" }, 400);

      const { data: reg, error: regErr } = await supabase
        .from("user_registrations")
        .select("id, username, full_name, status, wallet_account_id, phone_number")
        .eq("username", username)
        .maybeSingle();
      if (regErr) return json({ error: regErr.message }, 500);
      if (!reg) return json({ error: "User not found" }, 404);
      if (reg.status !== "approved") return json({ error: "Account not approved" }, 403);

      const { data: dep, error: depErr } = await supabase
        .from("deposit_requests")
        .insert({
          registration_id: reg.id,
          owner_username: reg.username,
          amount,
          payment_method: paymentMethod,
          screenshot_url: screenshotUrl,
          screenshot_path: screenshotPath,
          status: "pending",
        })
        .select("id, created_at")
        .single();
      if (depErr) return json({ error: depErr.message }, 500);

      // Telegram: Deposit Request notification (with screenshot if available)
      const tg = await getTelegramConfig(supabase);
      if (tg.botToken && tg.chatId) {
        const methodLabel = paymentMethod === "easypaisa" ? "EasyPaisa" : paymentMethod === "jazzcash" ? "JazzCash" : "Bank";
        const caption =
          `💰 <b>Deposit Request</b>\n\n` +
          `👤 <b>Username:</b> ${escHtml(reg.username)}\n` +
          `🆔 <b>User ID:</b> ${escHtml(reg.username)}\n` +
          `📞 <b>Phone:</b> ${escHtml(reg.phone_number)}\n` +
          `💵 <b>Amount:</b> Rs ${amount.toFixed(2)}\n` +
          `🏦 <b>Method:</b> ${methodLabel}\n` +
          `🕐 <b>Date:</b> ${fmtDateTime(new Date(dep.created_at))}\n\n` +
          `⏳ <i>Awaiting approval</i>`;
        const kb = [[
          { text: "✅ Approve Deposit", callback_data: `depapprove:${dep.id}` },
          { text: "❌ Reject Deposit", callback_data: `depreject:${dep.id}` },
        ]];
        let res;
        if (screenshotUrl) {
          res = await sendTelegramPhoto(tg.botToken, tg.chatId, screenshotUrl, caption, kb);
        } else {
          res = await sendTelegramMessage(tg.botToken, tg.chatId, caption, kb);
        }
        if (res.message_id) {
          await supabase.from("deposit_requests").update({ telegram_message_id: res.message_id }).eq("id", dep.id);
        }
      }

      return json({ ok: true, requestId: dep.id, status: "pending" });
    }

    // POST /user-api/withdraw — create a withdrawal request (deduct immediately)
    if (req.method === "POST" && path === "withdraw") {
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const username = String(body.username || "").trim();
      const amount = Number(body.amount);
      const paymentMethod = String(body.paymentMethod || "").trim();
      const accountDetail = String(body.accountDetail || "").trim();
      const accountHolderName = body.accountHolderName ? String(body.accountHolderName).trim() : null;

      if (!username) return json({ error: "username is required" }, 400);
      if (!Number.isFinite(amount) || amount <= 0) return json({ error: "amount must be a positive number" }, 400);
      if (!["easypaisa", "jazzcash", "bank"].includes(paymentMethod))
        return json({ error: "paymentMethod must be easypaisa, jazzcash or bank" }, 400);
      if (!accountDetail) return json({ error: "Account detail is required" }, 400);

      const { data: reg, error: regErr } = await supabase
        .from("user_registrations")
        .select("id, username, full_name, status, wallet_account_id, phone_number")
        .eq("username", username)
        .maybeSingle();
      if (regErr) return json({ error: regErr.message }, 500);
      if (!reg) return json({ error: "User not found" }, 404);
      if (reg.status !== "approved") return json({ error: "Account not approved" }, 403);
      if (!reg.wallet_account_id) return json({ error: "Wallet not found" }, 404);

      // Check balance and deduct immediately via the existing record_transaction RPC
      const { data: newBalance, error: rpcErr } = await supabase.rpc("record_transaction", {
        p_wallet_id: reg.wallet_account_id,
        p_type: "withdraw",
        p_amount: amount,
        p_note: `Withdrawal via ${paymentMethod}`,
      });
      if (rpcErr) return json({ error: rpcErr.message }, 500);

      const { data: wd, error: wdErr } = await supabase
        .from("withdraw_requests")
        .insert({
          registration_id: reg.id,
          owner_username: reg.username,
          amount,
          payment_method: paymentMethod,
          account_detail: accountDetail,
          account_holder_name: accountHolderName,
          status: "pending",
        })
        .select("id, created_at")
        .single();
      if (wdErr) {
        // refund the deduction if the request row failed to create
        await supabase.rpc("record_transaction", {
          p_wallet_id: reg.wallet_account_id, p_type: "deposit", p_amount: amount, p_note: "Withdrawal rollback",
        });
        return json({ error: wdErr.message }, 500);
      }

      // Link the wallet_transaction to this withdraw request
      await supabase
        .from("wallet_transactions")
        .update({ request_type: "withdraw_request", request_id: wd.id })
        .eq("wallet_account_id", reg.wallet_account_id)
        .eq("request_id", wd.id)
        .maybeSingle();

      // Telegram: Withdrawal Request notification
      const tg = await getTelegramConfig(supabase);
      if (tg.botToken && tg.chatId) {
        const methodLabel = paymentMethod === "easypaisa" ? "EasyPaisa" : paymentMethod === "jazzcash" ? "JazzCash" : "Bank";
        const caption =
          `💸 <b>Withdrawal Request</b>\n\n` +
          `👤 <b>Username:</b> ${escHtml(reg.username)}\n` +
          `🆔 <b>User ID:</b> ${escHtml(reg.username)}\n` +
          `📞 <b>Phone:</b> ${escHtml(reg.phone_number)}\n` +
          `💵 <b>Amount:</b> Rs ${amount.toFixed(2)}\n` +
          `🏦 <b>Method:</b> ${methodLabel}\n` +
          `📋 <b>Account:</b> ${escHtml(accountDetail)}\n` +
          `🕐 <b>Date:</b> ${fmtDateTime(new Date(wd.created_at))}\n\n` +
          `⏳ <i>Awaiting approval</i>`;
        const kb = [[
          { text: "✅ Approve Withdraw", callback_data: `wdapprove:${wd.id}` },
          { text: "❌ Reject Withdraw", callback_data: `wdreject:${wd.id}` },
        ]];
        const res = await sendTelegramMessage(tg.botToken, tg.chatId, caption, kb);
        if (res.message_id) {
          await supabase.from("withdraw_requests").update({ telegram_message_id: res.message_id }).eq("id", wd.id);
        }
      }

      return json({ ok: true, requestId: wd.id, status: "pending", newBalance });
    }

    // GET /user-api/transactions?username=... — combined history (deposits + withdrawals)
    if (req.method === "GET" && path === "transactions") {
      const username = url.searchParams.get("username");
      if (!username) return json({ error: "username is required" }, 400);
      const { data: reg, error: regErr } = await supabase
        .from("user_registrations")
        .select("id, username, status, wallet_account_id")
        .eq("username", username)
        .maybeSingle();
      if (regErr) return json({ error: regErr.message }, 500);
      if (!reg) return json({ error: "User not found" }, 404);

      const [depositsRes, withdrawsRes] = await Promise.all([
        supabase.from("deposit_requests")
          .select("id, amount, payment_method, status, screenshot_url, admin_notes, created_at, processed_at")
          .eq("owner_username", username)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase.from("withdraw_requests")
          .select("id, amount, payment_method, account_detail, status, admin_notes, created_at, processed_at")
          .eq("owner_username", username)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      const deposits = (depositsRes.data || []).map((d: Record<string, unknown>) => ({
        id: d.id, type: "deposit" as const, amount: Number(d.amount),
        payment_method: d.payment_method, status: d.status,
        screenshot_url: d.screenshot_url, admin_notes: d.admin_notes,
        created_at: d.created_at, processed_at: d.processed_at,
      }));
      const withdrawals = (withdrawsRes.data || []).map((w: Record<string, unknown>) => ({
        id: w.id, type: "withdraw" as const, amount: Number(w.amount),
        payment_method: w.payment_method, account_detail: w.account_detail,
        status: w.status, admin_notes: w.admin_notes,
        created_at: w.created_at, processed_at: w.processed_at,
      }));

      const all = [...deposits, ...withdrawals].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      return json({ transactions: all });
    }

    // POST /user-api/upload-screenshot — multipart upload via service role
    // Accepts: multipart/form-data with fields "file" (File) and "username" (string)
    // Returns: { ok, url, path }
    if (req.method === "POST" && path === "upload-screenshot") {
      const contentType = req.headers.get("content-type") || "";
      if (!contentType.includes("multipart/form-data")) {
        return json({ error: "Expected multipart/form-data" }, 400);
      }
      const formData = await req.formData();
      const file = formData.get("file");
      const username = String(formData.get("username") || "").trim();
      if (!username) return json({ error: "username is required" }, 400);
      if (!file || !(file instanceof File)) return json({ error: "file is required" }, 400);

      // Validate file type
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(file.type)) {
        return json({ error: "Only JPG, JPEG and PNG formats are allowed" }, 400);
      }

      // Validate file size (500 MB max)
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        return json({ error: "File size exceeds 500 MB limit" }, 400);
      }

      const ext = file.type === "image/png" ? "png" : "jpg";
      const fileName = `${username}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const fileBuf = new Uint8Array(await file.arrayBuffer());

      const { data: upData, error: upErr } = await supabase.storage
        .from("deposit-screenshots")
        .upload(fileName, fileBuf, { contentType: file.type, upsert: false });
      if (upErr) return json({ error: upErr.message }, 500);

      const { data: urlData } = supabase.storage
        .from("deposit-screenshots")
        .getPublicUrl(fileName);
      const publicUrl = urlData?.publicUrl || `${env.SUPABASE_URL}/storage/v1/object/public/deposit-screenshots/${fileName}`;

      return json({ ok: true, url: publicUrl, path: upData?.path || fileName });
    }

    // POST /user-api/upload-screenshot-url — legacy: store the storage path + public URL
    if (req.method === "POST" && path === "upload-screenshot-url") {
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      return json({ ok: true, url: body.url, path: body.path });
    }

    // ---- Helpline ----

    // GET /user-api/helpline?username=...  → messages + admin online status
    if (req.method === "GET" && path === "helpline") {
      const username = url.searchParams.get("username") || "";
      if (!username) return json({ error: "username is required" }, 400);

      const { data: reg, error: regErr } = await supabase
        .from("user_registrations")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (regErr) return json({ error: regErr.message }, 500);
      if (!reg) return json({ error: "User not found" }, 404);

      // Mark admin messages as read when user fetches them
      await supabase.from("helpline_messages")
        .update({ is_read: true })
        .eq("registration_id", reg.id)
        .eq("sender", "admin")
        .eq("is_read", false);

      const { data: messages, error: msgErr } = await supabase
        .from("helpline_messages")
        .select("id, sender, message, is_read, created_at")
        .eq("registration_id", reg.id)
        .order("created_at", { ascending: true })
        .limit(500);
      if (msgErr) return json({ error: msgErr.message }, 500);

      // Admin online status: check admin_last_seen within last 3 minutes
      const { data: seenRow } = await supabase
        .from("app_config").select("value").eq("key", "admin_last_seen").maybeSingle();
      const lastSeen = seenRow?.value || "1970-01-01T00:00:00.000Z";
      const seenMs = new Date(lastSeen).getTime();
      const isOnline = (Date.now() - seenMs) < 3 * 60 * 1000;

      return json({ messages: messages || [], adminOnline: isOnline, adminLastSeen: lastSeen });
    }

    // POST /user-api/helpline  { username, message }
    if (req.method === "POST" && path === "helpline") {
      const body = await req.json().catch(() => null);
      if (!body) return json({ error: "Invalid JSON body" }, 400);
      const username = String(body.username || "").trim();
      const message = String(body.message || "").trim();
      if (!username) return json({ error: "username is required" }, 400);
      if (!message) return json({ error: "message is required" }, 400);

      const { data: reg, error: regErr } = await supabase
        .from("user_registrations")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (regErr) return json({ error: regErr.message }, 500);
      if (!reg) return json({ error: "User not found" }, 404);

      const { data: msg, error: msgErr } = await supabase
        .from("helpline_messages")
        .insert({ registration_id: reg.id, sender: "user", message })
        .select("id, sender, message, is_read, created_at")
        .single();
      if (msgErr) return json({ error: msgErr.message }, 500);
      return json({ ok: true, message: msg });
    }

    // ---- Announcements (public read) ----

    // GET /user-api/announcements  → all active announcements (pinned first)
    if (req.method === "GET" && path === "announcements") {
      const { data, error } = await supabase
        .from("announcements")
        .select("id, title, body, is_pinned, created_at, updated_at")
        .eq("is_active", true)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) return json({ error: error.message }, 500);
      return json({ announcements: data || [], announcement: (data && data[0]) || null });
    }

    // GET /user-api/referral-info?username=...
    if (req.method === "GET" && path === "referral-info") {
      const username = url.searchParams.get("username");
      if (!username) return json({ error: "username is required" }, 400);
      const { data: reg, error: regErr } = await supabase
        .from("user_registrations")
        .select("id, referral_code")
        .eq("username", username)
        .maybeSingle();
      if (regErr) return json({ error: regErr.message }, 500);
      if (!reg) return json({ error: "User not found" }, 404);
      return json({ referralCode: reg.referral_code || null });
    }

    return json({ error: "Not found" }, 404);
  } catch (err) {
    return json({ error: String(err) || "Internal server error" }, 500);
  }
});
