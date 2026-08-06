import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

// ============================================================
// Shared Telegram + Supabase helpers for BetPro Wallet edge fns
// ============================================================

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomToken(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return bytesToBase64Url(arr);
}

export function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function fmtDateTime(d: Date = new Date()): string {
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_ANON_KEY: string;
}

export function getEnv(): Env {
  const url = Deno.env.get("SUPABASE_URL") || Deno.env.get("VITE_SUPABASE_URL");
  const key =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("VITE_SUPABASE_SERVICE_ROLE_KEY");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("VITE_SUPABASE_ANON_KEY");
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return { SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key, SUPABASE_ANON_KEY: anon || "" };
}

export function makeServiceClient() {
  const env = getEnv();
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ---- Telegram config + messaging ----

export async function getTelegramConfig(
  supabase: ReturnType<typeof createClient>
): Promise<{ botToken: string; chatId: string }> {
  const { data } = await supabase
    .from("app_config")
    .select("key, value")
    .in("key", ["telegram_bot_token", "telegram_chat_id"]);
  const map: Record<string, string> = {};
  for (const row of data || []) map[row.key] = row.value || "";
  return { botToken: map.telegram_bot_token || "", chatId: map.telegram_chat_id || "" };
}

export interface InlineButton {
  text: string;
  callback_data: string;
}

export async function sendTelegramMessage(
  botToken: string,
  chatId: string,
  text: string,
  inlineKeyboard?: InlineButton[][]
): Promise<{ message_id?: number; error?: string }> {
  if (!botToken || !chatId) return { error: "Telegram not configured" };
  try {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    };
    if (inlineKeyboard) payload.reply_markup = { inline_keyboard: inlineKeyboard };
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) return { error: data.description || "sendMessage failed" };
    return { message_id: data.result?.message_id };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function editTelegramMessage(
  botToken: string,
  chatId: string,
  messageId: number,
  text: string,
  inlineKeyboard?: InlineButton[][]
): Promise<{ ok: boolean; error?: string }> {
  if (!botToken || !chatId) return { ok: false, error: "not configured" };
  try {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
    };
    if (inlineKeyboard) payload.reply_markup = { inline_keyboard: inlineKeyboard };
    const res = await fetch(`https://api.telegram.org/bot${botToken}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) return { ok: false, error: data.description || "edit failed" };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function answerCallbackQuery(
  botToken: string,
  callbackQueryId: string,
  text: string
): Promise<void> {
  if (!botToken) return;
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    });
  } catch {
    // best-effort
  }
}

// Send a Telegram photo (for deposit screenshots). Falls back to sendMessage if
// the photo send fails (e.g. invalid URL).
export async function sendTelegramPhoto(
  botToken: string,
  chatId: string,
  photoUrl: string,
  caption: string,
  inlineKeyboard?: InlineButton[][]
): Promise<{ message_id?: number; error?: string }> {
  if (!botToken || !chatId) return { error: "Telegram not configured" };
  try {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: "HTML",
    };
    if (inlineKeyboard) payload.reply_markup = { inline_keyboard: inlineKeyboard };
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.ok) {
      // Fallback: send as text message (no photo)
      return await sendTelegramMessage(botToken, chatId, caption, inlineKeyboard);
    }
    return { message_id: data.result?.message_id };
  } catch (err) {
    return await sendTelegramMessage(botToken, chatId, caption, inlineKeyboard);
  }
}

// ---- Admin session validation ----

export async function validateAdmin(
  supabase: ReturnType<typeof createClient>,
  req: Request
): Promise<{ ok: boolean; username?: string }> {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token) return { ok: false };
  const tokenHash = await sha256Hex(token);
  const { data, error } = await supabase
    .from("admin_sessions")
    .select("username, expires_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error || !data) return { ok: false };
  if (new Date(data.expires_at).getTime() < Date.now()) return { ok: false };
  return { ok: true, username: data.username };
}

export function parseError(data: unknown, fallback: string): string {
  if (data && typeof data === "object" && "error" in data) {
    return String((data as { error: unknown }).error || fallback);
  }
  return fallback;
}
