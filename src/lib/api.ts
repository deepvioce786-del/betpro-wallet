import { EDGE_BASE, edgeHeaders, supabase } from './supabase';
import type {
  AdminConfig, AdminDeposit, AdminRegistration, AdminStats, AdminTransaction,
  AdminUser, AdminWithdraw, HistoryItem, PaymentMethods, WalletInfo,
} from './types';

export type { AdminAnnouncement, ReferralEvent };

function parseError(data: unknown, fallback: string): string {
  if (data && typeof data === 'object' && 'error' in data) {
    return String((data as { error: unknown }).error || fallback);
  }
  return fallback;
}

// Password rules:
// - Min 8 characters
// - Must contain at least one alphabet letter (A-Z or a-z)
// - Cannot be all numbers (e.g. 12345678, 987654321, 111111 are not allowed)
// - May also contain numbers and special characters
export function validatePassword(password: string): string | null {
  if (password.length !== 8) return 'Password must be exactly 8 characters long';
  if (!/[a-zA-Z]/.test(password) || !/\d/.test(password)) return 'Password must contain both letters and numbers';
  return null;
}

// ---- Auth / Registration ----

export interface RegisterPayload {
  fullName: string; username: string; password: string; phoneNumber: string; referralCode?: string;
}
export interface RegisterResult {
  ok: boolean; registrationId?: string; expiresAt?: string; createdAt?: string; pendingStartAt?: string; error?: string;
}

