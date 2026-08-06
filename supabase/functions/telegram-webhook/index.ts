import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import {
  corsHeaders, json, bytesToBase64Url, getEnv, escHtml, fmtDateTime,
  getTelegramConfig, answerCallbackQuery, editTelegramMessage, sendTelegramMessage,
} from "../_shared/telegram.ts";

// Callback data formats:
//   approve:<regId>          — approve user registration
//   reject:<regId>           — reject user registration
//   depapprove:<depId>       — approve deposit request
//   depreject:<depId>        — reject deposit request
//   wdapprove:<wdId>         — approve withdraw request
//   wdreject:<wdId>          — reject withdraw request

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method === "GET") return json({ ok: true, service: "telegram-webhook" });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const env = getEnv();
    const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const update = await req.json().catch(() => null);
    if (!update) return json({ ok: true });

    const cq = update.callback_query;
    if (!cq) return json({ ok: true });

    const data: string = cq.data || "";
    const chatId: string = String(cq.message?.chat?.id || cq.from?.id || "");
    const messageId: number = cq.message?.message_id || 0;
    const callbackQueryId: string = cq.id;

    const [action, entityId] = data.split(":");
    if (!action || !entityId) return json({ ok: true });

    const botToken = (await getTelegramConfig(supabase)).botToken;

    // ---------- USER REGISTRATION ----------
    if (action === "approve" || action === "reject") {
      const { data: reg } = await supabase
        .from("user_registrations")
        .select("id, username, full_name, status, phone_number, telegram_message_id")
        .eq("id", entityId).maybeSingle();
      if (!reg) { await answerCallbackQuery(botToken, callbackQueryId, "Not found"); return json({ ok: true }); }
      if (reg.status !== "pending") { await answerCallbackQuery(botToken, callbackQueryId, `Already ${reg.status}`); return json({ ok: true }); }

      if (action === "approve") {
        const { data: walletId, error } = await supabase.rpc("approve_registration", { p_reg_id: entityId });
        if (error) { await answerCallbackQuery(botToken, callbackQueryId, `Error: ${error.message}`); return json({ ok: true }); }

        // Create auth user
        const authEmail = `${reg.username.toLowerCase()}@betpro-wallet.app`;
        const { data: reg2 } = await supabase.from("user_registrations").select("auth_user_id").eq("id", entityId).maybeSingle();
        if (reg2 && !reg2.auth_user_id) {
          const rp = bytesToBase64Url(crypto.getRandomValues(new Uint8Array(32)));
          const { data: signUp, error: signUpErr } = await supabase.auth.admin.createUser({
            email: authEmail, password: rp, email_confirm: true,
            user_metadata: { username: reg.username, full_name: reg.full_name },
          });
          if (!signUpErr && signUp) {
            await supabase.from("user_registrations").update({ auth_user_id: signUp.user.id }).eq("id", entityId);
          }
        }
        await answerCallbackQuery(botToken, callbackQueryId, "✅ Approved & activated");
        if (messageId) await editTelegramMessage(botToken, chatId, messageId,
          `🆕 <b>New User Registration</b>\n\n👤 <b>Name:</b> ${escHtml(reg.full_name)}\n🔑 <b>Username:</b> ${escHtml(reg.username)}\n📞 <b>Phone:</b> ${escHtml(reg.phone_number)}\n\n✅ <b>APPROVED</b> — account activated\n🕐 ${fmtDateTime()}`);
        return json({ ok: true, walletId });
      } else {
        const { error } = await supabase.rpc("reject_registration", { p_reg_id: entityId, p_notes: "Rejected via Telegram" });
        if (error) { await answerCallbackQuery(botToken, callbackQueryId, `Error: ${error.message}`); return json({ ok: true }); }
        await answerCallbackQuery(botToken, callbackQueryId, "❌ Rejected");
        if (messageId) await editTelegramMessage(botToken, chatId, messageId,
          `🆕 <b>New User Registration</b>\n\n👤 <b>Name:</b> ${escHtml(reg.full_name)}\n🔑 <b>Username:</b> ${escHtml(reg.username)}\n📞 <b>Phone:</b> ${escHtml(reg.phone_number)}\n\n❌ <b>REJECTED</b>\n🕐 ${fmtDateTime()}`);
        return json({ ok: true });
      }
    }

    // ---------- DEPOSIT REQUEST ----------
    if (action === "depapprove" || action === "depreject") {
      const { data: dep } = await supabase
        .from("deposit_requests")
        .select("id, owner_username, amount, status, telegram_message_id, registration_id")
        .eq("id", entityId).maybeSingle();
      if (!dep) { await answerCallbackQuery(botToken, callbackQueryId, "Not found"); return json({ ok: true }); }
      if (dep.status !== "pending") { await answerCallbackQuery(botToken, callbackQueryId, `Already ${dep.status}`); return json({ ok: true }); }

      if (action === "depapprove") {
        const { data: newBal, error } = await supabase.rpc("approve_deposit", { p_id: entityId });
        if (error) { await answerCallbackQuery(botToken, callbackQueryId, `Error: ${error.message}`); return json({ ok: true }); }
        await answerCallbackQuery(botToken, callbackQueryId, "✅ Deposit approved");
        if (messageId) await editTelegramMessage(botToken, chatId, messageId,
          `💰 <b>Deposit Request</b>\n\n👤 <b>Username:</b> ${escHtml(dep.owner_username)}\n💵 <b>Amount:</b> Rs ${Number(dep.amount).toFixed(2)}\n\n✅ <b>DEPOSIT APPROVED</b> — balance credited\n🕐 ${fmtDateTime()}`);
        return json({ ok: true, newBal });
      } else {
        const { error } = await supabase.rpc("reject_deposit", { p_id: entityId, p_notes: "Rejected via Telegram" });
        if (error) { await answerCallbackQuery(botToken, callbackQueryId, `Error: ${error.message}`); return json({ ok: true }); }
        await answerCallbackQuery(botToken, callbackQueryId, "❌ Deposit rejected");
        if (messageId) await editTelegramMessage(botToken, chatId, messageId,
          `💰 <b>Deposit Request</b>\n\n👤 <b>Username:</b> ${escHtml(dep.owner_username)}\n💵 <b>Amount:</b> Rs ${Number(dep.amount).toFixed(2)}\n\n❌ <b>DEPOSIT REJECTED</b>\n🕐 ${fmtDateTime()}`);
        return json({ ok: true });
      }
    }

    // ---------- WITHDRAW REQUEST ----------
    if (action === "wdapprove" || action === "wdreject") {
      const { data: wd } = await supabase
        .from("withdraw_requests")
        .select("id, owner_username, amount, status, telegram_message_id, registration_id")
        .eq("id", entityId).maybeSingle();
      if (!wd) { await answerCallbackQuery(botToken, callbackQueryId, "Not found"); return json({ ok: true }); }
      if (wd.status !== "pending") { await answerCallbackQuery(botToken, callbackQueryId, `Already ${wd.status}`); return json({ ok: true }); }

      if (action === "wdapprove") {
        const { error } = await supabase.rpc("approve_withdraw", { p_id: entityId });
        if (error) { await answerCallbackQuery(botToken, callbackQueryId, `Error: ${error.message}`); return json({ ok: true }); }
        await answerCallbackQuery(botToken, callbackQueryId, "✅ Withdraw approved");
        if (messageId) await editTelegramMessage(botToken, chatId, messageId,
          `💸 <b>Withdrawal Request</b>\n\n👤 <b>Username:</b> ${escHtml(wd.owner_username)}\n💵 <b>Amount:</b> Rs ${Number(wd.amount).toFixed(2)}\n\n✅ <b>WITHDRAW APPROVED</b>\n🕐 ${fmtDateTime()}`);
        return json({ ok: true });
      } else {
        const { data: newBal, error } = await supabase.rpc("reject_withdraw", { p_id: entityId, p_notes: "Rejected via Telegram" });
        if (error) { await answerCallbackQuery(botToken, callbackQueryId, `Error: ${error.message}`); return json({ ok: true }); }
        await answerCallbackQuery(botToken, callbackQueryId, "❌ Withdraw rejected — refunded");
        if (messageId) await editTelegramMessage(botToken, chatId, messageId,
          `💸 <b>Withdrawal Request</b>\n\n👤 <b>Username:</b> ${escHtml(wd.owner_username)}\n💵 <b>Amount:</b> Rs ${Number(wd.amount).toFixed(2)}\n\n❌ <b>WITHDRAW REJECTED</b> — amount refunded\n🕐 ${fmtDateTime()}`);
        return json({ ok: true, newBal });
      }
    }

    await answerCallbackQuery(botToken, callbackQueryId, "Unknown action");
    return json({ ok: true });
  } catch (err) {
    return json({ error: String(err) || "Internal server error" }, 500);
  }
});