export async function registerUser(payload: RegisterPayload): Promise<RegisterResult> {
  try {
    const res = await fetch(`${EDGE_BASE}/user-api/register`, {
      method: 'POST', headers: edgeHeaders(), body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true, registrationId: data.registrationId, expiresAt: data.expiresAt, createdAt: data.createdAt, pendingStartAt: data.pendingStartAt };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function getRegistrationStatus(
  registrationId: string
): Promise<{ status: string; registration?: { status: string; username: string } } | { error: string }> {
  try {
    const res = await fetch(
      `${EDGE_BASE}/user-api/registration-status?registrationId=${encodeURIComponent(registrationId)}`,
      { headers: edgeHeaders() }
    );
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`) };
    return { status: data.registration?.status || 'unknown', registration: data.registration };
  } catch (err) {
    return { error: String(err) };
  }
}

export interface SignInResult {
  ok: boolean;
  session?: { access_token: string; refresh_token: string; expires_at: number };
  user?: { username: string; full_name: string; registrationId?: string };
  error?: string; status?: string;
  pending?: boolean;
}

export async function signInUser(username: string, password: string): Promise<SignInResult> {
  try {
    const res = await fetch(`${EDGE_BASE}/user-api/signin`, {
      method: 'POST', headers: edgeHeaders(), body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`), status: data?.status };
    return { ok: true, session: data.session, user: data.user, pending: data?.status === 'pending' };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function suggestUsernames(baseName: string): Promise<{ ok: boolean; suggestions?: string[]; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/user-api/suggest-usernames`, {
      method: 'POST', headers: edgeHeaders(), body: JSON.stringify({ baseName }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true, suggestions: data.suggestions || [] };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function checkUsernameAvailable(username: string): Promise<{ ok: boolean; available?: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/user-api/check-username`, {
      method: 'POST', headers: edgeHeaders(), body: JSON.stringify({ username }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true, available: data.available };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function checkAndSuggestUsernames(username: string): Promise<{ ok: boolean; available?: boolean; suggestions?: string[]; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/user-api/check-and-suggest`, {
      method: 'POST', headers: edgeHeaders(), body: JSON.stringify({ username }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true, available: data.available, suggestions: data.suggestions || [] };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ---- Wallet ----

export async function getWalletInfo(username: string): Promise<{ info?: WalletInfo; error?: string; status?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/user-api/wallet?username=${encodeURIComponent(username)}`, { headers: edgeHeaders() });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`), status: data?.status };
    return { info: data as WalletInfo };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function getPaymentMethods(): Promise<{ data?: PaymentMethods; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/user-api/payment-methods`, { headers: edgeHeaders() });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`) };
    return { data: data as PaymentMethods };
  } catch (err) {
    return { error: String(err) };
  }
}

// ---- Deposit ----

export interface DepositPayload {
  username: string; amount: number; paymentMethod: string;
  screenshotUrl?: string | null; screenshotPath?: string | null;
}

export async function createDeposit(payload: DepositPayload): Promise<{ ok: boolean; requestId?: string; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/user-api/deposit`, {
      method: 'POST', headers: edgeHeaders(), body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true, requestId: data.requestId };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// Upload screenshot to Supabase Storage via edge function (service role)
export async function uploadScreenshot(
  username: string,
  file: File
): Promise<{ url?: string; path?: string; error?: string }> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('username', username);
    const res = await fetch(`${EDGE_BASE}/user-api/upload-screenshot`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      body: formData,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Upload failed (${res.status})`) };
    return { url: data.url, path: data.path };
  } catch (err) {
    return { error: String(err) };
  }
}

// ---- Withdraw ----

export interface WithdrawPayload {
  username: string; amount: number; paymentMethod: string;
  accountDetail: string; accountHolderName?: string | null;
}

export async function createWithdraw(payload: WithdrawPayload): Promise<{ ok: boolean; requestId?: string; newBalance?: number; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/user-api/withdraw`, {
      method: 'POST', headers: edgeHeaders(), body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true, requestId: data.requestId, newBalance: data.newBalance };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ---- History ----

export async function getTransactions(username: string): Promise<{ transactions?: HistoryItem[]; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/user-api/transactions?username=${encodeURIComponent(username)}`, { headers: edgeHeaders() });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`) };
    return { transactions: data.transactions || [] };
  } catch (err) {
    return { error: String(err) };
  }
}

// ---- Admin API ----

export async function adminLogin(username: string, password: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/login`, {
      method: 'POST', headers: edgeHeaders(), body: JSON.stringify({ username, password }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, 'Invalid credentials') };
    return { ok: true, token: data.token };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminLogout(token: string): Promise<void> {
  try {
    await fetch(`${EDGE_BASE}/admin-api/logout`, { method: 'POST', headers: edgeHeaders({ Authorization: `Bearer ${token}` }) });
  } catch { /* ignore */ }
}

function adminHeaders(token: string): Record<string, string> {
  return edgeHeaders({ Authorization: `Bearer ${token}` });
}

export async function adminGetStats(token: string): Promise<{ stats?: AdminStats; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/stats`, { headers: adminHeaders(token) });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`) };
    return { stats: data.stats };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function adminGetRegistrations(token: string, status?: string): Promise<{ registrations?: AdminRegistration[]; error?: string }> {
  try {
    const u = new URL(`${EDGE_BASE}/admin-api/registrations`);
    if (status) u.searchParams.set('status', status);
    const res = await fetch(u.toString(), { headers: adminHeaders(token) });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`) };
    return { registrations: data.registrations || [] };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function adminApproveRegistration(token: string, registrationId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/approve`, {
      method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ registrationId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminRejectRegistration(token: string, registrationId: string, notes?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/reject`, {
      method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ registrationId, notes }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminGetUsers(token: string, search?: string): Promise<{ users?: AdminUser[]; error?: string }> {
  try {
    const u = new URL(`${EDGE_BASE}/admin-api/users`);
    if (search) u.searchParams.set('search', search);
    const res = await fetch(u.toString(), { headers: adminHeaders(token) });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`) };
    return { users: data.users || [] };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function adminGetDeposits(token: string, status?: string): Promise<{ deposits?: AdminDeposit[]; error?: string }> {
  try {
    const u = new URL(`${EDGE_BASE}/admin-api/deposits`);
    if (status) u.searchParams.set('status', status);
    const res = await fetch(u.toString(), { headers: adminHeaders(token) });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`) };
    return { deposits: data.deposits || [] };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function adminGetWithdrawals(token: string, status?: string): Promise<{ withdrawals?: AdminWithdraw[]; error?: string }> {
  try {
    const u = new URL(`${EDGE_BASE}/admin-api/withdrawals`);
    if (status) u.searchParams.set('status', status);
    const res = await fetch(u.toString(), { headers: adminHeaders(token) });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`) };
    return { withdrawals: data.withdrawals || [] };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function adminApproveDeposit(token: string, id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/deposit-approve`, {
      method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminRejectDeposit(token: string, id: string, notes?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/deposit-reject`, {
      method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ id, notes }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminApproveWithdraw(token: string, id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/withdraw-approve`, {
      method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminRejectWithdraw(token: string, id: string, notes?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/withdraw-reject`, {
      method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ id, notes }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminUpdateUsername(token: string, registrationId: string, newUsername: string): Promise<{ ok: boolean; username?: string; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/update-username`, {
      method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ registrationId, newUsername }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true, username: data.username };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminChangeUserPassword(token: string, registrationId: string, newPassword: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/change-user-password`, {
      method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ registrationId, newPassword }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminSuspendUser(token: string, walletId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/user-suspend`, {
      method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ walletId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminActivateUser(token: string, walletId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/user-activate`, {
      method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ walletId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminAdjustBalance(
  token: string, walletId: string, amount: number, action: 'add' | 'remove', note?: string
): Promise<{ ok: boolean; newBalance?: number; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/adjust-balance`, {
      method: 'POST', headers: adminHeaders(token),
      body: JSON.stringify({ walletId, amount, action, note }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true, newBalance: data.newBalance };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminGetUserTransactions(token: string, walletId: string): Promise<{ transactions?: AdminTransaction[]; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/user-transactions?walletId=${encodeURIComponent(walletId)}`, { headers: adminHeaders(token) });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`) };
    return { transactions: data.transactions || [] };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function adminGetAllTransactions(token: string): Promise<{ transactions?: AdminTransaction[]; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/all-transactions`, { headers: adminHeaders(token) });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`) };
    return { transactions: data.transactions || [] };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function adminGetConfig(token: string): Promise<{ config?: AdminConfig; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/config`, { headers: adminHeaders(token) });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`) };
    return { config: data as AdminConfig };
  } catch (err) {
    return { error: String(err) };
  }
}

export interface AdminConfigUpdate {
  telegramBotToken?: string; telegramChatId?: string; defaultWalletBalance?: string;
  easypaisaName?: string; easypaisaNumber?: string;
  jazzcashName?: string; jazzcashNumber?: string;
  bankName?: string; bankHolder?: string; bankAccount?: string;
  whatsappSupportNumber?: string;
  newAdminUsername?: string; newAdminPassword?: string;
}

export async function adminSaveConfig(token: string, payload: AdminConfigUpdate): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/config`, {
      method: 'POST', headers: adminHeaders(token), body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminTestTelegram(token: string, botToken?: string, chatId?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/test-telegram`, {
      method: 'POST', headers: adminHeaders(token),
      body: JSON.stringify({ botToken, chatId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminSetWebhook(token: string, webhookUrl: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/set-webhook`, {
      method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ webhookUrl }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminGetWebhookInfo(token: string): Promise<{ ok: boolean; info?: unknown; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/webhook-info`, { headers: adminHeaders(token) });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true, info: data.info };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export { supabase };

// ---- Announcements (user) ----

export interface Announcement {
  id: string;
  title: string;
  body: string;
  is_pinned?: boolean;
  created_at: string;
  updated_at: string;
}

export async function getAnnouncements(): Promise<{ announcements?: Announcement[]; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/user-api/announcements`, { headers: edgeHeaders() });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`) };
    return { announcements: data.announcements || [] };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function getLatestAnnouncement(): Promise<{ announcement?: Announcement | null; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/user-api/announcements`, { headers: edgeHeaders() });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`) };
    return { announcement: data.announcement || null };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function getReferralInfo(username: string): Promise<{ referralCode?: string | null; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/user-api/referral-info?username=${encodeURIComponent(username)}`, { headers: edgeHeaders() });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`) };
    return { referralCode: data.referralCode || null };
  } catch (err) {
    return { error: String(err) };
  }
}

// ---- Announcements (admin) ----

export interface AdminAnnouncement {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface ReferralEvent {
  id: string;
  referrer_username: string;
  referred_username: string;
  first_deposit_amount: number | null;
  first_deposit_at: string | null;
  status: 'pending' | 'qualified' | 'bonus_given';
  created_at: string;
  updated_at: string;
}

export async function adminGetReferrals(token: string): Promise<{ referrals?: ReferralEvent[]; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/referrals`, { headers: adminHeaders(token) });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`) };
    return { referrals: data.referrals || [] };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function adminUpdateReferralStatus(token: string, id: string, status: 'pending' | 'qualified' | 'bonus_given'): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/referrals`, {
      method: 'PUT', headers: adminHeaders(token), body: JSON.stringify({ id, status }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminGetAnnouncements(token: string): Promise<{ announcements?: AdminAnnouncement[]; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/announcements`, { headers: adminHeaders(token) });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`) };
    return { announcements: data.announcements || [] };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function adminCreateAnnouncement(token: string, title: string, body: string, isPinned?: boolean): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/announcements`, {
      method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ title, body, isPinned: isPinned || false }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminUpdateAnnouncement(token: string, id: string, payload: { title?: string; body?: string; isActive?: boolean; isPinned?: boolean }): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/announcements`, {
      method: 'PUT', headers: adminHeaders(token), body: JSON.stringify({ id, ...payload }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminDeleteAnnouncement(token: string, id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/announcements`, {
      method: 'DELETE', headers: adminHeaders(token), body: JSON.stringify({ id }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ---- Helpline (user) ----

export async function getHelplineMessages(username: string): Promise<{
  messages?: Array<{ id: string; sender: string; message: string; is_read: boolean; created_at: string }>;
  adminOnline?: boolean; adminLastSeen?: string; error?: string;
}> {
  try {
    const res = await fetch(`${EDGE_BASE}/user-api/helpline?username=${encodeURIComponent(username)}`, { headers: edgeHeaders() });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`) };
    return { messages: data.messages || [], adminOnline: data.adminOnline, adminLastSeen: data.adminLastSeen };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function sendHelplineMessage(username: string, message: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/user-api/helpline`, {
      method: 'POST', headers: edgeHeaders(), body: JSON.stringify({ username, message }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

// ---- Helpline (admin) ----

export interface HelplineConversation {
  registration_id: string;
  username: string;
  full_name: string;
  messages: Array<{ id: string; sender: string; message: string; is_read: boolean; created_at: string }>;
  last_message_at: string;
  unread_count: number;
}

export async function adminGetHelpline(token: string): Promise<{ conversations?: HelplineConversation[]; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/helpline`, { headers: adminHeaders(token) });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { error: parseError(data, `Request failed (${res.status})`) };
    return { conversations: data.conversations || [] };
  } catch (err) {
    return { error: String(err) };
  }
}

export async function adminReplyHelpline(token: string, registrationId: string, message: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/helpline-reply`, {
      method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ registrationId, message }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

export async function adminMarkHelplineRead(token: string, registrationId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${EDGE_BASE}/admin-api/helpline-read`, {
      method: 'POST', headers: adminHeaders(token), body: JSON.stringify({ registrationId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: parseError(data, `Request failed (${res.status})`) };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}


